from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # 方式一：分别配置各字段（本地开发常用）
    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = ""
    db_name: str = "footprint_map"

    # 方式二：直接提供完整连接串（云数据库常用，优先级更高）
    # 对应环境变量名 DATABASE_URL，例如 Railway/Aiven/PlanetScale 等
    # 云 MySQL 控制台给出的连接串，格式：mysql://user:password@host:port/dbname
    database_url_override: Optional[str] = Field(default=None, alias="DATABASE_URL")

    # 部分云 MySQL（如 Aiven）强制要求 TLS 连接，需要提供 CA 证书文件路径。
    # 在 Render 上可以用 "Secret Files" 功能上传 ca.pem，然后把这里填成它的绝对路径，
    # 例如 /etc/secrets/ca.pem。不需要 TLS 的数据库（如本地 MySQL）留空即可。
    db_ssl_ca: Optional[str] = None

    secret_key: str = "dev-secret-key"
    access_token_expire_minutes: int = 10080

    checkin_max_distance_meters: float = 50.0

    upload_dir: str = "uploads"

    # 设为 true 时，应用启动会自动写入管理员/演示账号和示例店铺数据（仅在表为空时执行一次）。
    # 主要用于 Render 免费版没有方便的 Shell 入口时，代替手动运行 seed_data.py。
    auto_seed_demo_data: bool = False

    # 允许跨域访问后端的前端地址，多个用英文逗号分隔；默认 * 方便本地/演示阶段直接用
    # 部署到生产环境后建议设置为 Vercel 分配的域名，例如：
    # https://your-app.vercel.app
    allowed_origins: str = "*"

    model_config = SettingsConfigDict(env_file=".env", populate_by_name=True, extra="ignore")

    @property
    def database_url(self) -> str:
        if self.database_url_override:
            url = self.database_url_override
            # 统一使用 pymysql 驱动
            if url.startswith("mysql://"):
                url = url.replace("mysql://", "mysql+pymysql://", 1)
            if "charset=" not in url:
                sep = "&" if "?" in url else "?"
                url = f"{url}{sep}charset=utf8mb4"
            return url
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        )

    @property
    def cors_origins(self) -> List[str]:
        if self.allowed_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
