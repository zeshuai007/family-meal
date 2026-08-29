/* =========================================================
   家味 · Family Kitchen — 家庭点菜系统（前端单文件应用）
   数据全部持久化到浏览器 localStorage，部署到 1panel 静态站即可。
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- Storage ---------------- */
  const STORE_KEY = 'family_meal_store_v1';
  const DEFAULT_STORE = {
    adminPwdHash: null,          // 管理密码 sha256 哈希（可空=未设置）
    members: [                   // 默认家人（可编辑）
      { id: 'u_wife',  name: '孕妈妈',  role: 'member' },
      { id: 'u_husb',  name: '老公',    role: 'member' },
      { id: 'u_grand', name: '婆婆',    role: 'admin'  },
      { id: 'u_kid',   name: '大宝',    role: 'member' },
    ],
    currentUserId: 'u_wife',     // 当前界面使用的身份
    dishes: [],                  // 菜品
    orders: {},                  // 'YYYY-MM-DD' -> { breakfast:[{dishId,userId,note,ts}], lunch:[], dinner:[] }
    reviews: [],                 // 成品 + 点评
  };

  function clone(obj) { try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return JSON.parse(JSON.stringify(DEFAULT_STORE)); } }
  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) {
        const s = clone(DEFAULT_STORE);
        saveStore(s);
        seedDemoDishes(s);
        return s;
      }
      const parsed = JSON.parse(raw);
      const base = clone(DEFAULT_STORE);
      return Object.assign(base, parsed);
    } catch (e) {
      console.error('loadStore error:', e);
      const s = clone(DEFAULT_STORE);
      try { seedDemoDishes(s); } catch (ee) { console.error('seed fail', ee); }
      return s;
    }
  }
  function saveStore(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
    catch (e) { console.error('saveStore error:', e); toast('保存失败：浏览器存储被禁用'); }
  }

  let S = loadStore();
  const state = {
    tab: 'today',
    orderDate: todayStr(),
    search: '',
    tag: '',
    editId: null,        // 菜品编辑中
    orderMeal: null,     // 当前编辑的餐次
    reviewCtx: null,     // {orderKey?, dishId?, meal?, date?}
  };

  /* ---------------- Utils ---------------- */
  function uid(prefix='id') { return prefix + '_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4); }
  function todayStr(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function fmtDateLabel(str) {
    const d = new Date(str + 'T00:00:00');
    const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    const today = todayStr();
    const y = new Date(today + 'T00:00:00');
    const diff = Math.round((d - y) / 86400000);
    const suffix = diff===0 ? '（今天）' : diff===1 ? '（明天）' : diff===-1 ? '（昨天）' : '';
    return {
      big: `${d.getMonth()+1}月${d.getDate()}日 ${weekdays[d.getDay()]}`,
      sub: `${d.getFullYear()}年${suffix}`
    };
  }
  function shiftDate(str, days){
    const d = new Date(str + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return todayStr(d);
  }
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>el.classList.remove('show'), 1800);
  }
  async function sha256(txt) {
    const buf = new TextEncoder().encode(txt);
    const h = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function escapeHtml(str) {
    return (str ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function splitLines(t) { return (t||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean); }
  function splitCsv(t)   { return (t||'').split(/[,，]/).map(s=>s.trim()).filter(Boolean); }
  function readFileAsDataURL(file) {
    return new Promise((res,rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  function compressImage(file, maxSize=1200, quality=0.84) {
    return new Promise((res, rej) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h && w > maxSize) { h = h * (maxSize/w); w = maxSize; }
        else if (h > maxSize)      { w = w * (maxSize/h); h = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(b=>{ if(b) res(b); else rej(new Error('compress fail')); }, 'image/jpeg', quality);
      };
      img.onerror = e => { URL.revokeObjectURL(url); rej(e); };
      img.src = url;
    });
  }

  /* ---------------- Seed demo data ---------------- */
  function seedDemoDishes(s) {
    s.dishes = [
      {
        id: uid('d'), name: '番茄炖牛腩', published: true,
        image: PLACEHOLDER_IMG.food1,
        tags: ['开胃','下饭','高蛋白'],
        mainIng: ['牛腩 500g','番茄 3个（熟透为佳）'],
        sideIng: ['胡萝卜 1根','洋葱 半个'],
        season: '姜片 3片 / 八角 1个 / 生抽 2勺 / 冰糖 5粒 / 盐 少许 / 料酒 1勺',
        steps: [
          '牛腩冷水下锅，加姜片料酒焯水 5 分钟，撇去浮沫后捞出用温水冲洗干净。',
          '番茄顶部划十字，用开水烫 1 分钟剥去皮，切小块；胡萝卜、洋葱切块备用。',
          '锅中少许油，加入冰糖小火炒出糖色，下牛腩翻炒均匀上色。',
          '加入番茄块炒出红油，再放入胡萝卜、洋葱、八角、生抽、料酒翻匀。',
          '倒入没过食材的开水，大火煮沸后转小火炖 90 分钟，出锅前加盐调味即可。'
        ],
        meals: ['lunch','dinner'],
      },
      {
        id: uid('d'), name: '清蒸鲈鱼', published: true,
        image: PLACEHOLDER_IMG.food2,
        tags: ['鲜嫩','低油','孕后期友好'],
        mainIng: ['鲈鱼 1条（约 500g）'],
        sideIng: ['葱 2 根','姜 1 块'],
        season: '蒸鱼豉油 2 勺 / 食用油 2 勺 / 盐 少许 / 料酒 1 勺',
        steps: [
          '鲈鱼处理干净，两面划三刀，用少许盐与料酒腌 10 分钟。',
          '盘中铺葱段与姜片，放上鲈鱼，鱼肚内再塞入少许葱姜。',
          '水开后上锅大火蒸 8 分钟，时间到关火虚蒸 2 分钟。',
          '取出倒掉盘中汤水，铺上新葱丝与红椒丝，淋上蒸鱼豉油。',
          '烧 2 勺热油至冒烟，淋在葱丝上爆出香味即可。'
        ],
        meals: ['lunch','dinner'],
      },
      {
        id: uid('d'), name: '红枣枸杞小米粥', published: true,
        image: PLACEHOLDER_IMG.food3,
        tags: ['养胃','早餐','补铁'],
        mainIng: ['小米 80g','红枣 8 颗','枸杞 一小把'],
        sideIng: ['山药 1小段（可选）'],
        season: '冰糖 适量（或不加）',
        steps: [
          '小米淘洗干净，红枣去核，山药去皮切小丁。',
          '锅中加 1000ml 水烧开，加入小米、红枣、山药丁。',
          '大火煮沸后转小火慢煮 30 分钟，期间搅拌几次防止糊底。',
          '出锅前 2 分钟加入枸杞与冰糖，搅拌均匀即可享用。'
        ],
        meals: ['breakfast','lunch'],
      },
      {
        id: uid('d'), name: '玉米胡萝卜排骨汤', published: true,
        image: PLACEHOLDER_IMG.food4,
        tags: ['清淡','汤品','补钙'],
        mainIng: ['猪肋排 400g','玉米 1 根','胡萝卜 1 根'],
        sideIng: ['莲藕 1 节（可选）'],
        season: '姜片 3 片 / 葱段 1 段 / 盐 适量 / 料酒 1 勺',
        steps: [
          '排骨冷水下锅，加姜片料酒焯水 5 分钟，捞出冲洗干净。',
          '玉米切段，胡萝卜去皮切滚刀块，莲藕去皮切块。',
          '炖锅中放入排骨、玉米、胡萝卜、莲藕，加满开水。',
          '大火煮沸转最小火慢炖 70 分钟。',
          '出锅前加盐调味，再撒一把葱花即可。'
        ],
        meals: ['lunch','dinner'],
      },
      {
        id: uid('d'), name: '虾仁滑蛋', published: true,
        image: PLACEHOLDER_IMG.food5,
        tags: ['蛋白质','嫩滑','快手'],
        mainIng: ['鸡蛋 3 个','新鲜虾仁 150g'],
        sideIng: ['葱花 适量'],
        season: '盐 少许 / 白胡椒粉 少许 / 牛奶 2 勺 / 水淀粉 半勺',
        steps: [
          '虾仁开背去虾线，加少许盐和白胡椒粉抓匀腌 10 分钟。',
          '鸡蛋打散，加入牛奶、水淀粉、少许盐搅拌均匀。',
          '平底锅油热，先下虾仁滑炒至变色，约 7 分熟捞出。',
          '锅中再加一点油，倒入蛋液，小火慢慢推炒至半凝固。',
          '倒回虾仁快速翻炒均匀，撒葱花出锅。'
        ],
        meals: ['breakfast','lunch','dinner'],
      },
      {
        id: uid('d'), name: '青菜蘑菇豆腐羹', published: true,
        image: PLACEHOLDER_IMG.food6,
        tags: ['清淡','素食','助消化'],
        mainIng: ['嫩豆腐 1 盒','小白菜 1 小把','鲜蘑菇 6 朵'],
        sideIng: ['枸杞 少许（点缀）'],
        season: '盐 少许 / 白胡椒粉 少许 / 香油 几滴 / 水淀粉 1 勺',
        steps: [
          '豆腐切小块，蘑菇切片，小白菜切段备用。',
          '锅中加少许油炒香蘑菇片，加入适量清水煮开。',
          '放入豆腐煮 3 分钟，加入小白菜烫至变软。',
          '调入盐、白胡椒粉，淋入水淀粉勾薄芡，撒枸杞、滴香油即可。'
        ],
        meals: ['lunch','dinner'],
      },
    ];
    saveStore(s);
  }

  /* ---------------- Placeholder images (SVG data URL) ---------------- */
  const PLACEHOLDER_IMG = (() => {
    const svg = (label, c1, c2, icon) => {
      const s = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'>
        <defs>
          <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='${c1}'/>
            <stop offset='100%' stop-color='${c2}'/>
          </linearGradient>
        </defs>
        <rect width='800' height='600' fill='url(#g)'/>
        <circle cx='400' cy='300' r='200' fill='rgba(255,255,255,.14)'/>
        <text x='400' y='270' font-size='140' text-anchor='middle' font-family='sans-serif'>${icon}</text>
        <text x='400' y='400' font-size='54' text-anchor='middle' fill='rgba(255,255,255,.92)' font-family='Noto Serif SC, Songti SC, serif' font-weight='700'>${label}</text>
      </svg>`;
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
    };
    return {
      food1: svg('番茄炖牛腩', '#D56A4B', '#F2AE6C', '🍲'),
      food2: svg('清蒸鲈鱼',   '#7A9E7E', '#C5CF8E', '🐟'),
      food3: svg('红枣枸杞小米粥', '#D99C58', '#EFCB91', '🥣'),
      food4: svg('玉米胡萝卜排骨汤', '#6E8A5E', '#B7C48C', '🌽'),
      food5: svg('虾仁滑蛋',   '#E4A148', '#F1D48A', '🍤'),
      food6: svg('青菜蘑菇豆腐羹', '#5E8A7A', '#9FC3A8', '🥬'),
    };
  })();

  /* ---------------- Auth & Permission ---------------- */
  function isAdmin() {
    // 当前身份的 role === 'admin' 即视为管理员
    const user = S.members.find(m => m.id === S.currentUserId);
    return !!(user && user.role === 'admin');
  }
  function setAdminBodyClass() {
    document.body.classList.toggle('is-admin', isAdmin());
    document.querySelectorAll('.tab.admin-only').forEach(t => {
      if (t.classList.contains('active') && !isAdmin()) {
        switchTab('today');
      }
    });
  }
  async function setAdminPwd(pwd) {
    S.adminPwdHash = await sha256(pwd);
    saveStore(S);
  }
  async function verifyAdminPwd(pwd) {
    if (!S.adminPwdHash) return false;
    return (await sha256(pwd)) === S.adminPwdHash;
  }

  /* ---------------- Render: Tabs ---------------- */
  function switchTab(name) {
    state.tab = name;
    document.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.tab === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.view === name));
    if (name === 'today')    renderMeals();
    if (name === 'menu')     renderMenu();
    if (name === 'reviews')  renderReviews();
    if (name === 'admin')    renderAdmin();
    if (name === 'roles')    renderRoles();
  }

  /* ---------------- Render: User select & greeting ---------------- */
  function renderGreeting() {
    const h = new Date().getHours();
    const part = h<6 ? '凌晨好' : h<11 ? '早安' : h<14 ? '午安' : h<18 ? '下午好' : '晚上好';
    const user = S.members.find(m => m.id === S.currentUserId);
    document.getElementById('greeting').textContent =
      `${part}${user ? '，' + user.name : ''} · 要记得按时吃饭呀`;
    document.getElementById('authLabel').textContent = isAdmin() ? '管理员已登录' : '管理员登录';
  }
  function renderUserSelect() {
    const sel = document.getElementById('currentUserSelect');
    sel.innerHTML = '';
    S.members.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name + (m.role === 'admin' ? '（管理员）' : '');
      if (m.id === S.currentUserId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  /* ---------------- Render: Today Meals ---------------- */
  const MEALS_DEF = [
    { key: 'breakfast', name: '早餐', sub: '07:00 - 09:00', icon: '🌅', color: 'breakfast' },
    { key: 'lunch',     name: '午餐', sub: '11:30 - 13:00', icon: '☀️', color: 'lunch' },
    { key: 'dinner',    name: '晚餐', sub: '17:30 - 19:30', icon: '🌙', color: 'dinner' },
  ];
  function renderMeals() {
    const d = fmtDateLabel(state.orderDate);
    document.getElementById('orderDateLabel').textContent = d.big;
    document.getElementById('orderDateSub').textContent = d.sub;

    const grid = document.getElementById('mealsGrid');
    grid.innerHTML = '';
    const day = S.orders[state.orderDate] || { breakfast:[], lunch:[], dinner:[] };

    MEALS_DEF.forEach(m => {
      const items = day[m.key] || [];
      const meal = document.createElement('div');
      meal.className = 'meal ' + m.color;
      meal.innerHTML = `
        <div class="meal-head">
          <div class="meal-title">
            <div class="meal-icon">${m.icon}</div>
            <div>
              <h3>${m.name}</h3>
              <small>${m.sub}</small>
            </div>
          </div>
          <div class="meal-actions">
            <button class="btn-order" data-meal="${m.key}">+ 我要点菜</button>
          </div>
        </div>
        <ul class="order-list" data-list="${m.key}">
          ${items.length === 0 ? '<li class="empty-meal">还没有点菜哦 · 点右上角 + 挑几道喜欢的</li>' : ''}
        </ul>
      `;
      const list = meal.querySelector(`ul[data-list="${m.key}"]`);
      items.forEach((o, idx) => {
        const dish = S.dishes.find(d => d.id === o.dishId);
        if (!dish) return;
        const user = S.members.find(u => u.id === o.userId);
        const li = document.createElement('li');
        li.className = 'order-item';
        li.innerHTML = `
          <img src="${escapeHtml(dish.image)}" alt="${escapeHtml(dish.name)}" loading="lazy">
          <div class="meta">
            <div class="name">${escapeHtml(dish.name)}</div>
            <div class="by">${escapeHtml(user?.name || '某位家人')} 点的</div>
            ${o.note ? `<div class="note">· ${escapeHtml(o.note)}</div>` : ''}
          </div>
          <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-end">
            <button class="tiny-btn" data-review data-date="${state.orderDate}" data-meal="${m.key}" data-idx="${idx}">点评 🖋</button>
            ${(user && user.id === S.currentUserId) || isAdmin()
              ? `<button class="remove-order" data-remove data-date="${state.orderDate}" data-meal="${m.key}" data-idx="${idx}" title="删除此点菜">×</button>`
              : ''}
          </div>
        `;
        list.appendChild(li);
      });
      grid.appendChild(meal);
    });
  }

  /* ---------------- Render: Menu ---------------- */
  function renderMenu() {
    const q = state.search.trim().toLowerCase();
    const allTags = new Set();
    S.dishes.filter(d => d.published).forEach(d => (d.tags || []).forEach(t => allTags.add(t)));
    const chipsEl = document.getElementById('tagChips');
    chipsEl.innerHTML = '';
    const allChip = document.createElement('div');
    allChip.className = 'chip' + (state.tag === '' ? ' active' : '');
    allChip.textContent = '全部';
    allChip.onclick = () => { state.tag = ''; renderMenu(); };
    chipsEl.appendChild(allChip);
    [...allTags].slice(0,16).forEach(tag => {
      const c = document.createElement('div');
      c.className = 'chip' + (state.tag === tag ? ' active' : '');
      c.textContent = tag;
      c.onclick = () => { state.tag = state.tag === tag ? '' : tag; renderMenu(); };
      chipsEl.appendChild(c);
    });

    const grid = document.getElementById('dishGrid');
    grid.innerHTML = '';
    const list = S.dishes.filter(d => {
      if (!d.published && !isAdmin()) return false;
      if (state.tag && !(d.tags||[]).includes(state.tag)) return false;
      if (!q) return true;
      const hay = [d.name, (d.tags||[]).join(' '), (d.mainIng||[]).join(' '), (d.sideIng||[]).join(' '), d.season||'']
        .join(' ').toLowerCase();
      return hay.includes(q);
    });
    if (list.length === 0) {
      grid.innerHTML = `<div class="empty-meal" style="grid-column:1/-1">暂无菜品 ${q || state.tag ? '，换个关键词试试吧' : '，请管理员先到「管理台」添加菜品'}。</div>`;
      return;
    }
    list.forEach(d => {
      const avg = avgScore(d.id);
      const card = document.createElement('div');
      card.className = 'dish-card';
      card.innerHTML = `
        <div class="dish-thumb" style="background-image:url('${escapeCssUrl(d.image)}')">
          ${d.published ? '' : '<span class="dish-off-tag">已下架 · 仅管理员可见</span>'}
        </div>
        <div class="dish-body">
          <h3>${escapeHtml(d.name)}</h3>
          <div class="dish-tags">
            ${(d.tags||[]).slice(0,4).map(t=>`<span class="dish-tag">${escapeHtml(t)}</span>`).join('')}
          </div>
          <div class="dish-ing-peek">主食材：${escapeHtml((d.mainIng||[]).slice(0,3).join('、') || '—')}</div>
          <div class="dish-foot">
            <button class="link-btn" data-detail="${d.id}">查看做法 →</button>
            <div class="avg-score">
              <span class="stars">${renderStars(avg, 12)}</span>
              <span>${avg.toFixed(1)}</span>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }
  function escapeCssUrl(u) { return String(u).replace(/'/g, "%27"); }

  /* ---------------- Render: Admin dish list ---------------- */
  function renderAdmin() {
    const wrap = document.getElementById('adminDishList');
    wrap.innerHTML = '';
    if (S.dishes.length === 0) {
      wrap.innerHTML = `<div class="empty-meal">还没有菜品 · 点右上角「＋ 新增菜品」开始。</div>`;
      return;
    }
    S.dishes.forEach(d => {
      const el = document.createElement('div');
      el.className = 'admin-row';
      el.innerHTML = `
        <img src="${escapeHtml(d.image)}" alt="">
        <div>
          <div class="ar-name">${escapeHtml(d.name)} ${d.published
            ? '<span class="tag-on tiny-btn" style="cursor:default">已上架</span>'
            : '<span class="tag-off tiny-btn" style="cursor:default">已下架</span>'}
          </div>
          <div class="ar-sub">${(d.tags||[]).slice(0,5).join(' · ') || '暂无标签'} · 适合：${(d.meals||[]).map(mealLabel).join('/') || '全天'}</div>
        </div>
        <div class="ar-actions">
          <button class="tiny-btn" data-edit="${d.id}">编辑</button>
          <button class="tiny-btn" data-toggle="${d.id}">${d.published ? '下架' : '上架'}</button>
          <button class="tiny-btn danger" data-del="${d.id}">删除</button>
        </div>
      `;
      wrap.appendChild(el);
    });
  }
  function mealLabel(k) { return ({breakfast:'早',lunch:'午',dinner:'晚'})[k] || k; }

  /* ---------------- Render: Roles ---------------- */
  function renderRoles() {
    const list = document.getElementById('memberList');
    list.innerHTML = '';
    S.members.forEach(m => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <span class="who-badge">${escapeHtml(m.name)}</span>
          <span class="muted" style="margin-left:10px">${m.role === 'admin' ? '管理员' : '普通成员'}</span>
        </div>
        <div>
          ${m.id !== S.currentUserId ? `<button class="tiny-btn danger" data-del-member="${m.id}">移除</button>` : '<span class="muted">当前</span>'}
        </div>
      `;
      list.appendChild(li);
    });
    const alist = document.getElementById('authList');
    alist.innerHTML = '';
    S.members.forEach(m => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="who-badge">${escapeHtml(m.name)}</span>
        <label style="display:inline-flex; align-items:center; gap:8px">
          <input type="checkbox" data-role="${m.id}" ${m.role === 'admin' ? 'checked' : ''}/>
          <span>${m.role === 'admin' ? '是管理员' : '普通成员'}</span>
        </label>
      `;
      alist.appendChild(li);
    });
  }

  /* ---------------- Render: Reviews ---------------- */
  function avgScore(dishId) {
    const rs = S.reviews.filter(r => r.dishId === dishId);
    if (rs.length === 0) return 0;
    return rs.reduce((a,r) => a + (r.score || 0), 0) / rs.length;
  }
  function renderStars(score, size=16) {
    const full = Math.floor(score);
    const half = score - full >= 0.25 && score - full < 0.75;
    const round = score - full >= 0.75 ? full + 1 : full;
    const total = 5;
    let html = '';
    for (let i=0;i<round;i++) html += '★';
    if (half && round < 5) { html += '☆'; }
    for (let i=(half?round+1:round); i<total; i++) html += '☆';
    return `<span style="font-size:${size}px; color:var(--gold); letter-spacing:1px">${html}</span>`;
  }
  function renderReviews() {
    const wrap = document.getElementById('reviewBoard');
    wrap.innerHTML = '';
    const list = [...S.reviews].sort((a,b) => (b.ts||0) - (a.ts||0));
    if (list.length === 0) {
      wrap.innerHTML = `<div class="empty-meal" style="padding:40px">婆婆还没有上传成品哦，等第一道菜端出来就来记录吧！</div>`;
      return;
    }
    list.forEach(r => {
      const dish = S.dishes.find(d => d.id === r.dishId);
      const user = S.members.find(u => u.id === r.userId);
      const d = new Date(r.ts || 0);
      const tsStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML = `
        ${r.images && r.images[0] ? `<img class="rc-img" src="${escapeHtml(r.images[0])}" alt="成品图" loading="lazy"/>` : ''}
        ${r.images && r.images.length > 1 ? `<div style="display:grid; grid-template-columns:repeat(${Math.min(r.images.length-1,3)},1fr); gap:6px">${r.images.slice(1,4).map(src=>`<img src="${escapeHtml(src)}" class="rc-img" style="aspect-ratio:1/1;margin:0"/>`).join('')}</div>` : ''}
        <div class="rc-dish">${escapeHtml(dish?.name || '（菜品已删除）')}</div>
        <div class="rc-meta">
          <span>${escapeHtml(r.date || '')} · ${({breakfast:'早餐',lunch:'午餐',dinner:'晚餐'})[r.meal] || ''}</span>
          <span class="rc-rc">${renderStars(r.score || 0, 14)} <b style="color:var(--ink)">${(r.score||0).toFixed(1)}</b></span>
        </div>
        ${r.text ? `<div class="rc-text">${escapeHtml(r.text).replace(/\n/g,'<br/>')}</div>` : ''}
        <div class="rc-by">评分人：${escapeHtml(user?.name || '匿名')} · ${tsStr}</div>
      `;
      wrap.appendChild(card);
    });
  }

  /* ---------------- Dish Detail ---------------- */
  function openDishDetail(id) {
    const d = S.dishes.find(x => x.id === id);
    if (!d) return;
    const avg = avgScore(d.id);
    const total = S.reviews.filter(r => r.dishId === d.id).length;
    const body = document.getElementById('dishModalBody');
    body.innerHTML = `
      <div class="dm-top">
        <img class="dm-cover" src="${escapeHtml(d.image)}" alt="${escapeHtml(d.name)}"/>
        <div class="dm-info">
          <h2>${escapeHtml(d.name)}</h2>
          <div style="color:var(--ink-2); font-size:13px;">${renderStars(avg, 16)} <b>${avg.toFixed(1)}</b> · 共 ${total} 条点评 · 适合：${(d.meals||[]).map(mealLabelLong).join(' / ') || '全天'}</div>
          <div class="dm-meta">
            ${(d.tags||[]).map(t=>`<span class="dish-tag">${escapeHtml(t)}</span>`).join('')}
          </div>
          <div class="block">
            <h4>主食材</h4>
            <ul class="pill-list">${(d.mainIng||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('') || '<li class="muted">未填写</li>'}</ul>
          </div>
          <div class="block">
            <h4>配菜</h4>
            <ul class="pill-list">${(d.sideIng||[]).map(x=>`<li class="green">${escapeHtml(x)}</li>`).join('') || '<li class="muted">未填写</li>'}</ul>
          </div>
          <div class="block">
            <h4>配料 / 调料</h4>
            <div style="background:#fff; border:1px solid var(--line); padding:10px 12px; border-radius:12px; color:var(--ink); line-height:1.7">${escapeHtml(d.season || '—')}</div>
          </div>
        </div>
      </div>
      <div class="block" style="margin-top:18px">
        <h4>详细做法</h4>
        <ol class="step-list">${(d.steps||[]).map(s=>`<li>${escapeHtml(s)}</li>`).join('') || '<li class="muted">暂无做法步骤</li>'}</ol>
      </div>
      <div class="dm-footer">
        <button class="ghost-btn" data-close="dishModal">关闭</button>
        ${(d.meals||[]).length ? `<button class="primary-btn" id="dmOrderBtn">🍽 把这道菜加到…</button>` : ''}
        ${isAdmin() ? `<button class="ghost-btn" id="dmEditBtn" data-close="dishModal">✎ 管理员编辑</button>` : ''}
      </div>
    `;
    showModal('dishModal');
    const orderBtn = document.getElementById('dmOrderBtn');
    if (orderBtn) orderBtn.onclick = () => {
      hideModal('dishModal');
      openOrderModalForDish(d.id);
    };
    const editBtn = document.getElementById('dmEditBtn');
    if (editBtn) editBtn.onclick = () => setTimeout(()=>openDishEditor(d.id), 150);
  }
  function mealLabelLong(k) { return ({breakfast:'早餐',lunch:'午餐',dinner:'晚餐'})[k] || k; }

  /* ---------------- Dish Editor ---------------- */
  function openDishEditor(id) {
    state.editId = id || null;
    const d = id ? S.dishes.find(x => x.id === id) : null;
    document.getElementById('editTitle').textContent = d ? '编辑菜品' : '新增菜品';
    document.getElementById('fName').value = d?.name || '';
    document.getElementById('fTags').value = (d?.tags||[]).join(', ');
    document.getElementById('fMainIng').value = (d?.mainIng||[]).join('\n');
    document.getElementById('fSideIng').value = (d?.sideIng||[]).join('\n');
    document.getElementById('fSeason').value  = d?.season || '';
    document.getElementById('fSteps').value   = (d?.steps||[]).join('\n');
    document.getElementById('fImageUrl').value= d && !d.image.startsWith('data:') ? d.image : '';
    document.getElementById('fPublished').checked = d ? !!d.published : true;
    document.querySelectorAll('input[name=fMeal]').forEach(cb => {
      cb.checked = d ? (d.meals||[]).includes(cb.value) : cb.value !== 'breakfast';
    });
    const prev = document.getElementById('imgPreview');
    prev.innerHTML = d ? `<img src="${escapeHtml(d.image)}" alt=""/>` : `<div class="img-placeholder">点击左侧选择图片 · 或粘贴图片URL</div>`;
    document.getElementById('fImage').value = '';
    showModal('editModal');
  }

  /* ---------------- Order Modal ---------------- */
  function openOrderModal(mealKey) {
    state.orderMeal = mealKey;
    const m = MEALS_DEF.find(x => x.key === mealKey);
    const body = document.getElementById('orderModalBody');
    body.innerHTML = `
      <div class="om-head">
        <h2>为 <span style="color:var(--accent)">${m.name}</span> 点菜 · ${state.orderDate}</h2>
        <input class="om-search" id="omSearch" placeholder="搜菜名、食材…"/>
      </div>
      <div class="om-picks" id="omPicks">
        <span class="muted" id="omEmpty">还没选菜，从下面挑几道吧～</span>
      </div>
      <div class="om-note">
        <input id="omNote" placeholder="特殊备注（例如：少盐 / 多放姜 / 不要辣）" maxlength="60"/>
      </div>
      <div class="om-list" id="omList"></div>
      <div class="om-foot">
        <button class="ghost-btn" data-close="orderModal">取消</button>
        <button class="primary-btn" id="omConfirm">确认点菜</button>
      </div>
    `;
    renderOMList('');
    const picks = new Set();
    const renderPicks = () => {
      const box = document.getElementById('omPicks');
      if (picks.size === 0) {
        box.innerHTML = `<span class="muted" id="omEmpty">还没选菜，从下面挑几道吧～</span>`;
      } else {
        box.innerHTML = '';
        [...picks].forEach(id => {
          const d = S.dishes.find(x => x.id === id);
          const chip = document.createElement('span');
          chip.className = 'sel';
          chip.innerHTML = `${escapeHtml(d?.name||'?')} <button title="移除">×</button>`;
          chip.querySelector('button').onclick = (e) => { e.stopPropagation(); picks.delete(id); renderPicks(); };
          box.appendChild(chip);
        });
      }
    };
    function renderOMList(q) {
      const qq = q.trim().toLowerCase();
      const list = S.dishes.filter(d => d.published && (qq
        ? [d.name, (d.tags||[]).join(' '), (d.mainIng||[]).join(' ')].join(' ').toLowerCase().includes(qq)
        : true));
      const box = document.getElementById('omList');
      box.innerHTML = '';
      if (list.length === 0) { box.innerHTML = `<div class="muted" style="padding:12px">没有找到菜品</div>`; return; }
      list.forEach(d => {
        const el = document.createElement('div');
        el.className = 'om-dish';
        if (picks.has(d.id)) el.style.background = 'var(--accent-soft)';
        el.innerHTML = `
          <img src="${escapeHtml(d.image)}" alt="">
          <div>
            <div class="n">${escapeHtml(d.name)}</div>
            <div class="t">${(d.tags||[]).slice(0,3).join(' · ') || (d.mainIng||[]).slice(0,2).join(' · ') || '—'}</div>
          </div>
        `;
        el.onclick = () => {
          if (picks.has(d.id)) picks.delete(d.id); else picks.add(d.id);
          renderPicks();
          el.style.background = picks.has(d.id) ? 'var(--accent-soft)' : '#fff';
        };
        box.appendChild(el);
      });
    }
    document.getElementById('omSearch').oninput = e => renderOMList(e.target.value);
    document.getElementById('omConfirm').onclick = () => {
      if (picks.size === 0) { toast('请先选一道菜'); return; }
      const note = document.getElementById('omNote').value.trim();
      if (!S.orders[state.orderDate]) S.orders[state.orderDate] = {breakfast:[], lunch:[], dinner:[]};
      const userId = S.currentUserId;
      const ts = Date.now();
      [...picks].forEach(id => {
        S.orders[state.orderDate][state.orderMeal].push({ dishId: id, userId, note, ts });
      });
      saveStore(S);
      hideModal('orderModal');
      renderMeals();
      toast('点菜成功，婆婆马上就看到啦 🥰');
    };
    showModal('orderModal');
  }
  function openOrderModalForDish(dishId) {
    // 简易：打开午餐点菜面板并预选
    openOrderModal('lunch');
    const int = setInterval(() => {
      const box = document.getElementById('omList');
      if (!box) { clearInterval(int); return; }
      clearInterval(int);
      // 根据 dishId 找到对应 om-dish 并模拟点击
      const dish = S.dishes.find(d => d.id === dishId);
      if (!dish) return;
      const search = document.getElementById('omSearch');
      if (search) search.value = dish.name;
      const ev = new Event('input', {bubbles:true});
      if (search) search.dispatchEvent(ev);
      setTimeout(() => {
        [...box.querySelectorAll('.om-dish .n')].forEach(n => {
          if (n.textContent.trim() === dish.name) n.parentElement.click();
        });
      }, 100);
    }, 30);
  }

  /* ---------------- Review Modal ---------------- */
  function openReviewModal(ctx) {
    state.reviewCtx = ctx;
    const dish = S.dishes.find(d => d.id === ctx.dishId);
    const body = document.getElementById('reviewModalBody');
    let images = [];
    let score = 5;
    const update = () => {
      body.innerHTML = `
        <div class="rv-block">
          <h4>为菜品评分</h4>
          <div>
            <div style="font-family:var(--serif); font-size:18px; font-weight:700; margin-bottom:6px;">${escapeHtml(dish?.name || '（菜品已删除）')}</div>
            <div class="muted">${escapeHtml(ctx.date)} · ${({breakfast:'早餐',lunch:'午餐',dinner:'晚餐'})[ctx.meal] || ''}</div>
          </div>
          <div class="rv-stars" id="rvStars" style="margin-top:10px">
            ${[1,2,3,4,5].map(i=>`<button data-s="${i}" class="${score>=i?'on':''}">★</button>`).join('')}
          </div>
        </div>
        <div class="rv-block">
          <h4>上传成品图（可多张）</h4>
          <div class="rv-img-upload" id="rvThumbs">
            ${images.map((src,i) => `<div class="th"><img src="${escapeHtml(src)}"/><button data-rm="${i}" aria-label="移除">×</button></div>`).join('')}
            <label class="pick" title="添加图片">
              ＋<br/>图片
              <input type="file" accept="image/*" id="rvImgInput" ${images.length>=4?'disabled':''}/>
            </label>
          </div>
        </div>
        <div class="rv-block">
          <h4>写点什么（点评人：${escapeHtml(S.members.find(m=>m.id===S.currentUserId)?.name || '匿名')}）</h4>
          <textarea class="rv-ta" id="rvText" placeholder="味道怎么样？可以告诉婆婆哪里超赞、下次想调整什么小细节～" maxlength="200"></textarea>
        </div>
        <div class="rv-foot">
          <button class="ghost-btn" data-close="reviewModal">取消</button>
          <button class="primary-btn" id="rvSave">保存点评</button>
        </div>
      `;
      body.querySelectorAll('#rvStars button').forEach(b => {
        b.onclick = () => { score = Number(b.dataset.s); update(); };
      });
      const input = document.getElementById('rvImgInput');
      if (input) input.onchange = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
          const blob = await compressImage(file, 1280, 0.85);
          const data = await readFileAsDataURL(blob);
          if (images.length < 4) { images.push(data); update(); }
        } catch (err) { console.error(err); toast('图片上传失败'); }
        finally { input.value = ''; }
      };
      body.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
        images.splice(Number(b.dataset.rm),1); update();
      });
      const saveBtn = document.getElementById('rvSave');
      if (saveBtn) saveBtn.onclick = () => {
        const text = document.getElementById('rvText').value.trim();
        if (images.length === 0 && !text && score < 3) {
          toast('至少上传成品图或写一点点评内容'); return;
        }
        S.reviews.push({
          id: uid('r'),
          dishId: ctx.dishId,
          meal: ctx.meal,
          date: ctx.date,
          userId: S.currentUserId,
          score, text, images,
          ts: Date.now(),
        });
        saveStore(S);
        hideModal('reviewModal');
        renderReviews();
        renderMenu();
        toast('谢谢点评，婆婆看到一定很开心 💛');
      };
    };
    update();
    showModal('reviewModal');
  }

  /* ---------------- Modals ---------------- */
  function showModal(id) { document.getElementById(id).setAttribute('aria-hidden','false'); }
  function hideModal(id) { document.getElementById(id).setAttribute('aria-hidden','true'); }

  /* ---------------- Event wiring ---------------- */
  function bindGlobal() {
    document.querySelectorAll('.tab').forEach(t => {
      t.onclick = () => {
        if (t.classList.contains('admin-only') && !isAdmin()) {
          openAuthModal(true);
          return;
        }
        switchTab(t.dataset.tab);
      };
    });
    document.body.addEventListener('click', (e) => {
      const closeT = e.target.closest('[data-close]');
      if (closeT) {
        const id = closeT.getAttribute('data-close');
        hideModal(id);
        return;
      }
      // 菜品详情
      const det = e.target.closest('[data-detail]');
      if (det) { openDishDetail(det.dataset.detail); return; }
      // 点菜
      const ord = e.target.closest('[data-meal]');
      if (ord && ord.classList.contains('btn-order')) { openOrderModal(ord.dataset.meal); return; }
      // 删除点菜
      const rm = e.target.closest('[data-remove]');
      if (rm) {
        const date = rm.dataset.date, meal = rm.dataset.meal, idx = Number(rm.dataset.idx);
        if (!S.orders[date] || !S.orders[date][meal]) return;
        S.orders[date][meal].splice(idx, 1);
        saveStore(S); renderMeals(); toast('已删除该点菜');
        return;
      }
      // 点评
      const rv = e.target.closest('[data-review]');
      if (rv) {
        const date = rv.dataset.date, meal = rv.dataset.meal, idx = Number(rv.dataset.idx);
        const item = S.orders?.[date]?.[meal]?.[idx];
        if (!item) return;
        openReviewModal({ dishId: item.dishId, meal, date });
        return;
      }
      // 管理台 actions
      const edit = e.target.closest('[data-edit]');
      if (edit && isAdmin()) { openDishEditor(edit.dataset.edit); return; }
      const tog = e.target.closest('[data-toggle]');
      if (tog && isAdmin()) {
        const d = S.dishes.find(x => x.id === tog.dataset.toggle);
        if (d) { d.published = !d.published; saveStore(S); renderAdmin(); renderMenu(); toast(d.published ? '已上架' : '已下架'); }
        return;
      }
      const del = e.target.closest('[data-del]');
      if (del && isAdmin()) {
        const d = S.dishes.find(x => x.id === del.dataset.del);
        if (!d) return;
        if (confirm(`确定删除「${d.name}」？点菜和点评中对它的引用会保留但显示“菜品已删除”。`)) {
          S.dishes = S.dishes.filter(x => x.id !== del.dataset.del);
          saveStore(S); renderAdmin(); renderMenu(); toast('已删除');
        }
        return;
      }
      // 成员操作
      const dm = e.target.closest('[data-del-member]');
      if (dm) {
        if (!isAdmin()) { toast('仅管理员可修改'); return; }
        if (S.currentUserId === dm.dataset.delMember) return;
        S.members = S.members.filter(m => m.id !== dm.dataset.delMember);
        saveStore(S); renderRoles(); renderUserSelect(); renderGreeting();
        toast('已移除家人');
        return;
      }
    });

    document.getElementById('currentUserSelect').onchange = (e) => {
      S.currentUserId = e.target.value;
      saveStore(S);
      setAdminBodyClass();
      renderGreeting();
      renderMeals();
      renderMenu();
      renderAdmin();
      renderRoles();
    };
    document.getElementById('menuSearch').oninput = (e) => {
      state.search = e.target.value;
      renderMenu();
    };
    document.getElementById('btnNewDish').onclick = () => {
      if (!assertAdmin()) return;
      openDishEditor(null);
    };
    document.getElementById('btnNewDishAdmin').onclick = () => {
      if (!assertAdmin()) return;
      openDishEditor(null);
    };
    document.getElementById('prevDay').onclick = () => {
      state.orderDate = shiftDate(state.orderDate, -1);
      renderMeals();
    };
    document.getElementById('nextDay').onclick = () => {
      state.orderDate = shiftDate(state.orderDate, 1);
      renderMeals();
    };
    document.getElementById('todayJump').onclick = () => {
      state.orderDate = todayStr();
      renderMeals();
    };

    // Role tab
    document.getElementById('btnAddMember').onclick = () => {
      if (!assertAdmin()) return;
      const nameI = document.getElementById('newMemberName');
      const name = nameI.value.trim();
      if (!name) { toast('请输入家人称呼'); return; }
      if (S.members.some(m => m.name === name)) { toast('家人已存在'); return; }
      S.members.push({ id: uid('u'), name, role: 'member' });
      saveStore(S);
      nameI.value = '';
      renderRoles(); renderUserSelect(); renderGreeting();
      toast('已加入家人');
    };
    document.getElementById('authList').addEventListener('change', (e) => {
      if (!isAdmin()) { toast('仅管理员可授权'); e.target.checked = !e.target.checked; renderRoles(); return; }
      const t = e.target.closest('[data-role]');
      if (!t) return;
      const id = t.getAttribute('data-role');
      const m = S.members.find(x => x.id === id);
      if (!m) return;
      m.role = e.target.checked ? 'admin' : 'member';
      saveStore(S);
      renderRoles(); renderUserSelect(); setAdminBodyClass(); renderGreeting();
      toast(m.name + ' 已' + (e.target.checked ? '升级为管理员' : '恢复为普通成员'));
    });

    // Auth
    document.getElementById('btnOpenAuth').onclick = () => openAuthModal(false);
    document.getElementById('btnAuthGo').onclick = handleAuthGo;
    document.getElementById('btnAuthLogout').onclick = () => {
      // 退出：把当前身份切换为第一个非管理员成员
      const first = S.members.find(m => m.role !== 'admin');
      if (first) S.currentUserId = first.id;
      saveStore(S);
      setAdminBodyClass(); renderGreeting(); renderUserSelect();
      toast('已退出管理员身份');
      hideModal('authModal');
    };

    // Edit modal form
    document.getElementById('fImage').addEventListener('change', async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      try {
        const blob = await compressImage(f, 1200, 0.86);
        const url = await readFileAsDataURL(blob);
        const prev = document.getElementById('imgPreview');
        prev.innerHTML = `<img src="${escapeHtml(url)}" alt=""/>`;
        document.getElementById('fImageUrl').value = '';
      } catch (err) { toast('图片处理失败'); }
    });
    document.getElementById('fImageUrl').addEventListener('input', (e) => {
      const u = e.target.value.trim();
      const prev = document.getElementById('imgPreview');
      if (u) {
        prev.innerHTML = `<img src="${escapeHtml(u)}" alt="" onerror="this.parentElement.innerHTML='<div class=\\'img-placeholder\\'>图片地址无法预览，请检查链接</div>'"/>`;
      } else {
        if (document.getElementById('fImage').files?.[0]) return;
      }
    });
    document.getElementById('dishForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!assertAdmin()) return;
      const name = document.getElementById('fName').value.trim();
      if (!name) return toast('菜名必填');
      const imgUrl = document.getElementById('fImageUrl').value.trim();
      const prevImg = document.querySelector('#imgPreview img')?.getAttribute('src');
      const image = imgUrl || prevImg || PLACEHOLDER_IMG.food1;
      const tags = splitCsv(document.getElementById('fTags').value);
      const mainIng = splitLines(document.getElementById('fMainIng').value);
      const sideIng = splitLines(document.getElementById('fSideIng').value);
      const season  = document.getElementById('fSeason').value.trim();
      const steps   = splitLines(document.getElementById('fSteps').value);
      const meals = [...document.querySelectorAll('input[name=fMeal]:checked')].map(x => x.value);
      const published = document.getElementById('fPublished').checked;
      if (mainIng.length === 0) return toast('请至少填写一项主食材');
      if (steps.length === 0)   return toast('请至少填写一个做法步骤');

      if (state.editId) {
        const d = S.dishes.find(x => x.id === state.editId);
        Object.assign(d, { name, tags, mainIng, sideIng, season, steps, meals, published, image });
        toast('已更新菜品');
      } else {
        S.dishes.push({
          id: uid('d'), name, tags, mainIng, sideIng, season, steps, meals, published, image,
        });
        toast('已添加新菜品');
      }
      saveStore(S);
      hideModal('editModal');
      renderMenu(); renderAdmin();
    });
  }

  function assertAdmin() {
    if (isAdmin()) return true;
    openAuthModal(true);
    return false;
  }

  function openAuthModal(protectAdminTab) {
    const hasPwd = !!S.adminPwdHash;
    document.getElementById('adminPwd').value = '';
    document.getElementById('adminPwd2').value = '';
    document.getElementById('confirmBox').style.display = hasPwd ? 'none' : '';
    document.getElementById('btnAuthGo').textContent = hasPwd ? '验证密码并进入管理台' : '设置密码并进入管理台';
    document.getElementById('btnAuthLogout').style.display = isAdmin() ? '' : 'none';
    showModal('authModal');
    document.getElementById('authModal')._protectAdminTab = !!protectAdminTab;
  }
  async function handleAuthGo() {
    const p1 = document.getElementById('adminPwd').value;
    if (!p1) return toast('请输入密码');
    const modal = document.getElementById('authModal');
    const protectAdminTab = !!modal._protectAdminTab;
    if (!S.adminPwdHash) {
      const p2 = document.getElementById('adminPwd2').value;
      if (p1.length < 4) return toast('密码至少 4 位');
      if (p1 !== p2) return toast('两次密码不一致');
      await setAdminPwd(p1);
      promoteToAdmin();
      afterAuthOk(protectAdminTab);
    } else {
      const ok = await verifyAdminPwd(p1);
      if (!ok) return toast('密码错误');
      promoteToAdmin();
      afterAuthOk(protectAdminTab);
    }
  }
  function promoteToAdmin() {
    // 把当前身份变为管理员（实现“授权管理员方可操作”）
    const user = S.members.find(m => m.id === S.currentUserId);
    if (user) { user.role = 'admin'; saveStore(S); }
    setAdminBodyClass();
    renderUserSelect();
    renderGreeting();
  }
  function afterAuthOk(switchAdmin) {
    hideModal('authModal');
    toast('欢迎回来，管理员 🎉');
    if (switchAdmin) switchTab('admin');
  }

  /* ---------------- Init ---------------- */
  function init() {
    renderUserSelect();
    renderGreeting();
    setAdminBodyClass();
    bindGlobal();
    switchTab('today');
  }
  document.addEventListener('DOMContentLoaded', init);
})();
