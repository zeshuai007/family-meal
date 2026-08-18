/* ============================================================
   家味小馆 · 家庭点菜系统 前端
   纯 Vue3 (本地运行时) + 自定义 CSS，无构建步骤，三端自适应
   ============================================================ */
const { createApp, ref, reactive, computed, onMounted, nextTick } = Vue;

/* ---------------- 基础工具 ---------------- */
async function api(path, { method = 'GET', body, isForm } = {}) {
  const opts = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    if (isForm) opts.body = body;
    else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  }
  const res = await fetch('/api' + path, opts);
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

const toasts = reactive([]);
function toast(msg, type = 'ok') {
  toasts.push({ id: Date.now() + Math.random(), msg, type });
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.msg === msg);
    if (i > -1) toasts.splice(i, 1);
  }, 2600);
}

const MEALS = {
  breakfast: { label: '早餐', time: '07:00 – 09:00', icon: 'sun', cls: 'cat-breakfast', grad: 'linear-gradient(135deg,#e0b052,#d99a35)' },
  lunch: { label: '午餐', time: '11:30 – 13:30', icon: 'bowl', cls: 'cat-lunch', grad: 'linear-gradient(135deg,#e26b52,#cd4a35)' },
  dinner: { label: '晚餐', time: '17:30 – 19:30', icon: 'moon', cls: 'cat-dinner', grad: 'linear-gradient(135deg,#7083b4,#53629a)' },
};
const CATS = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', other: '其他' };

function todayStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function fmtDate(s) {
  const d = new Date(s + 'T00:00:00');
  const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 · 星期${wd}`;
}
function avatarStyle(id) {
  const colors = ['#d9553f', '#d9a441', '#5f6f9e', '#7d9b76', '#b0704f', '#8a5f8e'];
  return { background: colors[id % colors.length] };
}
function starsHtml(rating) {
  let s = '';
  for (let i = 1; i <= 5; i++) s += `<span class="${i <= Math.round(rating) ? '' : 'off'}">★</span>`;
  return s;
}

/* ---------------- 图标 ---------------- */
const ICONS = {
  brand: '<path d="M4 11a8 8 0 0 1 16 0v1H4z"/><path d="M4 12c0 5.2 3.2 7.5 8 7.5s8-2.3 8-7.5"/><path d="M9 4.5C9.8 3.2 11.5 3.2 12.5 4.5 13.5 5.8 15.2 5.8 16 4.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  bowl: '<path d="M5 11h14a7 7 0 0 1-14 0z"/><path d="M5 12a7 7 0 0 0 14 0"/><path d="M9 5.5 10.5 3M12 5.5 13.5 3M15 5.5 16.5 3"/>',
  moon: '<path d="M20 13A8 8 0 1 1 11 4a6.5 6.5 0 0 0 9 9z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 12-4 16-9 16z"/><path d="M4 21c4-4 8-8 12-12"/>',
  menu: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  gear: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  star: '<path d="M12 2l2.9 6.26 6.6.64-5 4.46 1.5 6.5L12 16.9l-6 3.96 1.5-6.5-5-4.46 6.6-.64z"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  empty: '<path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
};

/* ---------------- 全局状态 ---------------- */
const store = reactive({
  me: null,
  booted: false,
  route: 'today',
  dishes: [],
  today: null,
  myOrders: [],
  myReviews: [],
  users: [],
  allOrders: [],
  detail: null,        // 菜品详情弹窗
  order: null,         // 点菜弹窗 { date, meal, preselect: [] }
  review: null,        // 点评弹窗 { dish_id, dish }
  dishForm: null,      // 管理员菜品编辑弹窗 { mode:'new'|'edit', ... }
  passwordOpen: false,
  lightbox: null,
  adminTab: 'dishes',
});

/* ---------------- 数据加载 ---------------- */
async function loadDishes() {
  store.dishes = (await api('/dishes')).dishes;
}
async function loadToday() {
  const date = todayStr();
  store.today = await api('/orders?date=' + date);
}
async function loadMine() {
  store.myOrders = (await api('/orders/my')).orders;
  store.myReviews = (await api('/reviews/my')).reviews;
}
async function loadUsers() {
  store.users = (await api('/users')).users;
}
async function loadAllOrders() {
  store.allOrders = (await api('/orders/all')).orders;
}
async function boot() {
  const d = await api('/auth/me');
  store.me = d.user;
  store.booted = true;
  if (!d.user) { store.route = 'login'; return; }
  await Promise.all([loadDishes(), loadToday(), loadMine()]);
  if (store.me.role === 'admin') await Promise.all([loadUsers(), loadAllOrders()]);
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const data = await api('/upload', { method: 'POST', body: fd, isForm: true });
  return data.url;
}

/* ---------------- 路由 ---------------- */
const ROUTES = ['today', 'menu', 'mine', 'admin'];
function go(route) {
  if (route === 'admin' && store.me.role !== 'admin') { toast('需要管理员权限', 'err'); return; }
  location.hash = '#/' + route;
}
function applyRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  let r = ROUTES.includes(h) ? h : 'today';
  if (r === 'admin' && store.me.role !== 'admin') r = 'today';
  store.route = r;
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', applyRoute);

/* ============================================================
   组件
   ============================================================ */
const app = createApp({
  setup() {
    onMounted(async () => {
      await boot();
      applyRoute();
    });
    return { store, toasts, MEALS };
  },
  template: `
  <div v-if="!store.booted" class="login-wrap"><div class="loading-dots">正在备菜</div></div>
  <div v-else-if="!store.me">
    <login-view />
  </div>
  <div v-else class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <a class="brand" href="#/today">
          <span class="logo"><ix name="brand"/></span>
          <span style="display:flex;flex-direction:column">
            <span class="brand-name">家味小馆</span>
            <span class="brand-sub">婆婆掌勺 · 想吃什么点一下</span>
          </span>
        </a>
        <nav class="nav">
          <a :class="{active: store.route==='today'}" href="#/today"><ix name="sun"/>今日三餐</a>
          <a :class="{active: store.route==='menu'}" href="#/menu"><ix name="menu"/>菜单</a>
          <a :class="{active: store.route==='mine'}" href="#/mine"><ix name="user"/>我的</a>
          <a v-if="store.me.role==='admin'" :class="{active: store.route==='admin'}" href="#/admin"><ix name="gear"/>管理</a>
        </nav>
        <div class="userchip" @click="go('mine')">
          <span class="avatar" :style="avatarStyle(store.me.id)">{{ store.me.username[0] }}</span>
          <span class="uname">{{ store.me.username }}</span>
        </div>
      </div>
    </header>

    <main class="main">
      <today-view v-if="store.route==='today'" />
      <menu-view v-else-if="store.route==='menu'" />
      <mine-view v-else-if="store.route==='mine'" />
      <admin-view v-else-if="store.route==='admin'" />
    </main>

    <nav class="bottab">
      <a :class="{active: store.route==='today'}" href="#/today"><ix name="sun"/>今日三餐</a>
      <a :class="{active: store.route==='menu'}" href="#/menu"><ix name="menu"/>菜单</a>
      <a :class="{active: store.route==='mine'}" href="#/mine"><ix name="user"/>我的</a>
      <a v-if="store.me.role==='admin'" :class="{active: store.route==='admin'}" href="#/admin"><ix name="gear"/>管理</a>
    </nav>

    <dish-modal v-if="store.detail" />
    <order-modal v-if="store.order" />
    <review-modal v-if="store.review" />
    <dish-form-modal v-if="store.dishForm" />
    <password-modal v-if="store.passwordOpen" />
    <lightbox v-if="store.lightbox" />

    <div class="toasts"><div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.msg }}</div></div>
  </div>
  `,
});

/* ---------------- 图标组件 ---------------- */
app.component('ix', {
  props: ['name'],
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS[name]"></svg>`,
  setup() { return { ICONS }; },
});

/* ---------------- 登录 ---------------- */
app.component('login-view', {
  setup() {
    const mode = ref('login');
    const username = ref('');
    const password = ref('');
    const password2 = ref('');
    const busy = ref(false);
    async function submit() {
      if (!username.value.trim() || !password.value) { toast('请输入用户名和密码', 'err'); return; }
      busy.value = true;
      try {
        if (mode.value === 'login') {
          await api('/auth/login', { method: 'POST', body: { username: username.value, password: password.value } });
          toast('欢迎回家');
        } else {
          if (password.value !== password2.value) { toast('两次密码不一致', 'err'); return; }
          await api('/auth/register', { method: 'POST', body: { username: username.value, password: password.value } });
          toast('注册成功，请登录');
          mode.value = 'login';
          password.value = password2.value = '';
          return;
        }
        await boot();
        applyRoute();
      } catch (e) {
        toast(e.message, 'err');
      } finally {
        busy.value = false;
      }
    }
    return { mode, username, password, password2, busy, submit };
  },
  template: `
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-brand">
        <span class="logo"><ix name="brand"/></span>
        <span class="name">家味小馆</span>
      </div>
      <div class="login-sub">{{ mode==='login' ? '欢迎回家，今天想吃什么？' : '加入家里的小饭桌' }}</div>
      <div class="field">
        <label>用户名</label>
        <input class="input" v-model="username" placeholder="请输入用户名" @keyup.enter="submit" />
      </div>
      <div class="field">
        <label>密码</label>
        <input class="input" type="password" v-model="password" placeholder="至少 6 位" @keyup.enter="submit" />
      </div>
      <div class="field" v-if="mode==='register'">
        <label>确认密码</label>
        <input class="input" type="password" v-model="password2" placeholder="再次输入密码" @keyup.enter="submit" />
      </div>
      <button class="btn btn-primary btn-block btn-lg" :disabled="busy" @click="submit">
        {{ busy ? '请稍候…' : (mode==='login' ? '登录开饭' : '注册') }}
      </button>
      <div class="login-switch">
        <template v-if="mode==='login'">
          还没有账号？<a @click="mode='register'">注册一个</a>
        </template>
        <template v-else>
          已有账号？<a @click="mode='login'">直接登录</a>
        </template>
      </div>
      <div class="login-tip">首次使用：管理员账号 admin / admin123（登录后请尽快修改密码）</div>
    </div>
  </div>
  `,
});

/* ---------------- 今日三餐 ---------------- */
app.component('today-view', {
  setup() {
    function summary(mealKey) {
      const orders = (store.today && store.today.meals[mealKey]) || [];
      const map = {};
      orders.forEach((o) => {
        (o.dishes || []).forEach((d) => {
          if (!map[d.id]) map[d.id] = { dish: d, who: new Set() };
          map[d.id].who.add(o.user.username);
        });
      });
      const list = Object.values(map).map((m) => ({ ...m, who: [...m.who] }));
      const persons = new Set(orders.map((o) => o.user.id));
      return { list, persons: persons.size, total: orders.reduce((s, o) => s + (o.dishes || []).length, 0), orderCount: orders.length };
    }
    function openOrder(meal) {
      store.order = { date: todayStr(), meal, preselect: [] };
    }
    function openDetail(dish) {
      store.detail = dish;
    }
    return { store, MEALS, CATS, summary, openOrder, openDetail, todayStr, fmtDate };
  },
  template: `
  <div>
    <div class="hero">
      <h1>今天想吃点什么？<br><em>婆婆给您做。</em></h1>
      <div class="sub">点好菜、评好味，热腾腾的一日三餐都在这里。</div>
      <div class="date">{{ fmtDate(todayStr()) }}</div>
    </div>

    <div v-for="m in ['breakfast','lunch','dinner']" :key="m" class="card meal-card" style="margin-bottom:18px">
      <div class="meal-head" @click="openOrder(m)">
        <span class="meal-icon" :style="{background: MEALS[m].grad}"><ix :name="MEALS[m].icon"/></span>
        <div>
          <div class="meal-title">{{ MEALS[m].label }}</div>
          <div class="meal-time"><ix name="clock" style="width:12px;height:12px;vertical-align:-1px"/>&nbsp;{{ MEALS[m].time }}</div>
        </div>
        <div class="right">
          <div class="meal-count" v-if="summary(m).total>0">{{ summary(m).total }} 道菜 · {{ summary(m).persons }} 人已点</div>
          <div class="meal-count" v-else style="color:var(--muted)">还没点呢</div>
          <div style="font-size:12px;color:var(--tomato);font-weight:600;margin-top:2px">去点菜 ›</div>
        </div>
      </div>
      <div class="meal-body">
        <template v-if="summary(m).list.length">
          <span v-for="it in summary(m).list" :key="it.dish.id" class="dish-tag" @click="openDetail(it.dish)">
            <span class="dname">{{ it.dish.name }}</span>
            <span class="who">· {{ it.who.join('、') }}</span>
          </span>
        </template>
        <div v-else class="empty-state" @click="openOrder(m)">
          <ix name="empty"/>
          <div>这一餐还没人点菜</div>
          <button class="btn btn-soft btn-sm">点个想吃的</button>
        </div>
      </div>
    </div>
  </div>
  `,
});

/* ---------------- 菜单 ---------------- */
app.component('menu-view', {
  setup() {
    const filter = ref('all');
    const kw = ref('');
    const list = computed(() => {
      const onlyOn = store.me.role !== 'admin';
      return store.dishes.filter((d) => {
        if (onlyOn && d.status !== 1) return false;
        if (filter.value !== 'all' && d.category !== filter.value) return false;
        if (kw.value && !d.name.includes(kw.value) && !(d.description || '').includes(kw.value)) return false;
        return true;
      });
    });
    function openDetail(dish) { store.detail = dish; }
    function openOrder() { store.order = { date: todayStr(), meal: 'lunch', preselect: [] }; }
    function newDish() { store.dishForm = { mode: 'new', name: '', category: 'lunch', image: '', description: '', main_ingredients: [], side_ingredients: [], seasonings: [], steps: [] }; }
    return { store, CATS, filter, kw, list, openDetail, openOrder, newDish, avatarStyle };
  },
  template: `
  <div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
      <h2 style="font-size:28px">家宴菜单</h2>
      <button v-if="store.me.role==='admin'" class="btn btn-primary" @click="newDish"><ix name="plus"/>上新菜</button>
    </div>
    <div class="filters" style="margin-top:14px">
      <div style="position:relative;flex:1;min-width:150px">
        <input class="input" v-model="kw" placeholder="搜一搜想吃的…" style="padding-left:38px" />
        <ix name="search" style="width:17px;height:17px;position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--muted)"/>
      </div>
      <button class="filter-btn" :class="{active:filter==='all'}" @click="filter='all'">全部</button>
      <button class="filter-btn" :class="{active:filter==='breakfast'}" @click="filter='breakfast'">早餐</button>
      <button class="filter-btn" :class="{active:filter==='lunch'}" @click="filter='lunch'">午餐</button>
      <button class="filter-btn" :class="{active:filter==='dinner'}" @click="filter='dinner'">晚餐</button>
      <button class="filter-btn" :class="{active:filter==='other'}" @click="filter='other'">其他</button>
    </div>

    <div v-if="list.length" class="dish-grid">
      <div v-for="d in list" :key="d.id" class="dish-card" @click="openDetail(d)">
        <div class="dish-img">
          <img v-if="d.image" :src="d.image" :alt="d.name" loading="lazy" />
          <div v-else class="ph">{{ d.name[0] }}</div>
          <span class="cat-badge" :class="'cat-'+d.category">{{ CATS[d.category] }}</span>
          <span v-if="d.status===0" class="shelf">已下架</span>
        </div>
        <div class="dish-info">
          <div class="dish-name">{{ d.name }}</div>
          <div class="dish-desc">{{ d.description || '婆婆的拿手好菜' }}</div>
          <div class="dish-meta">
            <span class="stars" v-html="starsHtml(d.avg_rating)"></span>
            <span class="rating-txt">{{ d.review_count ? (d.avg_rating + ' 分 · ' + d.review_count + ' 人评') : '暂无评价' }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-state" style="margin-top:30px">
      <ix name="empty"/><div>这里还空着，等您上新菜</div>
    </div>
  </div>
  `,
});

/* ---------------- 菜品详情 ---------------- */
app.component('dish-modal', {
  setup() {
    const reviews = ref([]);
    const loading = ref(true);
    onMounted(async () => {
      try { reviews.value = (await api('/dishes/' + store.detail.id + '/reviews')).reviews; }
      catch (e) { toast(e.message, 'err'); }
      loading.value = false;
    });
    function openReview() { store.review = { dish_id: store.detail.id, dish: store.detail }; }
    function quickOrder() { store.order = { date: todayStr(), meal: 'lunch', preselect: [store.detail.id] }; }
    function editDish() {
      const d = store.detail;
      store.dishForm = { mode: 'edit', id: d.id, name: d.name, category: d.category, image: d.image || '', description: d.description || '', main_ingredients: [...d.main_ingredients], side_ingredients: [...d.side_ingredients], seasonings: [...d.seasonings], steps: [...d.steps] };
    }
    async function toggleStatus() {
      try {
        await api('/dishes/' + store.detail.id + '/status', { method: 'POST', body: { status: store.detail.status === 1 ? 0 : 1 } });
        toast(store.detail.status === 1 ? '已下架' : '已上架');
        await loadDishes();
        const fresh = store.dishes.find((x) => x.id === store.detail.id);
        store.detail = fresh || null;
      } catch (e) { toast(e.message, 'err'); }
    }
    async function removeDish() {
      if (!confirm('确定删除这道菜吗？相关点评也会一并删除。')) return;
      try {
        await api('/dishes/' + store.detail.id, { method: 'DELETE' });
        toast('已删除');
        store.detail = null;
        await loadDishes();
      } catch (e) { toast(e.message, 'err'); }
    }
    return { store, CATS, reviews, loading, openReview, quickOrder, editDish, toggleStatus, removeDish, avatarStyle, starsHtml };
  },
  template: `
  <div class="modal-mask" @click.self="store.detail=null">
    <div class="modal">
      <div class="modal-head">
        <h3>菜品详情</h3>
        <button class="icon-btn" @click="store.detail=null"><ix name="close"/></button>
      </div>
      <div class="modal-body">
        <div class="detail-hero">
          <img v-if="store.detail.image" :src="store.detail.image" :alt="store.detail.name" />
          <div v-else class="ph">{{ store.detail.name[0] }}</div>
          <span class="cat-badge" :class="'cat-'+store.detail.category" style="position:absolute;left:12px;top:12px">{{ CATS[store.detail.category] }}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div>
            <h2 class="detail-name">{{ store.detail.name }}</h2>
            <div class="detail-rate">
              <span class="stars" v-html="starsHtml(store.detail.avg_rating)"></span>
              <span class="count">{{ store.detail.review_count ? (store.detail.avg_rating + ' 分 · ' + store.detail.review_count + ' 条点评') : '还没有点评' }}</span>
            </div>
          </div>
          <div v-if="store.detail.status===0" class="shelf" style="position:static;background:var(--ink)">已下架</div>
        </div>

        <p v-if="store.detail.description" style="margin-top:10px;color:var(--ink-soft);font-size:14.5px">{{ store.detail.description }}</p>

        <div class="ing-block" v-if="store.detail.main_ingredients.length">
          <div class="ing-title">主食材</div>
          <div class="ing-list"><span class="chip" v-for="i in store.detail.main_ingredients" :key="i">{{ i }}</span></div>
        </div>
        <div class="ing-block" v-if="store.detail.side_ingredients.length">
          <div class="ing-title">配菜</div>
          <div class="ing-list"><span class="chip" v-for="i in store.detail.side_ingredients" :key="i">{{ i }}</span></div>
        </div>
        <div class="ing-block" v-if="store.detail.seasonings.length">
          <div class="ing-title">配料与调料</div>
          <div class="ing-list"><span class="chip" v-for="i in store.detail.seasonings" :key="i">{{ i }}</span></div>
        </div>

        <div class="ing-block" v-if="store.detail.steps.length">
          <div class="ing-title">详细做法</div>
          <div class="steps"><div class="step" v-for="(s,idx) in store.detail.steps" :key="idx">{{ s }}</div></div>
        </div>

        <div class="section-title" style="margin-top:28px">大家的点评</div>
        <div class="review-list">
          <div v-if="loading" class="skeleton" style="height:60px"></div>
          <div v-else-if="reviews.length" class="review" v-for="r in reviews" :key="r.id">
            <div class="review-top">
              <span class="avatar" :style="avatarStyle(r.user.id)" style="width:30px;height:30px;font-size:13px">{{ r.user.username[0] }}</span>
              <span class="uname">{{ r.user.username }}</span>
              <span class="stars" v-html="starsHtml(r.rating)" style="margin-left:6px"></span>
              <span class="rtime">{{ r.created_at.slice(5,10) }} {{ r.created_at.slice(11,16) }}</span>
            </div>
            <div class="review-comment" v-if="r.comment">{{ r.comment }}</div>
            <div class="review-photo" v-if="r.photo" @click="store.lightbox=r.photo"><img :src="r.photo" alt="成品图" /></div>
          </div>
          <div v-else class="empty-state">还没有点评，尝尝看再说</div>
        </div>

        <div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap">
          <button class="btn btn-primary" style="flex:1" @click="quickOrder"><ix name="plus"/>点这道菜</button>
          <button class="btn btn-soft" @click="openReview"><ix name="star"/>点评一下</button>
        </div>
        <div v-if="store.me.role==='admin'" style="display:flex;gap:10px;margin-top:10px">
          <button class="btn btn-ghost" style="flex:1" @click="editDish"><ix name="edit"/>编辑</button>
          <button class="btn btn-ghost" style="flex:1" @click="toggleStatus">{{ store.detail.status===1 ? '下架' : '上架' }}</button>
          <button class="btn btn-ghost" style="flex:1;color:var(--danger);border-color:rgba(196,69,58,.4)" @click="removeDish"><ix name="trash"/>删除</button>
        </div>
      </div>
    </div>
  </div>
  `,
});

/* ---------------- 点菜 ---------------- */
app.component('order-modal', {
  setup() {
    const date = ref(store.order.date);
    const meal = ref(store.order.meal);
    const note = ref('');
    const selected = ref(new Set(store.order.preselect || []));
    const kw = ref('');
    const busy = ref(false);
    const onShelf = computed(() => store.dishes.filter((d) => d.status === 1));
    const filtered = computed(() => onShelf.value.filter((d) => !kw.value || d.name.includes(kw.value)));
    function toggle(id) {
      const s = selected.value;
      s.has(id) ? s.delete(id) : s.add(id);
      selected.value = new Set(s);
    }
    async function submit() {
      if (!selected.value.size) { toast('请至少选一道菜', 'err'); return; }
      busy.value = true;
      try {
        await api('/orders', { method: 'POST', body: { order_date: date.value, meal: meal.value, dish_ids: [...selected.value], note: note.value } });
        toast('已下单，婆婆这就安排');
        store.order = null;
        await Promise.all([loadToday(), loadMine()]);
      } catch (e) { toast(e.message, 'err'); } finally { busy.value = false; }
    }
    return { store, MEALS, CATS, date, meal, note, selected, kw, onShelf, filtered, toggle, submit, busy, todayStr };
  },
  template: `
  <div class="modal-mask" @click.self="store.order=null">
    <div class="modal">
      <div class="modal-head"><h3>点菜</h3><button class="icon-btn" @click="store.order=null"><ix name="close"/></button></div>
      <div class="modal-body">
        <div class="input-row">
          <div class="field" style="flex:1">
            <label>日期</label>
            <input class="input" type="date" v-model="date" :min="todayStr()" />
          </div>
          <div class="field" style="flex:1.4">
            <label>餐次</label>
            <div class="seg">
              <div v-for="m in ['breakfast','lunch','dinner']" :key="m" class="seg-item" :class="{active: meal===m}" @click="meal=m">{{ MEALS[m].label }}</div>
            </div>
          </div>
        </div>
        <div class="field" style="margin-top:4px">
          <label>选菜（已选 {{ selected.size }} 道）</label>
          <div style="position:relative;margin-bottom:10px">
            <input class="input" v-model="kw" placeholder="搜索菜品…" style="padding-left:36px" />
            <ix name="search" style="width:16px;height:16px;position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted)"/>
          </div>
          <div style="max-height:300px;overflow:auto;display:flex;flex-direction:column;gap:8px">
            <label v-for="d in filtered" :key="d.id" class="dish-tag" style="margin:0;display:flex;align-items:center;gap:10px;cursor:pointer">
              <input type="checkbox" :checked="selected.has(d.id)" @change="toggle(d.id)" style="width:17px;height:17px;accent-color:var(--tomato)" />
              <span class="dname">{{ d.name }}</span>
              <span class="cat-badge" :class="'cat-'+d.category" style="margin-left:auto">{{ CATS[d.category] }}</span>
            </label>
            <div v-if="!filtered.length" class="empty-state">没有匹配的菜</div>
          </div>
        </div>
        <div class="field">
          <label>备注（可选，如口味、忌口）</label>
          <textarea class="textarea" v-model="note" placeholder="例如：少放辣、鱼汤清淡一点…"></textarea>
        </div>
        <button class="btn btn-primary btn-block btn-lg" :disabled="busy || !selected.size" @click="submit">
          {{ busy ? '下单中…' : '确认点菜' }}
        </button>
      </div>
    </div>
  </div>
  `,
});

/* ---------------- 点评 ---------------- */
app.component('review-modal', {
  setup() {
    const dishId = ref(store.review ? store.review.dish_id : null);
    const rating = ref(0);
    const comment = ref('');
    const photo = ref('');
    const uploading = ref(false);
    const busy = ref(false);
    const existed = computed(() => store.myReviews.find((r) => r.dish_id === dishId.value));
    if (existed.value) { rating.value = existed.value.rating; comment.value = existed.value.comment; photo.value = existed.value.photo || ''; }
    async function onPick(e) {
      const f = e.target.files[0];
      if (!f) return;
      uploading.value = true;
      try { photo.value = await uploadFile(f); toast('图片已上传'); }
      catch (err) { toast(err.message, 'err'); } finally { uploading.value = false; }
    }
    async function submit() {
      if (!dishId.value) { toast('请选择菜品', 'err'); return; }
      if (!rating.value) { toast('请给个评分', 'err'); return; }
      busy.value = true;
      try {
        await api('/reviews', { method: 'POST', body: { dish_id: dishId.value, rating: rating.value, comment: comment.value, photo: photo.value } });
        toast(existed.value ? '已更新点评' : '感谢点评');
        store.review = null;
        await Promise.all([loadMine(), loadDishes()]);
        if (store.detail) store.detail = store.dishes.find((x) => x.id === store.detail.id) || store.detail;
      } catch (e) { toast(e.message, 'err'); } finally { busy.value = false; }
    }
    return { store, CATS, dishId, rating, comment, photo, uploading, busy, existed, onPick, submit };
  },
  template: `
  <div class="modal-mask" @click.self="store.review=null">
    <div class="modal">
      <div class="modal-head"><h3>点评 · 晒成品</h3><button class="icon-btn" @click="store.review=null"><ix name="close"/></button></div>
      <div class="modal-body">
        <div class="field">
          <label>菜品</label>
          <select class="select" v-model="dishId">
            <option :value="null" disabled>选择要点评的菜</option>
            <option v-for="d in store.dishes" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>评分（{{ existed ? '将更新你的历史点评' : '第一次给这道菜打分' }}）</label>
          <div class="star-input">
            <button v-for="i in 5" :key="i" :class="{on: rating>=i}" @click="rating=i"><ix name="star" style="width:26px;height:26px;fill:currentColor;stroke:none"/></button>
          </div>
        </div>
        <div class="field">
          <label>一句话点评</label>
          <textarea class="textarea" v-model="comment" placeholder="好吃吗？咸淡如何？想对婆婆说什么…"></textarea>
        </div>
        <div class="field">
          <label>晒一晒成品图（婆婆做好的样子）</label>
          <div class="upload-box">
            <img v-if="photo" :src="photo" alt="成品图预览" />
            <div v-else class="ph"><ix name="camera"/><span>{{ uploading ? '上传中…' : '点击上传成品图' }}</span></div>
            <input type="file" accept="image/*" @change="onPick" :disabled="uploading" />
          </div>
        </div>
        <button class="btn btn-primary btn-block btn-lg" :disabled="busy || uploading" @click="submit">{{ busy ? '提交中…' : '提交点评' }}</button>
      </div>
    </div>
  </div>
  `,
});

/* ---------------- 我的 ---------------- */
app.component('mine-view', {
  setup() {
    const ordered = computed(() => new Set(store.myOrders.flatMap((o) => o.dishes.map((d) => d.id))).size);
    async function delOrder(o) {
      if (!confirm('删除这条点菜记录？')) return;
      try { await api('/orders/' + o.id, { method: 'DELETE' }); toast('已删除'); await Promise.all([loadMine(), loadToday()]); }
      catch (e) { toast(e.message, 'err'); }
    }
    function openDetail(dish) { store.detail = dish; }
    function openOrder(meal) { store.order = { date: todayStr(), meal, preselect: [] }; }
    async function logout() {
      await api('/auth/logout', { method: 'POST' });
      store.me = null; store.route = 'login';
    }
    return { store, MEALS, CATS, ordered, delOrder, openDetail, openOrder, logout, avatarStyle, starsHtml, fmtDate };
  },
  template: `
  <div>
    <div class="card profile-card">
      <span class="avatar" :style="avatarStyle(store.me.id)">{{ store.me.username[0] }}</span>
      <div style="flex:1">
        <div class="profile-name">{{ store.me.username }}</div>
        <div style="margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="role-badge" :class="store.me.role==='admin'?'role-admin':'role-user'">{{ store.me.role==='admin' ? '管理员' : '家庭成员' }}</span>
          <span style="font-size:12px;color:var(--muted)">加入于 {{ store.me.created_at.slice(0,10) }}</span>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" @click="store.passwordOpen=true">修改密码</button>
    </div>

    <div class="stat-row">
      <div class="stat"><b>{{ store.myOrders.length }}</b><span>点菜次数</span></div>
      <div class="stat"><b>{{ ordered }}</b><span>点过的菜</span></div>
      <div class="stat"><b>{{ store.myReviews.length }}</b><span>我的点评</span></div>
    </div>

    <div class="list-block">
      <div class="section-title">我的点菜记录</div>
      <div class="card">
        <div v-if="store.myOrders.length" class="order-item" v-for="o in store.myOrders" :key="o.id">
          <div class="head">
            <span class="meal-tag" :style="{background: MEALS[o.meal].grad}">{{ MEALS[o.meal].label }}</span>
            <span class="order-date">{{ o.order_date }}</span>
            <span style="font-size:12px;color:var(--muted);margin-left:auto">{{ o.created_at.slice(11,16) }} 下单</span>
            <button class="icon-btn" style="width:28px;height:28px" @click="delOrder(o)" title="删除"><ix name="trash" style="width:15px;height:15px"/></button>
          </div>
          <div class="order-dishes">
            <span class="chip" v-for="d in o.dishes" :key="d.id" @click="openDetail(d)" style="cursor:pointer">{{ d.name }}</span>
          </div>
          <div class="order-note" v-if="o.note">备注：{{ o.note }}</div>
          <div v-if="!store.myOrders.length" style="padding:14px;text-align:center;color:var(--muted)"></div>
        </div>
        <div v-else class="empty-state" style="margin:14px">
          <ix name="empty"/><div>还没有点过菜</div>
          <button class="btn btn-soft btn-sm" @click="openOrder('lunch')">去点一顿</button>
        </div>
      </div>
    </div>

    <div class="list-block">
      <div class="section-title">我的点评</div>
      <div class="card">
        <div v-if="store.myReviews.length" class="review" style="border:none;border-radius:0;border-bottom:1px solid var(--line);background:transparent" v-for="r in store.myReviews" :key="r.id">
          <div class="review-top">
            <span class="stars" v-html="starsHtml(r.rating)"></span>
            <span class="uname" style="color:var(--ink-soft)">{{ r.dish ? r.dish.name : '菜品已删除' }}</span>
            <span class="rtime">{{ r.created_at.slice(0,10) }}</span>
          </div>
          <div class="review-comment" v-if="r.comment">{{ r.comment }}</div>
          <div class="review-photo" v-if="r.photo" @click="store.lightbox=r.photo"><img :src="r.photo" alt="成品图"/></div>
        </div>
        <div v-else class="empty-state" style="margin:14px">
          <ix name="empty"/><div>还没有点评，尝尝看吧</div>
        </div>
      </div>
    </div>

    <div style="margin-top:26px;text-align:center">
      <button class="btn btn-ghost" @click="logout"><ix name="logout"/>退出登录</button>
    </div>
  </div>
  `,
});

/* ---------------- 管理 ---------------- */
app.component('admin-view', {
  setup() {
    function newDish() { store.dishForm = { mode: 'new', name: '', category: 'lunch', image: '', description: '', main_ingredients: [], side_ingredients: [], seasonings: [], steps: [] }; }
    function editDish(d) { store.dishForm = { mode: 'edit', id: d.id, name: d.name, category: d.category, image: d.image || '', description: d.description || '', main_ingredients: [...d.main_ingredients], side_ingredients: [...d.side_ingredients], seasonings: [...d.seasonings], steps: [...d.steps] }; }
    async function toggle(d) {
      try {
        await api('/dishes/' + d.id + '/status', { method: 'POST', body: { status: d.status === 1 ? 0 : 1 } });
        toast(d.status === 1 ? '已下架' : '已上架');
        await loadDishes();
      } catch (e) { toast(e.message, 'err'); }
    }
    async function removeDish(d) {
      if (!confirm(`确定删除「${d.name}」吗？相关点评也会删除。`)) return;
      try { await api('/dishes/' + d.id, { method: 'DELETE' }); toast('已删除'); await loadDishes(); }
      catch (e) { toast(e.message, 'err'); }
    }
    async function setRole(u) {
      const to = u.role === 'admin' ? 'user' : 'admin';
      if (to === 'user' && u.id === store.me.id) return;
      try { await api('/users/' + u.id + '/role', { method: 'POST', body: { role: to } }); toast(to === 'admin' ? `已将 ${u.username} 设为管理员` : `已取消 ${u.username} 的管理员权限`); await loadUsers(); }
      catch (e) { toast(e.message, 'err'); }
    }
    async function delOrder(o) {
      if (!confirm('删除这条订单？')) return;
      try { await api('/orders/' + o.id, { method: 'DELETE' }); toast('已删除'); await Promise.all([loadAllOrders(), loadToday()]); }
      catch (e) { toast(e.message, 'err'); }
    }
    async function openDetail(dish) { store.detail = dish; }
    return { store, CATS, MEALS, newDish, editDish, toggle, removeDish, setRole, delOrder, openDetail, avatarStyle };
  },
  template: `
  <div>
    <h2 style="font-size:28px">厨房管理</h2>
    <div class="admin-tabs" style="margin-top:14px">
      <button class="filter-btn" :class="{active:store.adminTab==='dishes'}" @click="store.adminTab='dishes'">菜品管理</button>
      <button class="filter-btn" :class="{active:store.adminTab==='users'}" @click="store.adminTab='users'">成员授权</button>
      <button class="filter-btn" :class="{active:store.adminTab==='orders'}" @click="store.adminTab='orders'">全部订单</button>
    </div>

    <!-- 菜品管理 -->
    <div v-if="store.adminTab==='dishes'">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="color:var(--muted);font-size:13.5px">共 {{ store.dishes.length }} 道菜 · 只有管理员能上新、下架与编辑</span>
        <button class="btn btn-primary btn-sm" @click="newDish"><ix name="plus"/>上新菜</button>
      </div>
      <div class="card">
        <div class="dish-row" v-for="d in store.dishes" :key="d.id">
          <img v-if="d.image" class="thumb" :src="d.image" :alt="d.name" />
          <div v-else class="thumb ph">{{ d.name[0] }}</div>
          <div class="info" @click="openDetail(d)" style="cursor:pointer">
            <div class="n">{{ d.name }} <span class="cat-badge" :class="'cat-'+d.category" style="margin-left:6px">{{ CATS[d.category] }}</span></div>
            <div class="m">{{ d.main_ingredients.length }} 种食材 · {{ d.steps.length }} 步做法 · {{ d.review_count }} 条点评</div>
          </div>
          <div class="ops">
            <button class="switch" :class="d.status===1?'on':'off'" :title="d.status===1?'下架':'上架'" @click="toggle(d)"></button>
            <button class="btn btn-ghost btn-sm" @click="editDish(d)"><ix name="edit"/>编辑</button>
            <button class="btn btn-ghost btn-sm" style="color:var(--danger)" @click="removeDish(d)"><ix name="trash"/>删除</button>
          </div>
        </div>
        <div v-if="!store.dishes.length" class="empty-state" style="margin:14px"><ix name="empty"/><div>还没有菜品，先上新几道吧</div></div>
      </div>
    </div>

    <!-- 成员授权 -->
    <div v-else-if="store.adminTab==='users'">
      <div style="color:var(--muted);font-size:13.5px;margin-bottom:12px">将家庭成员设为管理员后，TA 也能上新、下架和管理菜单。</div>
      <div class="card">
        <div class="user-row" v-for="u in store.users" :key="u.id">
          <span class="avatar" :style="avatarStyle(u.id)">{{ u.username[0] }}</span>
          <div class="info">
            <div class="n">{{ u.username }} <span class="role-badge" :class="u.role==='admin'?'role-admin':'role-user'" style="margin-left:6px">{{ u.role==='admin'?'管理员':'成员' }}</span></div>
            <div class="m">加入于 {{ u.created_at.slice(0,10) }} · ID {{ u.id }}</div>
          </div>
          <button v-if="u.id!==store.me.id" class="btn btn-sm" :class="u.role==='admin' ? 'btn-ghost' : 'btn-primary'" @click="setRole(u)">
            {{ u.role==='admin' ? '取消管理员' : '设为管理员' }}
          </button>
          <span v-else style="font-size:12px;color:var(--muted)">（当前账号）</span>
        </div>
      </div>
    </div>

    <!-- 全部订单 -->
    <div v-else>
      <div style="color:var(--muted);font-size:13.5px;margin-bottom:12px">全家人所有日期的点菜记录，方便回看与清理。</div>
      <div class="card">
        <div class="order-item" v-for="o in store.allOrders" :key="o.id">
          <div class="head">
            <span class="meal-tag" :style="{background: MEALS[o.meal].grad}">{{ MEALS[o.meal].label }}</span>
            <span class="order-date">{{ o.order_date }}</span>
            <span class="uname" style="font-size:13px;color:var(--ink-soft)">by {{ o.user.username }}</span>
            <span style="font-size:12px;color:var(--muted);margin-left:auto">{{ o.created_at.slice(5,16) }}</span>
            <button class="icon-btn" style="width:28px;height:28px" @click="delOrder(o)"><ix name="trash" style="width:15px;height:15px"/></button>
          </div>
          <div class="order-dishes">
            <span class="chip" v-for="d in o.dishes" :key="d.id">{{ d.name }}</span>
          </div>
          <div class="order-note" v-if="o.note">备注：{{ o.note }}</div>
        </div>
        <div v-if="!store.allOrders.length" class="empty-state" style="margin:14px"><ix name="empty"/><div>还没有任何订单</div></div>
      </div>
    </div>
  </div>
  `,
});

/* ---------------- 菜品编辑表单 ---------------- */
app.component('dish-form-modal', {
  setup() {
    const f = store.dishForm;
    const uploading = ref(false);
    const busy = ref(false);
    async function onPick(e) {
      const file = e.target.files[0];
      if (!file) return;
      uploading.value = true;
      try { f.image = await uploadFile(file); toast('图片已上传'); }
      catch (err) { toast(err.message, 'err'); } finally { uploading.value = false; }
    }
    function addTag(key, v) {
      const arr = v.split(/[,，、;；\n]+/).map((s) => s.trim()).filter(Boolean);
      f[key] = [...new Set([...f[key], ...arr])];
    }
    function removeTag(key, idx) { f[key].splice(idx, 1); }
    function addStep() { f.steps.push(''); }
    function removeStep(idx) { f.steps.splice(idx, 1); }
    async function submit() {
      if (!f.name.trim()) { toast('请填写菜名', 'err'); return; }
      busy.value = true;
      try {
        if (f.mode === 'new') await api('/dishes', { method: 'POST', body: f });
        else await api('/dishes/' + f.id, { method: 'PUT', body: f });
        toast(f.mode === 'new' ? '上新成功' : '已保存');
        store.dishForm = null;
        await loadDishes();
        if (store.detail) store.detail = store.dishes.find((x) => x.id === (f.id || store.detail.id)) || store.detail;
      } catch (e) { toast(e.message, 'err'); } finally { busy.value = false; }
    }
    return { f, CATS, uploading, busy, onPick, addTag, removeTag, addStep, removeStep, submit };
  },
  template: `
  <div class="modal-mask" @click.self="store.dishForm=null">
    <div class="modal">
      <div class="modal-head"><h3>{{ f.mode==='new' ? '上新菜' : '编辑菜品' }}</h3><button class="icon-btn" @click="store.dishForm=null"><ix name="close"/></button></div>
      <div class="modal-body">
        <div class="field">
          <label>菜名</label>
          <input class="input" v-model="f.name" placeholder="例如：西红柿炒鸡蛋" />
        </div>
        <div class="field">
          <label>适合餐次</label>
          <div class="seg">
            <div v-for="(c,k) in CATS" :key="k" class="seg-item" :class="{active: f.category===k}" @click="f.category=k">{{ c }}</div>
          </div>
        </div>
        <div class="field">
          <label>菜品图片</label>
          <div class="upload-box">
            <img v-if="f.image" :src="f.image" alt="预览" />
            <div v-else class="ph"><ix name="camera"/><span>{{ uploading ? '上传中…' : '点击上传成品 / 参考图' }}</span></div>
            <input type="file" accept="image/*" @change="onPick" :disabled="uploading" />
          </div>
        </div>
        <div class="field">
          <label>一句话介绍</label>
          <input class="input" v-model="f.description" placeholder="这道菜的亮点、口味…" />
        </div>
        <div class="field">
          <label>主食材（输入后按回车或逗号添加）</label>
          <div class="input-row">
            <input class="input" placeholder="如：西红柿、鸡蛋" @keyup.enter="addTag('main_ingredients',$event.target.value);$event.target.value=''"
              @blur="addTag('main_ingredients',$event.target.value);$event.target.value=''" />
          </div>
          <div class="ing-list" style="margin-top:8px"><span class="chip" v-for="(t,i) in f.main_ingredients" :key="i">{{ t }} <a @click="removeTag('main_ingredients',i)" style="cursor:pointer;margin-left:4px;color:var(--tomato)">×</a></span></div>
        </div>
        <div class="field">
          <label>配菜</label>
          <div class="input-row">
            <input class="input" placeholder="如：木耳、胡萝卜" @keyup.enter="addTag('side_ingredients',$event.target.value);$event.target.value=''"
              @blur="addTag('side_ingredients',$event.target.value);$event.target.value=''" />
          </div>
          <div class="ing-list" style="margin-top:8px"><span class="chip" v-for="(t,i) in f.side_ingredients" :key="i">{{ t }} <a @click="removeTag('side_ingredients',i)" style="cursor:pointer;margin-left:4px;color:var(--tomato)">×</a></span></div>
        </div>
        <div class="field">
          <label>配料与调料</label>
          <div class="input-row">
            <input class="input" placeholder="如：盐、生抽、姜、蒜" @keyup.enter="addTag('seasonings',$event.target.value);$event.target.value=''"
              @blur="addTag('seasonings',$event.target.value);$event.target.value=''" />
          </div>
          <div class="ing-list" style="margin-top:8px"><span class="chip" v-for="(t,i) in f.seasonings" :key="i">{{ t }} <a @click="removeTag('seasonings',i)" style="cursor:pointer;margin-left:4px;color:var(--tomato)">×</a></span></div>
        </div>
        <div class="field">
          <label>详细做法</label>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div class="input-row" v-for="(s,i) in f.steps" :key="i">
              <span class="chip" style="flex:0 0 auto;justify-content:center;width:34px">{{ i+1 }}</span>
              <textarea class="textarea" v-model="f.steps[i]" :placeholder="'步骤 ' + (i+1)" style="min-height:52px"></textarea>
              <button class="icon-btn" style="flex:0 0 auto;align-self:flex-start" @click="removeStep(i)"><ix name="close" style="width:15px;height:15px"/></button>
            </div>
            <button class="btn btn-ghost btn-sm" @click="addStep"><ix name="plus"/>添加一步</button>
          </div>
        </div>
        <button class="btn btn-primary btn-block btn-lg" :disabled="busy || uploading" @click="submit">{{ busy ? '保存中…' : (f.mode==='new' ? '上新' : '保存修改') }}</button>
      </div>
    </div>
  </div>
  `,
});

/* ---------------- 修改密码 ---------------- */
app.component('password-modal', {
  setup() {
    const oldP = ref('');
    const newP = ref('');
    const newP2 = ref('');
    const busy = ref(false);
    async function submit() {
      if (newP.value.length < 6) { toast('新密码至少 6 位', 'err'); return; }
      if (newP.value !== newP2.value) { toast('两次新密码不一致', 'err'); return; }
      busy.value = true;
      try { await api('/auth/password', { method: 'POST', body: { oldPassword: oldP.value, newPassword: newP.value } }); toast('密码已修改'); store.passwordOpen = false; }
      catch (e) { toast(e.message, 'err'); } finally { busy.value = false; }
    }
    return { oldP, newP, newP2, busy, submit };
  },
  template: `
  <div class="modal-mask" @click.self="store.passwordOpen=false">
    <div class="modal">
      <div class="modal-head"><h3>修改密码</h3><button class="icon-btn" @click="store.passwordOpen=false"><ix name="close"/></button></div>
      <div class="modal-body">
        <div class="field"><label>原密码</label><input class="input" type="password" v-model="oldP" /></div>
        <div class="field"><label>新密码</label><input class="input" type="password" v-model="newP" placeholder="至少 6 位" /></div>
        <div class="field"><label>确认新密码</label><input class="input" type="password" v-model="newP2" /></div>
        <button class="btn btn-primary btn-block" :disabled="busy" @click="submit">{{ busy ? '提交中…' : '确认修改' }}</button>
      </div>
    </div>
  </div>
  `,
});

/* ---------------- 图片查看 ---------------- */
app.component('lightbox', {
  setup() { return { store }; },
  template: `
  <div class="modal-mask" style="align-items:center;background:rgba(20,15,10,.82)" @click="store.lightbox=null">
    <img :src="store.lightbox" alt="成品图" style="max-width:92vw;max-height:86vh;border-radius:14px;box-shadow:var(--shadow-lg)" />
  </div>
  `,
});

/* ---------------- 模板共享工具（挂到全局属性，保证任意组件模板可安全引用） ---------------- */
app.config.globalProperties.avatarStyle = avatarStyle;
app.config.globalProperties.starsHtml = starsHtml;
app.config.globalProperties.go = go;
app.config.globalProperties.store = store;
app.config.globalProperties.toasts = toasts;

/* ---------------- 全局错误兜底（同时把错误写入页面，便于诊断） ---------------- */
function reportErr(msg) {
  try { document.body.setAttribute('data-app-error', String(msg).slice(0, 600)); } catch (e) {}
}
app.config.errorHandler = (err, instance, info) => {
  const m = (err && err.message) ? err.message : String(err);
  console.error('[app-error]', m, info);
  reportErr('[app-error] ' + m + ' @' + (info || 'render'));
};
window.addEventListener('error', (e) => {
  console.error('[window-error]', e.message);
  reportErr('[window-error] ' + e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  const m = (e.reason && e.reason.message) || String(e.reason);
  console.error('[unhandledrejection]', m);
  reportErr('[rejection] ' + m);
});

app.mount('#app');
