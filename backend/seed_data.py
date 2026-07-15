"""
演示数据种子脚本（本地手动运行用）。
用法：在 backend 目录下运行 `python seed_data.py`
会创建管理员账号 admin/admin123、演示账号 demo/demo123，以及一批示例店铺（以上海为中心）。

云端部署时如果不方便手动运行这个脚本（例如 Render 免费版没有 Shell），
可以改为设置环境变量 AUTO_SEED_DEMO_DATA=true，让应用启动时自动执行同样的逻辑。
"""
from app.database import Base, engine
from app.seed import run

Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    run()
