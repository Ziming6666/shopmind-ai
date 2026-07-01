"""Agent 交互接口 - 智能导购与客服"""

import json
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import settings
from dify_client import DifyClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agent", tags=["Agent"])


# ── 请求/响应模型 ──────────────────────────────────────────────

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, description="用户输入")
    user: str = Field("shopmind-user", description="用户标识")
    conversation_id: str = Field("", description="会话ID，新会话传空字符串")
    stream: bool = Field(False, description="是否流式响应")


class ChatResponse(BaseModel):
    answer: str
    conversation_id: str
    metadata: dict = {}


# ── 接口 ──────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(req: ChatRequest):
    """与 AI 导购/客服对话（非流式）"""
    client = DifyClient(api_key=settings.DIFY_AGENT_API_KEY or settings.DIFY_API_KEY)
    try:
        result = await client.send_message(
            query=req.query,
            user=req.user,
            conversation_id=req.conversation_id,
        )
        return ChatResponse(
            answer=result.get("answer", ""),
            conversation_id=result.get("conversation_id", ""),
            metadata={
                "created_at": result.get("created_at", 0),
            },
        )
    except Exception as e:
        logger.exception("Agent chat failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def chat_with_agent_stream(req: ChatRequest):
    """与 AI 导购/客服对话（流式，返回 SSE）"""
    from fastapi.responses import StreamingResponse
    import httpx

    api_key = settings.DIFY_AGENT_API_KEY or settings.DIFY_API_KEY
    url = f"{settings.DIFY_BASE_URL}/chat-messages"

    async def event_stream():
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "inputs": {},
            "query": req.query,
            "user": req.user,
            "response_mode": "streaming",
            "conversation_id": req.conversation_id,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                resp.raise_for_status()
                buffer = ""
                async for chunk in resp.aiter_bytes():
                    buffer += chunk.decode("utf-8", errors="replace")
                    while "\n" in buffer:
                        line, buffer = buffer.split("\n", 1)
                        line = line.strip()
                        if line.startswith("data: "):
                            data = line[6:]
                            if data.strip() == "[DONE]":
                                return
                            try:
                                event_data = json.loads(data)
                                event = event_data.get("event", "")
                                if event == "agent_message":
                                    answer = event_data.get("answer", "")
                                    if answer:
                                        yield f"data: {json.dumps({'type': 'answer', 'content': answer})}\n\n"
                                elif event == "message_end":
                                    conv_id = event_data.get("conversation_id", "")
                                    yield f"data: {json.dumps({'type': 'end', 'conversation_id': conv_id})}\n\n"
                            except json.JSONDecodeError:
                                continue

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.get("/conversations")
async def list_conversations(user: str = "shopmind-user"):
    """获取用户的历史会话"""
    client = DifyClient(api_key=settings.DIFY_AGENT_API_KEY or settings.DIFY_API_KEY)
    try:
        convs = await client.get_conversations(user=user)
        return {"data": convs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, user: str = "shopmind-user"):
    """获取某个会话的消息历史"""
    client = DifyClient(api_key=settings.DIFY_AGENT_API_KEY or settings.DIFY_API_KEY)
    try:
        msgs = await client.get_conversation_messages(conversation_id, user=user)
        return {"data": msgs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
