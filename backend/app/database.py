from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

_connect_args = {"connect_timeout": 10}
if settings.db_ssl_ca:
    # 云 MySQL（如 Aiven）要求 TLS，附带 CA 证书路径
    _connect_args["ssl"] = {"ca": settings.db_ssl_ca}

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,   # 每次取连接前先探活，避免云数据库空闲断连导致报错
    pool_recycle=280,     # 多数云 MySQL 免费实例会在 5 分钟左右回收空闲连接
    connect_args=_connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
