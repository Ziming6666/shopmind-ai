"""数据统计与运营看板接口"""

import json
import logging
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


def _load_products() -> list[dict]:
    """加载示例商品数据"""
    filepath = DATA_DIR / "sample_products.json"
    if filepath.exists():
        with open(filepath, encoding="utf-8") as f:
            return json.load(f)
    return []


@router.get("/products")
async def get_products():
    """获取全部商品列表"""
    return {"data": _load_products()}


@router.get("/products/{product_id}")
async def get_product(product_id: str):
    """获取单个商品详情"""
    for p in _load_products():
        if p["id"] == product_id:
            return {"data": p}
    return JSONResponse(status_code=404, content={"error": "商品不存在"})


@router.get("/stats")
async def get_stats():
    """运营看板统计数据"""
    products = _load_products()
    total_sales = sum(p.get("sales", 0) for p in products)
    avg_rating = round(sum(p.get("rating", 0) for p in products) / len(products), 1) if products else 0

    # 按品牌聚合
    brand_stats = {}
    for p in products:
        brand = p.get("brand", "其他")
        if brand not in brand_stats:
            brand_stats[brand] = {"count": 0, "total_sales": 0}
        brand_stats[brand]["count"] += 1
        brand_stats[brand]["total_sales"] += p.get("sales", 0)

    # 按分类聚合
    cat_stats = {}
    for p in products:
        cat = p.get("category", "其他")
        cat_stats[cat] = cat_stats.get(cat, 0) + 1

    return {
        "data": {
            "total_products": len(products),
            "total_sales": total_sales,
            "avg_rating": avg_rating,
            "brand_distribution": brand_stats,
            "category_distribution": cat_stats,
            "top_sellers": sorted(products, key=lambda x: x.get("sales", 0), reverse=True)[:5],
        }
    }


@router.get("/faq")
async def get_faq():
    """常见问题列表"""
    return {
        "data": [
            {"q": "如何退货？", "category": "售后"},
            {"q": "发货时间是多久？", "category": "物流"},
            {"q": "支持哪些付款方式？", "category": "支付"},
            {"q": "如何开具发票？", "category": "售后"},
            {"q": "商品保真吗？", "category": "商品"},
        ]
    }
