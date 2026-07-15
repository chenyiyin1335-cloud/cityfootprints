# 足迹地图 · 店铺打卡地图（Shop Check-in Map）

基于需求文档实现的可本地运行的全栈项目：用户可以在地图上浏览店铺、进行 LBS 打卡、上传图片和评价，并查看个人足迹统计。

> 想把项目部署上线（GitHub → Vercel 前端 → Render 后端 → 云 MySQL）？直接看 **[DEPLOYMENT.md](./DEPLOYMENT.md)**，里面按步骤写清楚了每一步要用到哪些文件、填哪些配置。这份 README 讲的是**本地运行**。

- **前端**：React + TypeScript + Vite，地图使用 Leaflet（OpenStreetMap 瓦片，**无需申请任何地图 API Key**，开箱即用）
- **后端**：Python + FastAPI
- **数据库**：MySQL（打卡距离校验使用 Haversine 公式，无需 PostGIS 等空间扩展）
- **视觉风格**：按提供的设计规范实现 —— 活力高光橙 `#FF6008` 作为核心 CTA / 高亮色，中性灰阶 `#222222 / #4A4A4A / #8E8E8E / #E5E5E5` 搭配无边框留白网格、圆角胶囊按钮

> 说明：随附的"参考图"和设计规范文字描述的是一个电商商品列表页（BUY/SEARCH 按钮、价格、商品卡片），与"店铺打卡地图"的实际场景不完全一致。我已经把其中的**色彩系统、字体规范、几何化组件语言（胶囊按钮/方形占位/线性图标）**忠实地迁移到了地图打卡场景里（店铺卡片、分类 Tab、打卡按钮、个人中心统计卡片等），如果你有专门针对本项目的设计稿，可以告诉我再做调整。

## 目录结构

```
project/
├── backend/                # FastAPI 后端
│   ├── app/
│   │   ├── main.py         # 应用入口
│   │   ├── config.py       # 配置（读取 .env）
│   │   ├── database.py     # SQLAlchemy 引擎/会话
│   │   ├── models.py       # ORM 模型：users / shops / check_ins
│   │   ├── schemas.py      # Pydantic 请求/响应模型
│   │   ├── security.py     # 密码哈希 + JWT
│   │   ├── routers/        # auth / shops / check-ins / users
│   │   └── utils/distance.py  # Haversine 距离校验
│   ├── seed_data.py        # 演示数据种子脚本
│   ├── init.sql            # 建库建表 SQL（参考，应用会自动建表）
│   ├── requirements.txt
│   └── .env.example
└── frontend/                # React 前端
    └── src/
        ├── App.tsx
        ├── components/      # MapView / CategoryTabs / ShopDetailPanel / CheckInModal / AuthModal / ProfileOverlay
        ├── api/client.ts    # 后端 API 封装
        └── styles/theme.css # 设计规范 Token（色彩/字体/组件样式）
```

## 一、准备 MySQL

1. 确保本地已安装并启动 MySQL（8.0+ 推荐）。
2. 创建数据库（也可以跳过，应用启动时会自动建表，但数据库本身需要先存在）：

```bash
mysql -u root -p -e "CREATE DATABASE footprint_map DEFAULT CHARACTER SET utf8mb4;"
```

如果你想直接使用完整建表脚本（可选）：

```bash
mysql -u root -p < backend/init.sql
```

## 二、启动后端

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows 用: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# 打开 .env，填写你本机 MySQL 的账号密码（DB_USER / DB_PASSWORD）

# 写入演示数据（管理员账号 admin/admin123，演示账号 demo/demo123，以及 10 家上海示例店铺）
python seed_data.py

# 启动服务（默认 http://127.0.0.1:8000）
uvicorn app.main:app --reload --port 8000
```

启动后可以访问 `http://127.0.0.1:8000/docs` 查看自动生成的 API 文档。

## 三、启动前端

```bash
cd frontend
npm install
npm run dev
```

打开浏览器访问 `http://127.0.0.1:5173` 即可使用（Vite 已配置代理，`/api` 和 `/uploads` 请求会自动转发到后端 8000 端口）。

首次进入会请求浏览器定位权限，用于展示"距离店铺 XX 米"和校验打卡距离；如果拒绝定位，也可以正常浏览地图，只是无法打卡（这是需求文档里 LBS 校验的强制要求）。

可以直接用种子账号登录体验：`demo / demo123`。

## 功能对照需求文档实现情况

| 模块 | 实现情况 |
| --- | --- |
| 地图初始化 / 缩放拖拽定位 | ✅ Leaflet 地图，浏览器定位 API 自动定位 |
| 店铺 Marker 渲染（未打卡灰色 / 已打卡彩色） | ✅ `MapView.tsx` |
| 分类筛选 Tab | ✅ 全部/餐饮/咖啡/书店/休闲 |
| 地图点位聚合（Zoom 较小时） | ✅ `leaflet.markercluster` |
| LBS 距离校验（<50m 才能打卡，超出返回 `ERROR_DISTANCE_TOO_FAR`） | ✅ 前端预校验 + 后端 Haversine 强校验，距离阈值可在 `.env` 调整 |
| 打卡动作 + 点亮状态 | ✅ 打卡成功后店铺 Marker 变为高亮橙色 |
| 图文上传（最多 9 张图 / 0-500 字评价 / 1-5 星评分） | ✅ 本地磁盘存储图片（生产环境建议替换为对象存储预签名直传，代码里已预留改造点） |
| 个人中心：打卡总数 / 覆盖城市数 / 最爱品类 | ✅ `/api/users/me/stats` |
| 打卡记录列表 + 删除 | ✅ `ProfileOverlay.tsx` |
| 店铺搜索（关键词） | ✅ 顶部搜索框 |
| 店铺详情（信息 + 评价列表 + 打卡人数） | ✅ `ShopDetailPanel.tsx` |
| 用户角色（普通用户 / 管理员） | ✅ `is_admin` 字段；管理员可通过 `POST /api/shops` 新增店铺 |
| 防刷（同一用户同一店铺只能打卡一次） | ✅ 数据库唯一约束 `uk_user_shop` |

未实现 / 简化说明（均为本地演示场景的合理简化，Phase 2/3 属于需求文档中标注的后续迭代范围）：
- 图片未接入"鉴黄/鉴暴"内容安全审核，也未做防刷验证码拦截
- 个人足迹热力图、点赞评论社交功能、足迹海报生成为 Phase 2/3 需求，未包含在本次 MVP
- 对象存储（OSS/S3）替换为本地磁盘存储，便于零配置本地运行

## 常见问题

- **`pymysql` 报连接错误 / 认证插件问题**：确认 MySQL 用户使用 `mysql_native_password` 或较新版本已默认支持 `caching_sha2_password`（`requirements.txt` 已包含 `cryptography` 依赖来支持该插件）。
- **前端地图瓦片加载慢或空白**：`MapView.tsx` 默认使用 `tile.openstreetmap.org` 的公共瓦片服务，本地网络访问外网较慢时可自行替换为其他兼容的瓦片源（如高德/腾讯地图的 XYZ 瓦片地址）。
- **打卡按钮一直置灰**：说明浏览器定位未授权或当前位置确实超出 50 米范围，可在 `.env` 中调大 `CHECKIN_MAX_DISTANCE_METERS` 方便本地测试。
