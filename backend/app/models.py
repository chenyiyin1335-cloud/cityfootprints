from sqlalchemy import (
    Column, Integer, String, DECIMAL, DateTime, ForeignKey,
    UniqueConstraint, Text, SmallInteger, Boolean, func
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(50))
    avatar_url = Column(String(255))
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    check_ins = relationship("CheckIn", back_populates="user", cascade="all, delete-orphan")


class Shop(Base):
    __tablename__ = "shops"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)
    latitude = Column(DECIMAL(10, 7), nullable=False)
    longitude = Column(DECIMAL(10, 7), nullable=False)
    address = Column(String(255))
    city_code = Column(String(20), index=True)
    check_in_count = Column(Integer, default=0, nullable=False)
    cover_image = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

    check_ins = relationship("CheckIn", back_populates="shop", cascade="all, delete-orphan")


class CheckIn(Base):
    __tablename__ = "check_ins"
    __table_args__ = (UniqueConstraint("user_id", "shop_id", name="uk_user_shop"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    images = Column(Text)  # JSON-encoded list of image URLs
    rating = Column(SmallInteger)
    comment = Column(String(500))
    snapshot_lat = Column(DECIMAL(10, 7))
    snapshot_lng = Column(DECIMAL(10, 7))
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="check_ins")
    shop = relationship("Shop", back_populates="check_ins")
