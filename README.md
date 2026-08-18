# family-meal 家庭点菜系统

为孕妈在家"点菜"而生的家庭小程序 —— 手机点菜，婆婆照单下厨，做好的菜拍照评分全家可见。

## 功能特性

- **每日三餐点菜**：早餐 / 午餐 / 晚餐，支持按日期查看全家人点的菜，点菜记录持久化保存
- **菜品菜单**：每道菜包含图片、主食材、配菜、配料调料、详细做法，可按餐次分类
- **成品点评**：婆婆做好菜后上传成品图，家人可评分（1-5 星）+ 文字点评，评分人署名展示
- **权限控制**：仅管理员可新增 / 编辑 / 上架 / 下架菜品、管理用户权限；普通用户登录后点菜点评
- **多端自适应**：手机、平板、电脑三端自适应，简洁美观
- **零依赖部署**：后端 Express + 前端 Vue(本地化运行库) + 内置 SQLite（`node:sqlite`，无需编译原生模块）

## 技术栈

- 后端：Node.js（≥22.5，内置 `node:sqlite`）+ Express 5 + multer
- 前端：Vue 3（本地 `public/vendor/vue.global.prod.js`，无需构建步骤）
- 数据库：SQLite（WAL 模式），数据文件位于 `data/` 目录

## 本地开发

```bash
npm install
npm start       # 等价于 node server.js，默认 http://localhost:3000
```

环境变量（可选）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 监听端口 |
| `DATA_DIR` | `./data` | SQLite 数据库目录 |
| `UPLOAD_DIR` | `./uploads` | 上传图片目录 |
| `ADMIN_USER` | `admin` | 首次启动自动创建的管理员账号 |
| `ADMIN_PASS` | `admin123` | 管理员初始密码（登录后请立即修改） |
| `ALLOW_REGISTER` | `true` | 是否开放注册（`false` 时只能由管理员后台建用户） |

## 部署到 1Panel

推荐方式：使用 1Panel 的 **编排（Docker Compose）** 创建应用。

### 方式一：Docker Compose（推荐）

1. 将项目目录（含 `Dockerfile`、`docker-compose.yml`、`public/`、`server.js`、`db.js`、`package.json`、`package-lock.json`）上传到服务器，如 `/opt/family-meal`
2. 打开 1Panel → **容器 → 编排** → **创建编排**，选择"使用已有编排文件"，选中 `docker-compose.yml`
3. 确认信息后点击 **构建并启动**。1Panel 会自动构建镜像并创建容器
4. 部署完成后通过 `http://服务器IP:3000` 访问
5. 默认管理员：`admin / admin123`，登录后请 **立即修改密码**，并可在"我的"页或管理后台完善家庭账号（关闭注册后由管理员创建成员账号）

> 若局域网内其他设备（手机 / 平板）访问，请确保 1Panel 所在服务器防火墙已放行 3000 端口；如需绑定域名 + HTTPS，可在 1Panel 网站中添加反代站点，目标地址填 `http://127.0.0.1:3000`。

### 方式二：直接在 1Panel 中构建

1. 上传项目到服务器
2. 1Panel → **容器 → 构建**，指向项目目录（`Dockerfile` 所在路径）
3. 构建完成后在 **容器** 中创建容器：镜像选构建产物，映射 `3000` 端口，挂载 `/opt/family-meal/data:/data`，设置上述环境变量即可

### 数据备份

所有数据（用户、菜品、订单、点评、上传图片）都保存在 `data/` 目录的 SQLite 数据库中。升级或重建容器不会丢失数据。定期备份 `data/` 目录即可（推荐备份前先停止容器，确保 WAL 落盘）。

## 端口说明

- 容器内固定监听 `3000`
- `docker-compose.yml` 中 `ports` 冒号左侧可自定义对外端口，例如 `8080:3000`
