# 家庭点菜系统 · 生产镜像
# 注意：项目使用 Node 内置 node:sqlite，必须使用 Node >= 22.5 的镜像
FROM node:24-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    UPLOAD_DIR=/data/uploads

WORKDIR /app

# 先复制依赖清单安装依赖（利用 Docker 构建缓存，业务代码变更时不用重装依赖）
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# 复制应用代码
COPY server.js db.js ./
COPY public ./public

# 数据与上传目录（SQLite 数据库 + 菜品/成品图片）
RUN mkdir -p /data/uploads

EXPOSE 3000

CMD ["node", "server.js"]
