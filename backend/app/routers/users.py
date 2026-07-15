from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me/stats", response_model=schemas.UserStats)
def my_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    rows = (
        db.query(models.Shop.city_code, models.Shop.category)
        .join(models.CheckIn, models.CheckIn.shop_id == models.Shop.id)
        .filter(models.CheckIn.user_id == current_user.id)
        .all()
    )

    total = len(rows)
    cities = {r[0] for r in rows if r[0]}
    category_counter = Counter(r[1] for r in rows if r[1])
    favorite = category_counter.most_common(1)[0][0] if category_counter else None

    return schemas.UserStats(
        total_check_ins=total,
        city_count=len(cities),
        favorite_category=favorite,
        category_breakdown=dict(category_counter),
    )
