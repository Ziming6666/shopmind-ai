"""应用配置管理"""

import os
from pathlib import Path

from dotenv import load_dotenv

# 加载 .env 文件（如果存在）
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(env_path)


class Settings:
    # Dify 配置
    DIFY_API_KEY: str = os.getenv("DIFY_API_KEY", "")
    DIFY_AGENT_API_KEY: str = os.getenv("DIFY_AGENT_API_KEY", "")
    DIFY_WORKFLOW_API_KEY: str = os.getenv("DIFY_WORKFLOW_API_KEY", "")
    DIFY_BASE_URL: str = os.getenv("DIFY_BASE_URL", "http://localhost/v1")

    # Dify 应用 ID（在 Dify 平台创建后获取）
    DIFY_AGENT_APP_ID: str = os.getenv("DIFY_AGENT_APP_ID", "")
    DIFY_WORKFLOW_APP_ID: str = os.getenv("DIFY_WORKFLOW_APP_ID", "")

    # 服务配置
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

    # 数据路径
    DATA_DIR: Path = Path(__file__).parent.parent / "data"


settings = Settings()
