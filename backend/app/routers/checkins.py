import json
import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..config import settings
from ..database import get_db
from ..utils.distance import haversine_distance_meters

router = APIRouter(prefix="/api/check-ins", tags=["check-ins"])


@router.post("", response_model=schemas.CheckInOut)
def create_check_in(
    payload: schemas.CheckInCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    shop = db.query(models.Shop).filter(models.Shop.id == payload.shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="店铺不存在")

    existing = (
        db.query(models.CheckIn)
        .filter(
            models.CheckIn.user_id == current_user.id,
            models.CheckIn.shop_id == shop.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="您已经打卡过这家店铺")

    # 核心校验：LBS 距离限制（需求文档 4.3.A）
    distance = haversine_distance_meters(
        payload.lat, payload.lng, float(shop.latitude), float(shop.longitude)
    )
    if distance > settings.checkin_max_distance_meters:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "ERROR_DISTANCE_TOO_FAR",
                "message": f"距离店铺 {distance:.0f} 米，超出可打卡范围（{settings.checkin_max_distance_meters:.0f} 米）",
            },
        )

    if payload.rating is not None and not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="评分需在 1-5 之间")

    check_in = models.CheckIn(
        user_id=current_user.id,
        shop_id=shop.id,
        images=json.dumps(payload.images or [], ensure_ascii=False),
        rating=payload.rating,
        comment=payload.comment,
        snapshot_lat=payload.lat,
        snapshot_lng=payload.lng,
    )
    db.add(check_in)
    shop.check_in_count = (shop.check_in_count or 0) + 1
    db.commit()
    db.refresh(check_in)

    return schemas.CheckInOut(
        id=check_in.id,
        user_id=check_in.user_id,
        shop_id=check_in.shop_id,
        images=payload.images or [],
        rating=check_in.rating,
        comment=check_in.comment,
        created_at=check_in.created_at,
        shop_name=shop.name,
        username=current_user.nickname or current_user.username,
    )


@router.get("/mine", response_model=List[schemas.CheckInOut])
def my_check_ins(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    rows = (
        db.query(models.CheckIn)
        .filter(models.CheckIn.user_id == current_user.id)
        .order_by(models.CheckIn.created_at.desc())
        .all()
    )
    return [
        schemas.CheckInOut(
            id=c.id,
            user_id=c.user_id,
            shop_id=c.shop_id,
            images=json.loads(c.images) if c.images else [],
            rating=c.rating,
            comment=c.comment,
            created_at=c.created_at,
            shop_name=c.shop.name,
            username=current_user.nickname or current_user.username,
        )
        for c in rows
    ]


@router.delete("/{check_in_id}")
def delete_check_in(
    check_in_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    c = db.query(models.CheckIn).filter(models.CheckIn.id == check_in_id).first()
    if not c or c.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="打卡记录不存在")
    shop = db.query(models.Shop).filter(models.Shop.id == c.shop_id).first()
    if shop and shop.check_in_count > 0:
        shop.check_in_count -= 1
    db.delete(c)
    db.commit()
    return {"success": True}


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    本地演示用的图片上传接口：直接保存到本地磁盘并返回可访问 URL。
    生产环境可按需求文档替换为对象存储的预签名 URL 直传方案（OSS/S3）。
    """
    allowed_ext = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail="仅支持 jpg/png/gif/webp 图片")

    os.makedirs(settings.upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(settings.upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(await file.read())

    return {"url": f"/uploads/{filename}"}
