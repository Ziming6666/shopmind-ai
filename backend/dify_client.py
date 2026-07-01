"""Dify API 客户端封装

支持 Dify Chatbot Agent API 和 Workflow API 的调用。
官方文档: https://docs.dify.ai/api-reference
"""

import json
import logging
from typing import Any, AsyncGenerator, Optional

import httpx

from config import settings

logger = logging.getLogger(__name__)


class DifyClient:
    """Dify API 客户端"""

    def __init__(self, api_key: str = "", base_url: str = ""):
        self.api_key = api_key or settings.DIFY_API_KEY
        self.base_url = base_url or settings.DIFY_BASE_URL
        self._headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Chatbot Agent API（流式 + 非流式）
    # ------------------------------------------------------------------

    async def send_message(
        self,
        query: str,
        user: str = "shopmind-user",
        conversation_id: str = "",
        inputs: Optional[dict] = None,
        files: Optional[list] = None,
        stream: bool = False,
    ) -> dict:
        """发送消息到 Dify Chatbot Agent"""
        url = f"{self.base_url}/chat-messages"
        payload = {
            "inputs": inputs or {},
            "query": query,
            "user": user,
            "response_mode": "streaming",  # Agent Chat App 只支持流式
            "conversation_id": conversation_id,
        }
        if files:
            payload["files"] = files

        # Agent Chat App 只支持 streaming 模式，即使是非流式请求也需要内部处理
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST", url, headers=self._headers, json=payload
            ) as resp:
                resp.raise_for_status()
                answer_parts = []
                final_conversation_id = ""
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            event = chunk.get("event", "")
                            if event == "message":
                                answer_parts.append(chunk.get("answer", ""))
                            elif event == "agent_message":
                                answer_parts.append(chunk.get("answer", ""))
                            elif event == "message_end":
                                final_conversation_id = chunk.get("conversation_id", "")
                                metadata = chunk.get("metadata", {})
                        except json.JSONDecodeError:
                            continue

                return {
                    "answer": "".join(answer_parts),
                    "conversation_id": final_conversation_id,
                }

    async def send_message_stream(
        self,
        query: str,
        user: str = "shopmind-user",
        conversation_id: str = "",
        inputs: Optional[dict] = None,
    ) -> AsyncGenerator[dict, None]:
        """流式发送消息，逐 chunk 产出"""
        url = f"{self.base_url}/chat-messages"
        payload = {
            "inputs": inputs or {},
            "query": query,
            "user": user,
            "response_mode": "streaming",
            "conversation_id": conversation_id,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST", url, headers=self._headers, json=payload
            ) as resp:
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
                                break
                            try:
                                yield json.loads(data)
                            except json.JSONDecodeError:
                                continue

    # ------------------------------------------------------------------
    # Workflow API
    # ------------------------------------------------------------------

    async def run_workflow(
        self,
        inputs: dict,
        user: str = "shopmind-workflow",
        stream: bool = False,
    ) -> dict:
        """触发 Dify Workflow"""
        url = f"{self.base_url}/workflows/run"
        payload = {
            "inputs": inputs,
            "user": user,
            "response_mode": "streaming" if stream else "blocking",
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(url, headers=self._headers, json=payload)
            resp.raise_for_status()
            return resp.json()

    # ------------------------------------------------------------------
    # 会话管理
    # ------------------------------------------------------------------

    async def get_conversations(self, user: str = "shopmind-user") -> list:
        """获取用户的历史会话列表"""
        url = f"{self.base_url}/conversations"
        params = {"user": user}

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url, headers=self._headers, params=params
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", [])

    async def get_conversation_messages(
        self, conversation_id: str, user: str = "shopmind-user"
    ) -> list:
        """获取指定会话的消息历史"""
        url = f"{self.base_url}/messages"
        params = {"conversation_id": conversation_id, "user": user}

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url, headers=self._headers, params=params
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", [])

    # ------------------------------------------------------------------
    # 文档上传（知识库）
    # ------------------------------------------------------------------

    async def upload_document(
        self, file_path: str, knowledge_base_id: str
    ) -> dict:
        """上传文档到指定知识库"""
        url = f"{self.base_url}/datasets/{knowledge_base_id}/document/create-by-file"
        files = {"file": open(file_path, "rb")}
        data = {"indexing_technique": "high_quality", "process_rule": '{"mode":"automatic"}'}

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url, headers={"Authorization": self._headers["Authorization"]},
                files=files, data=data,
            )
            resp.raise_for_status()
            return resp.json()
