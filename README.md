# ShopMind AI — 电商智能助手平台

> 基于 Dify 平台构建的电商 AI 助手，覆盖智能客服、商品推荐、评论分析三大核心场景，帮助企业降本增效。

## 在线体验

[https://shopmind-ai-production.up.railway.app](https://shopmind-ai-production.up.railway.app)

## 项目背景

电商行业面临三大痛点：

| 痛点 | 传统方案 | AI 方案 |
|------|---------|---------|
| **客服成本高** | 人工客服应对海量咨询，夜班难覆盖 | AI 客服 7×24 小时在线，准确回答商品咨询、订单查询 |
| **转化率瓶颈** | 统一推荐缺乏个性化，用户流失率高 | 基于用户行为 + 知识库的智能商品推荐 |
| **评论管理低效** | 人工阅读海量评论，难以提炼洞察 | NLP 情感分析 + 关键词提取，自动生成报告 |

**ShopMind AI** 基于 Dify 平台的 Agent、Workflow、RAG 能力，构建开箱即用的电商 AI 解决方案。

## 技术栈

| 层级 | 技术 |
|------|------|
| AI 引擎 | Dify（Agent / Workflow / Knowledge Base） |
| LLM | DeepSeek-V4 |
| 后端 | Python FastAPI |
| 前端 | HTML5 + CSS3 + JavaScript（响应式） |
| 向量库 | Dify 内置（Weaviate / Qdrant） |
| 部署 | Railway + ngrok（本地 Dify 隧道） |

## 核心功能

### 1. 🛒 智能商品导购

用户输入需求 → AI 理解意图 → 检索商品知识库 → 个性化推荐

```
💬 "帮我推荐一款适合学生用的轻薄笔记本，预算5000左右"
🤖 "为您推荐：联想小新Pro 14（¥4999），重量1.3kg，续航12小时，
    学生认证还可享受教育优惠。点击查看详情 →"
```

### 2. 💬 智能客服

- 商品咨询（规格、库存、价格）
- 订单查询（物流、状态）
- 售后服务（退换货政策、退款进度）
- 多轮对话，上下文理解

### 3. 📊 评论分析（运营工具）

- 情感分析（正面/负面/中性）
- 关键词提取（用户关注点）
- 自动生成分析报告
- 竞品评论对比

### 4. 📈 运营看板

- 商品销量统计
- 热门商品排行
- 品牌/分类分布可视化
- 实时数据概览

## 架构

```
用户 → 浏览器 → Railway (FastAPI 云端)
                   ↓ POST /api/agent/chat (SSE 流式)
               FastAPI Backend (代理转发)
                   ↓ POST /v1/chat-messages (streaming)
               ngrok 隧道 → 本地 Dify Docker
                   ↓ 检索知识库 → LLM 生成回答
                   ↓ SSE 流式返回
               浏览器实时渲染
```

## 配置 Dify

在 Dify 平台中需要创建以下三个模块：

| 模块 | 类型 | 用途 |
|------|------|------|
| 商品知识库 | Knowledge Base | 16款商品信息（笔记本/手机/耳机/平板/手表） |
| 客服 FAQ | Knowledge Base | 15条常见问题与标准话术 |
| 售后政策 | Knowledge Base | 退换货规则、保修条款 |
| 智能助手 | Agent Chatbot | 智能导购与客服对话引擎 |
| 评论分析 | Workflow | 数据清洗 → 情感分析 → 关键词提取 → 报告生成 |

详细配置指南请参考 [dify-config](./dify-config/) 目录。

## 本地开发

```bash
# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 填写 Dify API Key

# 启动后端（自动挂载前端页面）
cd backend && python app.py
# 访问 http://localhost:8000
```

## 部署

### Railway + ngrok（推荐）

本项目后端部署在 Railway，通过 ngrok 隧道连接本地 Dify：

```bash
# 本地启动 ngrok，暴露 Dify API
.\ngrok.exe http 80
# 复制生成的 https://xxx.ngrok-free.dev 地址

# Railway 设置环境变量
DIFY_BASE_URL = https://你的ngrok地址.ngrok-free.dev
DIFY_AGENT_API_KEY = app-xxxxx
DIFY_WORKFLOW_API_KEY = app-xxxxx
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DIFY_BASE_URL` | `http://localhost/v1` | Dify API 地址 |
| `DIFY_AGENT_API_KEY` | - | Agent 应用 API 密钥 |
| `DIFY_WORKFLOW_API_KEY` | - | Workflow 应用 API 密钥 |
| `PORT` | 8000 | 服务端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `DEBUG` | `False` | 调试模式 |

## 项目结构

```
shopmind-ai/
├── backend/                    # FastAPI 后端
│   ├── app.py                 # 主入口（含静态文件挂载）
│   ├── config.py              # 配置管理
│   ├── dify_client.py         # Dify API 客户端
│   ├── routers/
│   │   ├── agent.py           # Agent 交互接口
│   │   ├── workflow.py        # Workflow 触发接口
│   │   └── analytics.py       # 数据统计接口
│   ├── .env.example
│   └── requirements.txt
├── frontend/                   # 前端界面
│   ├── index.html             # 主页面
│   ├── css/style.css
│   └── js/app.js
├── dify-config/                # Dify 配置指南
├── data/                       # 示例数据
├── Procfile                    # Railway 部署配置
├── runtime.txt                 # Python 版本
└── requirements.txt            # 根依赖
```

## License

MIT
