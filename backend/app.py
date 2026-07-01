"""ShopMind AI 后端主入口"""

import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings
from routers import agent, workflow, analytics

# ── 日志 ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── 生命周期 ──────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 ShopMind AI 服务启动")
    logger.info(f"   Dify Base URL: {settings.DIFY_BASE_URL}")
    logger.info(f"   Agent API Key configured: {bool(settings.DIFY_AGENT_API_KEY)}")
    logger.info(f"   Workflow API Key configured: {bool(settings.DIFY_WORKFLOW_API_KEY)}")
    yield
    logger.info("👋 ShopMind AI 服务关闭")


# ── 应用 ──────────────────────────────────────────────────────

app = FastAPI(
    title="ShopMind AI API",
    description="电商智能助手后端服务",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - 允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 静态文件中间件 ────────────────────────────────────────────
frontend_dir = Path(__file__).resolve().parent.parent / "frontend"

MEDIA_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}

@app.middleware("http")
async def serve_static_files(request, call_next):
    """对非 /api 路径的 GET 请求，尝试返回前端静态文件"""
    path = request.url.path

    # API 请求正常处理
    if path.startswith("/api/") or path.startswith("/health"):
        return await call_next(request)

    # 只处理 GET 请求
    if request.method != "GET":
        return await call_next(request)

    # 尝试找文件
    filename = path.lstrip("/") or "index.html"
    file_path = frontend_dir / filename
    if file_path.is_file():
        content = file_path.read_bytes()
        return HTMLResponse(content, media_type=MEDIA_TYPES.get(file_path.suffix, "text/plain"))

    # 如果文件不存在，返回 index.html（支持 SPA）
    index_file = frontend_dir / "index.html"
    if index_file.exists():
        return HTMLResponse(index_file.read_text(encoding="utf-8"))

    return await call_next(request)


# 注册 API 路由
app.include_router(agent.router)
app.include_router(workflow.router)
app.include_router(analytics.router)


# ── 健康检查 ──────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "shopmind-ai"}


# ── 入口 ──────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
