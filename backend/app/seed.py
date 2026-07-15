"""
演示数据写入逻辑（可复用）：
- 本地开发：通过根目录的 seed_data.py 手动运行一次
- 云端部署：也可以设置环境变量 AUTO_SEED_DEMO_DATA=true，让应用启动时自动执行一次
"""
from .database import SessionLocal
from . import models, security

SHOPS = [
    ("蓝瓶咖啡（外滩店）", "cafe", 31.2400, 121.4900, "上海市黄浦区外滩"),
    ("上海书城", "bookstore", 31.2333, 121.4750, "上海市黄浦区福州路"),
    ("和平饭店西餐厅", "restaurant", 31.2396, 121.4855, "上海市黄浦区南京东路"),
    ("野餐公园", "leisure", 31.2280, 121.4750, "上海市黄浦区人民公园"),
    ("老字号生煎馆", "restaurant", 31.2270, 121.4700, "上海市黄浦区云南南路"),
    ("先锋书店", "bookstore", 31.2200, 121.4600, "上海市徐汇区"),
    ("城市咖啡馆", "cafe", 31.2150, 121.4550, "上海市徐汇区衡山路"),
    ("桌游休闲吧", "leisure", 31.2050, 121.4450, "上海市徐汇区肇嘉浜路"),
    ("弄堂小吃", "restaurant", 31.2320, 121.4820, "上海市黄浦区豫园"),
    ("静安寺茶馆", "leisure", 31.2240, 121.4460, "上海市静安区南京西路"),
]


def run():
    db = SessionLocal()
    try:
        if not db.query(models.User).filter(models.User.username == "admin").first():
            admin = models.User(
                username="admin",
                password_hash=security.hash_password("admin123"),
                nickname="管理员",
                is_admin=True,
            )
            db.add(admin)
            print("创建管理员账号：admin / admin123")

        if not db.query(models.User).filter(models.User.username == "demo").first():
            demo_user = models.User(
                username="demo",
                password_hash=security.hash_password("demo123"),
                nickname="演示用户",
                is_admin=False,
            )
            db.add(demo_user)
            print("创建演示账号：demo / demo123")

        if db.query(models.Shop).count() == 0:
            for name, category, lat, lng, address in SHOPS:
                db.add(
                    models.Shop(
                        name=name,
                        category=category,
                        latitude=lat,
                        longitude=lng,
                        address=address,
                        city_code="SH",
                    )
                )
            print(f"写入 {len(SHOPS)} 条示例店铺数据")

        db.commit()
        print("种子数据初始化完成。")
    finally:
        db.close()
