"""Workflow 接口 - 评论分析与文档处理"""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import settings
from dify_client import DifyClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/workflow", tags=["Workflow"])


class ReviewAnalysisRequest(BaseModel):
    reviews: list[dict] = Field(..., description="待分析的评论列表")
    product_id: str = Field("", description="商品ID（可选）")


class WorkflowResponse(BaseModel):
    workflow_id: str
    status: str
    result: dict = {}


@router.post("/analyze-reviews", response_model=WorkflowResponse)
async def analyze_reviews(req: ReviewAnalysisRequest):
    """触发评论分析 Workflow"""
    client = DifyClient(api_key=settings.DIFY_WORKFLOW_API_KEY or settings.DIFY_API_KEY)
    try:
        # Dify Workflow 的 array 类型输入需要包装在 dict 中
        result = await client.run_workflow(
            inputs={"reviews": {"data": req.reviews}},
            user="shopmind-workflow",
        )
        # Dify 返回格式：data.outputs 包含 Workflow 输出
        data = result.get("data", {})
        outputs = data.get("outputs", {}) if isinstance(data, dict) else {}
        return WorkflowResponse(
            workflow_id=result.get("workflow_run_id", data.get("id", "")),
            status=data.get("status", "completed"),
            result=outputs,
        )
    except Exception as e:
        logger.exception("Workflow execution failed")
        raise HTTPException(status_code=500, detail=str(e))
