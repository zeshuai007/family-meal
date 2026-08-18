// 家庭点菜系统 · 后端服务
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { db, parseJsonArray } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------- 密码与会话 ----------------
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}
function newSalt() {
  return crypto.randomBytes(16).toString('hex');
}
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  raw.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

const stmt = {
  userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  sessionByToken: db.prepare('SELECT * FROM sessions WHERE token = ?'),
  createSession: db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
  updateUser: db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?'),
  updateRole: db.prepare('UPDATE users SET role = ? WHERE id = ?'),
};

function currentUser(req) {
  const token = parseCookies(req).fm_token;
  if (!token) return null;
  const s = stmt.sessionByToken.get(token);
  if (!s) return null;
  const u = stmt.userById.get(s.user_id);
  if (!u) {
    stmt.deleteSession.run(token);
    return null;
  }
  return u;
}
function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: '请先登录' });
  req.user = user;
  next();
}
function requireAdmin(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: '请先登录' });
  if (user.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });
  req.user = user;
  next();
}
function publicUser(u) {
  return { id: u.id, username: u.username, role: u.role, avatar: u.avatar, created_at: u.created_at };
}

// ---------------- 启动时初始化管理员 ----------------
(function seedAdmin() {
  const adminName = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin123';
  if (!stmt.userByName.get(adminName)) {
    const salt = newSalt();
    db.prepare('INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)')
      .run(adminName, hashPassword(adminPass, salt), salt, 'admin');
    console.log(`[init] 已创建默认管理员账号  ${adminName} / ${adminPass}（请登录后及时修改密码）`);
  }
})();

// ---------------- 认证 ----------------
app.post('/api/auth/register', (req, res) => {
  if (process.env.ALLOW_REGISTER === 'false') return res.status(403).json({ error: '当前已关闭注册' });
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!/^[\u4e00-\u9fa5\w-]{2,16}$/.test(username)) return res.status(400).json({ error: '用户名需为 2-16 位中英文、数字或下划线' });
  if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });
  if (stmt.userByName.get(username)) return res.status(400).json({ error: '用户名已被占用' });
  const salt = newSalt();
  db.prepare('INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)')
    .run(username, hashPassword(password, salt), salt, 'user');
  res.json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = stmt.userByName.get(String(username || '').trim());
  if (!user || hashPassword(String(password || ''), user.salt) !== user.password_hash) {
    return res.status(400).json({ error: '用户名或密码错误' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  stmt.createSession.run(token, user.id);
  res.setHeader('Set-Cookie', `fm_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`);
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  const token = parseCookies(req).fm_token;
  if (token) stmt.deleteSession.run(token);
  res.clearCookie('fm_token');
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = currentUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

app.post('/api/auth/password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (String(newPassword || '').length < 6) return res.status(400).json({ error: '新密码至少 6 位' });
  const u = stmt.userById.get(req.user.id);
  if (hashPassword(String(oldPassword || ''), u.salt) !== u.password_hash) {
    return res.status(400).json({ error: '原密码不正确' });
  }
  const salt = newSalt();
  stmt.updateUser.run(hashPassword(newPassword, salt), salt, u.id);
  res.json({ ok: true });
});

// ---------------- 用户管理（管理员） ----------------
app.get('/api/users', requireAdmin, (req, res) => {
  const list = db.prepare('SELECT * FROM users ORDER BY id').all();
  res.json({ users: list.map(publicUser) });
});
app.post('/api/users/:id/role', requireAdmin, (req, res) => {
  const role = req.body.role === 'admin' ? 'admin' : 'user';
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: '不能修改自己的权限' });
  const u = stmt.userById.get(id);
  if (!u) return res.status(404).json({ error: '用户不存在' });
  stmt.updateRole.run(role, id);
  res.json({ ok: true, user: publicUser(stmt.userById.get(id)) });
});

// ---------------- 菜品 ----------------
function dishRow(r) {
  if (!r) return null;
  const reviews = db.prepare('SELECT rating FROM reviews WHERE dish_id = ?').all(r.id);
  const avg = reviews.length ? (reviews.reduce((s, x) => s + x.rating, 0) / reviews.length) : 0;
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    image: r.image,
    description: r.description,
    main_ingredients: parseJsonArray(r.main_ingredients),
    side_ingredients: parseJsonArray(r.side_ingredients),
    seasonings: parseJsonArray(r.seasonings),
    steps: parseJsonArray(r.steps),
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    avg_rating: Math.round(avg * 10) / 10,
    review_count: reviews.length,
  };
}

app.get('/api/dishes', (req, res) => {
  const onlyOn = req.query.status === '1';
  const rows = db.prepare('SELECT * FROM dishes ORDER BY status DESC, id DESC').all();
  res.json({ dishes: rows.filter((r) => !onlyOn || r.status === 1).map(dishRow) });
});

app.get('/api/dishes/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM dishes WHERE id = ?').get(Number(req.params.id));
  if (!r) return res.status(404).json({ error: '菜品不存在' });
  res.json({ dish: dishRow(r) });
});

function validateDish(body) {
  const name = String(body.name || '').trim();
  const category = ['breakfast', 'lunch', 'dinner', 'other'].includes(body.category) ? body.category : 'other';
  if (!name) return { error: '菜品名称不能为空' };
  const strList = (v) => JSON.stringify((Array.isArray(v) ? v : []).map((x) => String(x).trim()).filter(Boolean));
  return {
    name,
    category,
    image: String(body.image || '').trim() || null,
    description: String(body.description || '').trim(),
    main_ingredients: strList(body.main_ingredients),
    side_ingredients: strList(body.side_ingredients),
    seasonings: strList(body.seasonings),
    steps: strList(body.steps),
  };
}

app.post('/api/dishes', requireAdmin, (req, res) => {
  const v = validateDish(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  const info = db.prepare(
    'INSERT INTO dishes (name, category, image, description, main_ingredients, side_ingredients, seasonings, steps) VALUES (?,?,?,?,?,?,?,?)'
  ).run(v.name, v.category, v.image, v.description, v.main_ingredients, v.side_ingredients, v.seasonings, v.steps);
  res.json({ dish: dishRow(db.prepare('SELECT * FROM dishes WHERE id = ?').get(info.lastInsertRowid)) });
});

app.put('/api/dishes/:id', requireAdmin, (req, res) => {
  const r = db.prepare('SELECT * FROM dishes WHERE id = ?').get(Number(req.params.id));
  if (!r) return res.status(404).json({ error: '菜品不存在' });
  const v = validateDish(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  db.prepare(`UPDATE dishes SET name=?, category=?, image=?, description=?, main_ingredients=?,
    side_ingredients=?, seasonings=?, steps=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(v.name, v.category, v.image, v.description, v.main_ingredients, v.side_ingredients, v.seasonings, v.steps, r.id);
  res.json({ dish: dishRow(db.prepare('SELECT * FROM dishes WHERE id = ?').get(r.id)) });
});

app.post('/api/dishes/:id/status', requireAdmin, (req, res) => {
  const status = req.body.status === 1 ? 1 : 0;
  const info = db.prepare(`UPDATE dishes SET status=?, updated_at=datetime('now','localtime') WHERE id=?`).run(status, Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: '菜品不存在' });
  res.json({ ok: true });
});

app.delete('/api/dishes/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM reviews WHERE dish_id = ?').run(Number(req.params.id));
  db.prepare('DELETE FROM dishes WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------------- 点菜（订单） ----------------
app.post('/api/orders', requireAuth, (req, res) => {
  const order_date = String(req.body.order_date || '').trim();
  const meal = ['breakfast', 'lunch', 'dinner'].includes(req.body.meal) ? req.body.meal : null;
  const dishIds = (Array.isArray(req.body.dish_ids) ? req.body.dish_ids : []).map(Number).filter(Boolean);
  const note = String(req.body.note || '').trim().slice(0, 200);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(order_date)) return res.status(400).json({ error: '日期格式不正确' });
  if (!meal) return res.status(400).json({ error: '请选择餐次' });
  if (!dishIds.length) return res.status(400).json({ error: '请至少选择一道菜' });
  const dishIdsJson = JSON.stringify([...new Set(dishIds)]);
  // 同一用户同一日期同一餐次重复点菜时，直接覆盖原记录，避免重复
  const existing = db.prepare('SELECT id FROM orders WHERE user_id=? AND order_date=? AND meal=?').get(req.user.id, order_date, meal);
  let orderId;
  if (existing) {
    db.prepare('UPDATE orders SET dish_ids=?, note=? WHERE id=?').run(dishIdsJson, note, existing.id);
    orderId = existing.id;
  } else {
    orderId = db.prepare('INSERT INTO orders (user_id, order_date, meal, dish_ids, note) VALUES (?,?,?,?,?)')
      .run(req.user.id, order_date, meal, dishIdsJson, note).lastInsertRowid;
  }
  res.json({ ok: true, order: getOrderById(orderId) });
});

app.delete('/api/orders/:id', requireAuth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id));
  if (!o) return res.status(404).json({ error: '订单不存在' });
  if (o.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '只能删除自己的订单' });
  db.prepare('DELETE FROM orders WHERE id = ?').run(o.id);
  res.json({ ok: true });
});

function getOrderById(id) {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!o) return null;
  const user = stmt.userById.get(o.user_id);
  const dishIds = parseJsonArray(o.dish_ids);
  const dishes = dishIds
    .map((did) => dishRow(db.prepare('SELECT * FROM dishes WHERE id = ?').get(did)))
    .filter(Boolean);
  return {
    id: o.id,
    user: user ? publicUser(user) : null,
    order_date: o.order_date,
    meal: o.meal,
    note: o.note,
    dishes,
    created_at: o.created_at,
  };
}

// 某天的三餐汇总（供全家人查看 / 婆婆备菜）
app.get('/api/orders', requireAuth, (req, res) => {
  const date = String(req.query.date || '');
  const list = db.prepare('SELECT * FROM orders WHERE order_date = ? ORDER BY id').all(date);
  const grouped = { breakfast: [], lunch: [], dinner: [] };
  list.forEach((o) => {
    if (grouped[o.meal]) grouped[o.meal].push(getOrderById(o.id));
  });
  res.json({ date, meals: grouped });
});

// 我的订单记录
app.get('/api/orders/my', requireAuth, (req, res) => {
  const list = db.prepare('SELECT id FROM orders WHERE user_id = ? ORDER BY order_date DESC, id DESC').all(req.user.id);
  res.json({ orders: list.map((o) => getOrderById(o.id)) });
});

// 全部订单（管理员，可删除）
app.get('/api/orders/all', requireAdmin, (req, res) => {
  const list = db.prepare('SELECT id FROM orders ORDER BY order_date DESC, id DESC').all();
  res.json({ orders: list.map((o) => getOrderById(o.id)) });
});

// ---------------- 点评（评分 + 成品图） ----------------
function reviewRow(r) {
  const user = stmt.userById.get(r.user_id);
  return {
    id: r.id,
    dish_id: r.dish_id,
    user: user ? publicUser(user) : null,
    rating: r.rating,
    comment: r.comment,
    photo: r.photo,
    created_at: r.created_at,
  };
}

app.post('/api/reviews', requireAuth, (req, res) => {
  const dish_id = Number(req.body.dish_id);
  const rating = Math.max(1, Math.min(5, Number(req.body.rating)));
  const comment = String(req.body.comment || '').trim().slice(0, 500);
  const photo = String(req.body.photo || '').trim() || null;
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(dish_id);
  if (!dish) return res.status(404).json({ error: '菜品不存在' });
  db.prepare(`INSERT INTO reviews (dish_id, user_id, rating, comment, photo) VALUES (?,?,?,?,?)
    ON CONFLICT(dish_id, user_id) DO UPDATE SET rating=excluded.rating, comment=excluded.comment, photo=excluded.photo,
    created_at=datetime('now','localtime')`).run(dish_id, req.user.id, rating, comment, photo);
  res.json({ ok: true });
});

app.get('/api/dishes/:id/reviews', (req, res) => {
  const dish_id = Number(req.params.id);
  const list = db.prepare('SELECT * FROM reviews WHERE dish_id = ? ORDER BY created_at DESC').all(dish_id);
  res.json({ reviews: list.map(reviewRow) });
});

app.get('/api/reviews/my', requireAuth, (req, res) => {
  const list = db.prepare('SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ reviews: list.map(reviewRow).map((r) => ({ ...r, dish: dishRow(db.prepare('SELECT * FROM dishes WHERE id = ?').get(r.dish_id)) })) });
});

// ---------------- 图片上传 ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().replace(/[^.a-z0-9]/g, '');
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype) ? true : cb(new Error('仅支持图片文件'))),
});
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未接收到文件' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// SPA 兜底（Express 5 兼容写法）
app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }));
app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || '服务器错误' });
});

app.listen(PORT, () => {
  console.log(`[family-meal] 家庭点菜系统已启动  http://localhost:${PORT}`);
});
