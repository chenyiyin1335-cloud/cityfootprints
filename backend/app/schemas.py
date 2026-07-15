from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict


# ---------- User / Auth ----------

class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)
    nickname: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    is_admin: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Shop ----------

class ShopBase(BaseModel):
    name: str
    category: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    city_code: Optional[str] = None
    cover_image: Optional[str] = None


class ShopCreate(ShopBase):
    pass


class ShopOut(ShopBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    check_in_count: int
    created_at: datetime
    is_checked_in: bool = False  # 相对当前请求用户而言，由业务逻辑填充


class ShopDetail(ShopOut):
    recent_check_ins: List["CheckInOut"] = []


# ---------- Check-in ----------

class CheckInCreate(BaseModel):
    shop_id: int
    lat: float
    lng: float
    images: Optional[List[str]] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=500)


class CheckInOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    shop_id: int
    images: Optional[List[str]] = None
    rating: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime
    shop_name: Optional[str] = None
    username: Optional[str] = None


class UserStats(BaseModel):
    total_check_ins: int
    city_count: int
    favorite_category: Optional[str] = None
    category_breakdown: dict


ShopDetail.model_rebuild()
