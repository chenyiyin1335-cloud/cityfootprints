# 部署指南：GitHub → Vercel（前端） → Render（后端） → 云数据库（MySQL）

这份文档按你要的顺序，逐步说明**每一步要上传/配置哪些文件**。仓库结构已经是 `frontend/` 和 `backend/` 平铺在根目录，不需要再调整。

```
你的仓库根目录/
├── frontend/     ← 第一步会用到
├── backend/      ← 第二步会用到（里面的 init.sql 第三步会用到）
├── README.md
├── DEPLOYMENT.md
└── .gitignore
```

> ⚠️ 提醒一个先后顺序上的小细节：前端需要知道后端的地址，后端需要知道数据库的地址。所以虽然是"先部署前端"，但**第一次部署完前端后，你还需要回来补一次环境变量并重新部署**——这在下面第一步末尾会提醒你。整个流程正常做完一遍即可，之后改代码只需要 `git push`，两边都会自动重新部署。

---

## 前置准备：把代码推送到 GitHub

**需要上传的文件**：项目根目录下的**全部文件**（`frontend/`、`backend/`、`README.md`、`DEPLOYMENT.md`、`.gitignore`）。

```bash
# 解压我给你的项目压缩包后，进入项目根目录
cd 足迹地图-project/project

git init
git add .
git commit -m "init: 足迹地图打卡项目"

# 在 GitHub 网站上新建一个空仓库（不要勾选自动生成 README），拿到仓库地址后：
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

`.gitignore` 已经排除了 `node_modules/`、`venv/`、`.env`、上传的图片等不该进仓库的内容，直接 `git add .` 是安全的。

---

## 第一步：前端部署到 Vercel

**需要用到的文件**：`frontend/` 整个目录（已经在 GitHub 仓库里了，Vercel 直接读取，不用手动上传单个文件）。

1. 登录 [vercel.com](https://vercel.com)，点击 **Add New → Project**，选择你刚推送的 GitHub 仓库并导入。
2. 在配置页面里：
   - **Root Directory**：点 Edit，选择 `frontend`（这一步必须做，否则 Vercel 会在仓库根目录找不到 `package.json`）
   - **Framework Preset**：Vercel 会自动识别成 `Vite`，保持默认即可
   - **Build Command**：默认 `npm run build`，不用改
   - **Output Directory**：默认 `dist`，不用改
   - **Install Command**：默认 `npm install`，不用改
3. **环境变量**（Environment Variables）：第一次部署时后端还没上线，这里可以先留空，直接点 **Deploy**。
4. 部署成功后，Vercel 会给你一个域名，形如：`https://footprint-map-xxxx.vercel.app`，先记下来（第二步配置后端跨域时要用到）。
5. 等你做完第二步、第三步，拿到了 Render 后端地址后，回到 Vercel 项目的 **Settings → Environment Variables**，新增：

   | Key | Value |
   | --- | --- |
   | `VITE_API_BASE_URL` | `https://你的后端.onrender.com`（第二步部署完 Render 后拿到，末尾不要带 `/`） |

   保存后到 **Deployments** 标签页，对最新一次部署点 **Redeploy**（重新构建一次让新的环境变量生效）。

---

## 第二步：后端部署到 Render

**需要用到的文件**：`backend/` 整个目录（同样已经在 GitHub 仓库里，Render 直接读取）。

### 2.1 创建 Web Service

1. 登录 [render.com](https://render.com)，点击 **New + → Web Service**。
2. 选择同一个 GitHub 仓库并连接。
3. 关键配置：

   | 配置项 | 填写内容 |
   | --- | --- |
   | Root Directory | `backend` |
   | Runtime | `Python 3` |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
   | Instance Type | Free 即可用于演示 |

   （如果你的 Render 账号支持 "Blueprint" 一键部署，也可以直接用仓库里的 `backend/render.yaml`，效果和手动填一样，二选一即可。）

### 2.2 配置环境变量

在 Render 的 **Environment** 标签页里添加（对应 `backend/.env.example` 里的字段）：

| Key | 说明 | 示例值 |
| --- | --- | --- |
| `SECRET_KEY` | 随便填一串随机字符串，用于 JWT 签名 | 点 "Generate" 让 Render 自动生成 |
| `DATABASE_URL` | 第三步会拿到，先占位，等第三步做完回来填 | `mysql://user:pass@host:3306/dbname` |
| `DB_SSL_CA` | 只有云数据库强制要求 TLS 证书时才需要，见第三步说明 | 留空或 `/etc/secrets/ca.pem` |
| `ALLOWED_ORIGINS` | 填第一步拿到的 Vercel 域名，允许前端跨域访问 | `https://footprint-map-xxxx.vercel.app` |
| `CHECKIN_MAX_DISTANCE_METERS` | 打卡距离限制（米），不改就用默认 | `50` |
| `UPLOAD_DIR` | 图片保存目录，不用改 | `uploads` |
| `AUTO_SEED_DEMO_DATA` | 设为 `true`，让服务启动时自动写入管理员/演示账号和示例店铺（免去 Render 免费版不方便手动跑脚本的麻烦） | `true` |

填完点 **Save Changes**，Render 会自动重新部署一次。

> 📌 图片存储的重要提醒：Render 免费版的磁盘是**非持久化**的（每次重新部署/重启服务都会清空），当前项目为了本地零配置直接把上传图片存在本地磁盘的 `backend/uploads/` 目录。演示阶段够用，但如果要长期使用，建议后续把 `backend/app/routers/checkins.py` 里的 `upload_image` 接口改造成对象存储（阿里云 OSS / 腾讯云 COS / AWS S3 等）方案。

### 2.3 部署完成后

Render 会给你一个形如 `https://footprint-map-backend.onrender.com` 的地址。

- 访问 `https://你的后端.onrender.com/api/health`，返回 `{"status":"ok"}` 说明后端本身启动成功。
- 访问 `https://你的后端.onrender.com/docs` 可以看到自动生成的接口文档。
- 如果这时候访问报数据库连接错误，是正常的——先完成第三步配置好数据库，再回到 Render 把 `DATABASE_URL` 填成真实值即可自动重启生效。

---

## 第三步：配置云数据库（MySQL）

**需要用到的文件**：`backend/init.sql`（建库建表 SQL，粘贴到云数据库控制台执行）。

### 3.1 选一个云 MySQL

推荐 **Aiven**（目前有稳定的免费额度：1GB 存储 + 1GB 内存，不需要信用卡）：

1. 打开 [aiven.io/free-mysql-database](https://aiven.io/free-mysql-database)，注册并新建一个 MySQL 服务（Free 套餐）。
2. 创建成功后，在服务详情页的 **Overview / Connection Information** 里可以看到：
   - Host、Port、User、Password、Database name
   - 一个 **Service URI**，格式类似：
     ```
     mysql://avnadmin:xxxxxxxx@mysql-xxxx.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
     ```
   - 页面上还提供了 **CA Certificate** 下载（`ca.pem`），因为 Aiven 强制要求 TLS 连接。

   > 其他可选的免费/低成本云 MySQL：TiDB Cloud Serverless（MySQL 协议兼容）、Railway（新用户有免费额度，之后按量计费）。选哪个都可以，拿到的都是一个标准的 MySQL 连接串，用法完全一样。

### 3.2 建库建表

打开云数据库控制台自带的 SQL 编辑器（或用本地 `mysql` 客户端连接上去），把仓库里 **`backend/init.sql`** 的内容整段粘贴执行：

```bash
# 如果习惯用命令行连接（把下面换成你的云数据库连接信息）：
mysql -h mysql-xxxx.aivencloud.com -P 12345 -u avnadmin -p defaultdb < backend/init.sql
```

`init.sql` 会创建 `users`、`shops`、`check_ins` 三张表（建表语句见下方，和仓库里的文件完全一致，方便你直接复制）：

```sql
CREATE DATABASE IF NOT EXISTS footprint_map
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE footprint_map;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50),
  avatar_url VARCHAR(255),
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shops (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  address VARCHAR(255),
  city_code VARCHAR(20),
  check_in_count INT NOT NULL DEFAULT 0,
  cover_image VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_shops_city (city_code),
  INDEX idx_shops_category (category),
  INDEX idx_shops_lat_lng (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS check_ins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  shop_id INT NOT NULL,
  images TEXT,
  rating TINYINT,
  comment VARCHAR(500),
  snapshot_lat DECIMAL(10, 7),
  snapshot_lng DECIMAL(10, 7),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_shop (user_id, shop_id),
  CONSTRAINT fk_checkin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_checkin_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> 这一步其实不是必须手动做的：后端应用启动时会用 SQLAlchemy 自动建表（`Base.metadata.create_all`）。但云数据库账号给的初始数据库名不一定叫 `footprint_map`（比如 Aiven 默认是 `defaultdb`），所以建议至少手动执行一次 `init.sql` 里 `USE ...;` 之后的建表语句，或者干脆把连接串里的数据库名改成 `footprint_map`（自己在控制台新建一个同名数据库）。

### 3.3 把连接信息填回 Render

回到第二步 Render 的 **Environment** 页面：

| Key | 填写内容 |
| --- | --- |
| `DATABASE_URL` | 用 Aiven 给的 Service URI，注意要把开头的 `mysql://` 保留即可（代码里会自动转换成 `mysql+pymysql://`），例如：`mysql://avnadmin:xxxx@mysql-xxxx.aivencloud.com:12345/footprint_map` |
| `DB_SSL_CA` | 如果数据库强制要求 TLS（Aiven 默认如此）：在 Render 的 **Environment → Secret Files** 里新建一个文件，文件名填 `ca.pem`，内容粘贴 Aiven 下载的 CA 证书内容，路径会是 `/etc/secrets/ca.pem`；然后把这个路径填到 `DB_SSL_CA` |

保存后 Render 会自动重新部署，稍等 1-2 分钟。

---

## 全部完成后自查清单

1. 打开 `https://你的后端.onrender.com/api/health` → 返回 `{"status":"ok"}`
2. 打开 `https://你的后端.onrender.com/docs`，找到 `GET /api/shops` 试着执行一下，能看到示例店铺数据（说明数据库连接成功，且 `AUTO_SEED_DEMO_DATA` 生效了）
3. 打开你的 Vercel 域名，地图能加载出来、能看到店铺 Marker
4. 用种子账号 `demo / demo123` 登录，尝试打卡（如果不在店铺 50 米范围内，打卡按钮会置灰，这是正常的距离校验，可以临时把 Render 的 `CHECKIN_MAX_DISTANCE_METERS` 调大来测试）

如果某一步报错，把 Render 的 **Logs** 标签页或浏览器控制台的报错信息发给我，我可以帮你定位问题。
