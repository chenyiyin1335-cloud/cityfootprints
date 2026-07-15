import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from .routers import auth, shops, checkins, users

# 启动时自动建表（本地开发方便；生产环境建议使用 Alembic 迁移）
Base.metadata.create_all(bind=engine)
os.makedirs(settings.upload_dir, exist_ok=True)

if settings.auto_seed_demo_data:
    # 用于 Render 免费版等没有方便 Shell 入口的平台，代替手动运行 seed_data.py
    from .seed import run as run_seed
    run_seed()

app = FastAPI(title="店铺打卡足迹地图 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(auth.router)
app.include_router(shops.router)
app.include_router(checkins.router)
app.include_router(users.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
