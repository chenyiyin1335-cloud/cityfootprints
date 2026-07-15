import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db

router = APIRouter(prefix="/api/shops", tags=["shops"])


def _checked_in_shop_ids(db: Session, user: Optional[models.User]) -> set:
    if not user:
        return set()
    rows = (
        db.query(models.CheckIn.shop_id)
        .filter(models.CheckIn.user_id == user.id)
        .all()
    )
    return {r[0] for r in rows}


@router.get("", response_model=List[schemas.ShopOut])
def list_shops(
    category: Optional[str] = Query(default=None, description="按分类筛选，例如 restaurant/bookstore/leisure"),
    city_code: Optional[str] = Query(default=None),
    keyword: Optional[str] = Query(default=None, description="按店铺名称模糊搜索"),
    # 地图视野边界（可选），用于只加载当前视口内的店铺
    min_lat: Optional[float] = None,
    max_lat: Optional[float] = None,
    min_lng: Optional[float] = None,
    max_lng: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(security.get_current_user_optional),
):
    q = db.query(models.Shop)
    if category and category != "all":
        q = q.filter(models.Shop.category == category)
    if city_code:
        q = q.filter(models.Shop.city_code == city_code)
    if keyword:
        q = q.filter(models.Shop.name.like(f"%{keyword}%"))
    if None not in (min_lat, max_lat, min_lng, max_lng):
        q = q.filter(
            models.Shop.latitude.between(min_lat, max_lat),
            models.Shop.longitude.between(min_lng, max_lng),
        )

    shops = q.order_by(models.Shop.id.asc()).limit(2000).all()
    checked_in = _checked_in_shop_ids(db, current_user)

    result = []
    for s in shops:
        out = schemas.ShopOut.model_validate(s)
        out.is_checked_in = s.id in checked_in
        result.append(out)
    return result


@router.get("/{shop_id}", response_model=schemas.ShopDetail)
def get_shop_detail(
    shop_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(security.get_current_user_optional),
):
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="店铺不存在")

    recent = (
        db.query(models.CheckIn)
        .filter(models.CheckIn.shop_id == shop_id)
        .order_by(models.CheckIn.created_at.desc())
        .limit(20)
        .all()
    )
    recent_out = []
    for c in recent:
        recent_out.append(
            schemas.CheckInOut(
                id=c.id,
                user_id=c.user_id,
                shop_id=c.shop_id,
                images=json.loads(c.images) if c.images else [],
                rating=c.rating,
                comment=c.comment,
                created_at=c.created_at,
                shop_name=shop.name,
                username=c.user.nickname or c.user.username,
            )
        )

    checked_in = _checked_in_shop_ids(db, current_user)
    detail = schemas.ShopDetail.model_validate(shop)
    detail.is_checked_in = shop.id in checked_in
    detail.recent_check_ins = recent_out
    return detail


@router.post("", response_model=schemas.ShopOut)
def create_shop(
    payload: schemas.ShopCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="仅管理员可添加店铺")

    shop = models.Shop(**payload.model_dump())
    db.add(shop)
    db.commit()
    db.refresh(shop)
    return schemas.ShopOut.model_validate(shop)
