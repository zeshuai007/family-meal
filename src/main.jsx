import { useEffect, useId, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import mealPlaceholder from './assets/meal-placeholder.svg'
import './styles.css'

const storageKey = 'family-meal-store-v1'
const maxReviewImageBytes = 700 * 1024
const meals = ['早餐', '午餐', '晚餐']
const categories = ['全部', '荤菜', '素菜', '汤品', '主食', '早餐']
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const iconPaths = {
  home: (
    <>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9.5V20h14V9.5M9 20v-6h6v6" />
    </>
  ),
  menu: (
    <>
      <path d="M4 5h16M4 12h16M4 19h10" />
      <circle cx="18" cy="19" r="2" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M8.5 9h7M8.5 13h7M8.5 17h4" />
    </>
  ),
  star: (
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
  ),
  shield: (
    <>
      <path d="M12 3 19 6v5c0 4.3-2.8 8-7 10-4.2-2-7-5.7-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.7-3.3 3.1-5 7-5s6.3 1.7 7 5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  flame: <path d="M12.5 21c4 0 6.5-2.6 6.5-6.2 0-2.6-1.4-4.8-3.8-7.1.1 2.4-1 3.6-2.1 4.2.2-4.1-1.7-6.9-4.8-9.1.2 3.5-2.8 5.6-2.8 9.8C5.5 17.6 8.2 21 12.5 21Z" />,
  sunrise: (
    <>
      <path d="M4 18h16M6 14a6 6 0 0 1 12 0M12 3v3M5.6 6.6l2.1 2.1M18.4 6.6l-2.1 2.1" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M18.7 5.3l-1.5 1.5M6.8 17.2l-1.5 1.5" />
    </>
  ),
  moon: <path d="M20 15.4A8.5 8.5 0 0 1 8.6 4a8.5 8.5 0 1 0 11.4 11.4Z" />,
  leaf: <path d="M20 4C10.4 4 5 8.6 5 15.1 5 18.2 7.2 20 10.3 20 16.9 20 20 13.3 20 4ZM4 20c2.2-3.3 5.2-5.4 9.1-6.5" />,
  heart: <path d="M20.8 8.8c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.8 2.8Z" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m4 17 4.5-4.5 3.5 3 2.5-2.5L20 18" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4m0 0L8 8m4-4 4 4" />
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </>
  ),
  edit: (
    <>
      <path d="m4 16-.8 4.8L8 20l11.5-11.5a2.8 2.8 0 0 0-4-4L4 16Z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  archive: (
    <>
      <path d="M4 7h16v13H4zM3 4h18v3H3zM9 12h6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-2.4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6v-2.4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L7.3 8 9 6.3l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.1 8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v2.4h-.1a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  trend: <path d="m4 16 5-5 3.5 3.5L20 7m-5 0h5v5" />,
  utensils: (
    <>
      <path d="M7 3v8M4.5 3v4.5a2.5 2.5 0 0 0 5 0V3M7 10v11" />
      <path d="M16 3v18M16 3c2.2 1.4 3.5 3.8 3.5 6.5H16" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3.5 10h17" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M15 8l4 4-4 4M19 12H9" />
    </>
  ),
}

function Icon({ name, size = 20, strokeWidth = 1.8 }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name] || iconPaths.more}
    </svg>
  )
}

const menuSeed = [
  {
    id: 'dish-01',
    name: '番茄牛腩煲',
    category: '荤菜',
    mealTypes: ['午餐', '晚餐'],
    description: '牛腩软烂入味，番茄酸甜开胃，汤汁拌饭也很香。',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82',
    time: '60 分钟',
    difficulty: '中等',
    rating: 4.9,
    reviews: 18,
    tags: ['下饭', '暖胃'],
    mainIngredients: ['牛腩 500g', '番茄 3 个'],
    sideIngredients: ['洋葱半个', '胡萝卜 1 根', '香菜少许'],
    seasonings: ['姜片', '生抽', '冰糖', '八角'],
    steps: ['牛腩冷水下锅焯水，洗净浮沫。', '番茄切块，锅中炒出沙后加入牛腩。', '加入热水和调料，小火炖 50 分钟至软烂。'],
    status: '上架',
    favorite: true,
  },
  {
    id: 'dish-02',
    name: '西兰花炒虾仁',
    category: '荤菜',
    mealTypes: ['午餐', '晚餐'],
    description: '鲜嫩虾仁配脆甜西兰花，清爽不油腻。',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=82',
    time: '25 分钟',
    difficulty: '简单',
    rating: 4.8,
    reviews: 12,
    tags: ['清爽', '高蛋白'],
    mainIngredients: ['鲜虾仁 250g', '西兰花 1 颗'],
    sideIngredients: ['胡萝卜半根', '蒜 3 瓣'],
    seasonings: ['盐', '白胡椒', '蚝油'],
    steps: ['虾仁加白胡椒腌制 10 分钟，西兰花焯水。', '热锅少油，炒香蒜片后放入虾仁。', '虾仁变色后加入西兰花和调料，快速翻匀。'],
    status: '上架',
    favorite: false,
  },
  {
    id: 'dish-03',
    name: '莲藕排骨汤',
    category: '汤品',
    mealTypes: ['午餐', '晚餐'],
    description: '粉糯莲藕和鲜香排骨，慢火炖出一锅家的味道。',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=82',
    time: '90 分钟',
    difficulty: '中等',
    rating: 5.0,
    reviews: 23,
    tags: ['滋补', '孕期友好'],
    mainIngredients: ['排骨 500g', '莲藕 2 节'],
    sideIngredients: ['玉米 1 根', '枸杞少许', '小葱 2 根'],
    seasonings: ['姜片', '盐', '料酒'],
    steps: ['排骨焯水后洗净，莲藕去皮切块。', '砂锅加足量热水，放入排骨和姜片。', '炖 60 分钟后放莲藕，继续炖 30 分钟调味。'],
    status: '上架',
    favorite: true,
  },
  {
    id: 'dish-04',
    name: '香菇青菜',
    category: '素菜',
    mealTypes: ['午餐', '晚餐'],
    description: '香菇的鲜和青菜的甜，三分钟就能端上桌。',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82',
    time: '15 分钟',
    difficulty: '简单',
    rating: 4.7,
    reviews: 9,
    tags: ['快手', '少油'],
    mainIngredients: ['上海青 400g', '鲜香菇 8 朵'],
    sideIngredients: ['蒜 2 瓣'],
    seasonings: ['生抽', '蚝油', '香油'],
    steps: ['上海青和香菇洗净，香菇切片。', '蒜末爆香，放入香菇炒软。', '加入青菜和调料，大火翻炒至断生。'],
    status: '上架',
    favorite: false,
  },
  {
    id: 'dish-05',
    name: '鲜虾蒸水蛋',
    category: '荤菜',
    mealTypes: ['早餐', '午餐'],
    description: '嫩滑水蛋搭配鲜虾，入口柔软，宝宝也喜欢。',
    image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=900&q=82',
    time: '20 分钟',
    difficulty: '简单',
    rating: 4.9,
    reviews: 15,
    tags: ['嫩滑', '营养'],
    mainIngredients: ['鸡蛋 3 个', '鲜虾 6 只'],
    sideIngredients: ['小葱少许', '温水 180ml'],
    seasonings: ['生抽', '香油'],
    steps: ['鸡蛋打散，加温水和少许盐搅匀后过筛。', '虾仁去虾线，摆在蛋液上。', '盖保鲜膜扎孔，中火蒸 10 分钟，淋生抽香油。'],
    status: '上架',
    favorite: false,
  },
  {
    id: 'dish-06',
    name: '南瓜小米粥',
    category: '早餐',
    mealTypes: ['早餐'],
    description: '南瓜自然的甜，煮成一碗暖乎乎的早餐。',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82',
    time: '35 分钟',
    difficulty: '简单',
    rating: 4.8,
    reviews: 11,
    tags: ['暖胃', '易消化'],
    mainIngredients: ['小米 80g', '南瓜 200g'],
    sideIngredients: ['红枣 3 颗'],
    seasonings: ['清水'],
    steps: ['小米淘洗，南瓜去皮切小块。', '锅中水开后放入小米和南瓜。', '小火熬煮 30 分钟，南瓜融化后即可。'],
    status: '上架',
    favorite: true,
  },
  {
    id: 'dish-07',
    name: '玉米胡萝卜排骨',
    category: '汤品',
    mealTypes: ['晚餐'],
    description: '清甜玉米和胡萝卜，给晚餐添一碗安心的汤。',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=82',
    time: '70 分钟',
    difficulty: '中等',
    rating: 4.8,
    reviews: 8,
    tags: ['清甜', '家常'],
    mainIngredients: ['排骨 400g', '甜玉米 1 根'],
    sideIngredients: ['胡萝卜 1 根', '小葱少许'],
    seasonings: ['姜片', '盐'],
    steps: ['排骨焯水，玉米和胡萝卜切块。', '所有食材放入炖锅，加水没过食材。', '小火炖 60 分钟，出锅前加盐。'],
    status: '上架',
    favorite: false,
  },
  {
    id: 'dish-08',
    name: '青椒土豆丝',
    category: '素菜',
    mealTypes: ['午餐', '晚餐'],
    description: '酸香爽脆的家常土豆丝，配一碗米饭刚刚好。',
    image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=82',
    time: '18 分钟',
    difficulty: '简单',
    rating: 4.6,
    reviews: 7,
    tags: ['爽脆', '下饭'],
    mainIngredients: ['土豆 2 个', '青椒 1 个'],
    sideIngredients: ['蒜 2 瓣', '干辣椒 2 个'],
    seasonings: ['米醋', '盐', '花椒'],
    steps: ['土豆切丝泡水洗去淀粉，青椒切丝。', '锅中爆香蒜和干辣椒，放入土豆丝。', '大火翻炒，加醋和盐调味后放青椒。'],
    status: '下架',
    favorite: false,
  },
]

const reviewSeed = [
  {
    id: 'review-01',
    dishId: 'dish-01',
    reviewer: '小雨',
    rating: 5,
    comment: '牛腩炖得特别软，番茄味很足，今天多吃了半碗饭～',
    date: '昨天',
    image: '',
  },
  {
    id: 'review-02',
    dishId: 'dish-03',
    reviewer: '婆婆',
    rating: 5,
    comment: '莲藕粉粉的，汤也很鲜。下次记得多放一节莲藕。',
    date: '3 天前',
    image: '',
  },
]

const historySeed = [
  {
    date: '2026-08-19',
    plan: { 早餐: 'dish-06', 午餐: 'dish-02', 晚餐: 'dish-03' },
    confirmed: true,
  },
  {
    date: '2026-08-18',
    plan: { 早餐: 'dish-05', 午餐: 'dish-04', 晚餐: 'dish-01' },
    confirmed: true,
  },
]

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function dateLabel(date = todayKey()) {
  const value = new Date(`${date}T12:00:00`)
  return `${value.getMonth() + 1}月${value.getDate()}日 星期${weekDays[value.getDay()]}`
}

function shortDate(date) {
  const value = new Date(`${date}T12:00:00`)
  return `${value.getMonth() + 1}月${value.getDate()}日`
}

function createDefaultStore() {
  const key = todayKey()
  return {
    menu: menuSeed,
    orders: {
      [key]: {
        早餐: 'dish-06',
        午餐: 'dish-01',
        晚餐: 'dish-03',
        confirmed: false,
      },
    },
    orderHistory: historySeed,
    reviews: reviewSeed,
    isAdmin: true,
    user: {
      name: '小雨',
      relation: '准妈妈',
      initials: '雨',
      color: 'coral',
    },
  }
}

function loadStore() {
  const fallback = createDefaultStore()
  try {
    const saved = window.localStorage.getItem(storageKey)
    if (!saved) return fallback
    const parsed = JSON.parse(saved)
    return {
      ...fallback,
      ...parsed,
      menu: Array.isArray(parsed.menu) ? parsed.menu : fallback.menu,
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : fallback.reviews,
      orderHistory: Array.isArray(parsed.orderHistory) ? parsed.orderHistory : fallback.orderHistory,
    }
  } catch {
    return fallback
  }
}

function formatNow() {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
}

function timeGreeting() {
  const hour = new Date().getHours()
  if (hour < 5) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function averageRating(reviews) {
  if (!reviews.length) return '—'
  return (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
}

function IconButton({ label, name, onClick, className = '', size = 18 }) {
  return (
    <button aria-label={label} className={`icon-button ${className}`} onClick={onClick} type="button">
      <Icon name={name} size={size} />
    </button>
  )
}

function App() {
  const [store, setStore] = useState(loadStore)
  const [view, setView] = useState('home')
  const [menuFilter, setMenuFilter] = useState('全部')
  const [menuSearch, setMenuSearch] = useState('')
  const [pickerMeal, setPickerMeal] = useState(null)
  const [detailDish, setDetailDish] = useState(null)
  const [reviewDish, setReviewDish] = useState(null)
  const [editingDish, setEditingDish] = useState(null)
  const [showDishForm, setShowDishForm] = useState(false)
  const [toast, setToast] = useState(null)

  const currentDate = todayKey()
  const todayPlan = store.orders[currentDate] || { 早餐: '', 午餐: '', 晚餐: '', confirmed: false }
  const activeMenu = store.menu.filter((dish) => dish.status === '上架')
  const visibleMenu = useMemo(() => {
    const term = menuSearch.trim().toLowerCase()
    return activeMenu.filter((dish) => {
      const matchesCategory = menuFilter === '全部' || dish.category === menuFilter || dish.mealTypes.includes(menuFilter)
      const matchesSearch = !term || `${dish.name}${dish.description}${dish.tags.join('')}`.toLowerCase().includes(term)
      return matchesCategory && matchesSearch
    })
  }, [activeMenu, menuFilter, menuSearch])

  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(store))
      } catch {
        setToast((currentToast) => currentToast || { message: '本地空间不足，已保留当前页面内容，请减少成品图数量', type: 'warning' })
      }
    }, 120)
    return () => window.clearTimeout(saveTimer)
  }, [store])

  useEffect(() => {
    if (!store.isAdmin) setView((currentView) => (currentView === 'admin' ? 'home' : currentView))
  }, [store.isAdmin])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const notify = (message, type = 'success') => setToast({ message, type })

  const goTo = (nextView) => {
    if (nextView === 'admin' && !store.isAdmin) {
      notify('需要管理员授权后才能进入菜单管理', 'warning')
      return
    }
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const chooseDish = (meal, dishId) => {
    setStore((previous) => {
      const previousPlan = previous.orders[currentDate] || { 早餐: '', 午餐: '', 晚餐: '', confirmed: false }
      return {
        ...previous,
        orders: {
          ...previous.orders,
          [currentDate]: { ...previousPlan, [meal]: dishId, confirmed: false },
        },
      }
    })
    setPickerMeal(null)
    notify(`${meal}已选菜品，婆婆会按这个准备`)
  }

  const confirmPlan = () => {
    const selectedCount = meals.filter((meal) => todayPlan[meal]).length
    if (!selectedCount) {
      notify('先为至少一餐选一道菜吧', 'warning')
      return
    }
    setStore((previous) => {
      const previousPlan = previous.orders[currentDate] || todayPlan
      const historyWithoutToday = previous.orderHistory.filter((record) => record.date !== currentDate)
      return {
        ...previous,
        orders: { ...previous.orders, [currentDate]: { ...previousPlan, confirmed: true } },
        orderHistory: [
          { date: currentDate, plan: { 早餐: previousPlan.早餐, 午餐: previousPlan.午餐, 晚餐: previousPlan.晚餐 }, confirmed: true },
          ...historyWithoutToday,
        ],
      }
    })
    notify('今日菜单已告诉婆婆，开饭时见！')
  }

  const toggleFavorite = (dishId) => {
    setStore((previous) => ({
      ...previous,
      menu: previous.menu.map((dish) => (dish.id === dishId ? { ...dish, favorite: !dish.favorite } : dish)),
    }))
  }

  const saveDish = (formData) => {
    if (!store.isAdmin) {
      notify('只有管理员可以更新菜单', 'warning')
      return
    }
    setStore((previous) => {
      if (formData.id) {
        return { ...previous, menu: previous.menu.map((dish) => (dish.id === formData.id ? { ...dish, ...formData } : dish)) }
      }
      return {
        ...previous,
        menu: [{ ...formData, id: `dish-${Date.now()}`, rating: 0, reviews: 0, favorite: false, status: '上架' }, ...previous.menu],
      }
    })
    setShowDishForm(false)
    setEditingDish(null)
    notify(formData.id ? '菜单内容已更新' : '新菜已加入菜单')
  }

  const toggleDishStatus = (dishId) => {
    if (!store.isAdmin) {
      notify('只有管理员可以调整菜单状态', 'warning')
      return
    }
    setStore((previous) => ({
      ...previous,
      menu: previous.menu.map((dish) => (dish.id === dishId ? { ...dish, status: dish.status === '上架' ? '下架' : '上架' } : dish)),
    }))
    notify('菜单状态已更新')
  }

  const saveReview = ({ dishId, rating, comment, image }) => {
    const dish = store.menu.find((item) => item.id === dishId)
    setStore((previous) => ({
      ...previous,
      reviews: [
        {
          id: `review-${Date.now()}`,
          dishId,
          reviewer: previous.user.name,
          rating,
          comment,
          image,
          date: '刚刚',
        },
        ...previous.reviews,
      ],
    }))
    setReviewDish(null)
    notify(`已为「${dish?.name || '这道菜'}」留下评价`)
  }

  const resetDemo = () => {
    setStore(createDefaultStore())
    setView('home')
    notify('演示数据已恢复')
  }

  const weeklyDishCount = useMemo(() => {
    const weekStart = new Date()
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - 6)
    return store.orderHistory
      .filter((record) => new Date(`${record.date}T12:00:00`) >= weekStart)
      .reduce((total, record) => total + meals.filter((meal) => record.plan[meal]).length, 0)
  }, [store.orderHistory])

  const navItems = [
    { id: 'home', label: '今日餐桌', icon: 'home' },
    { id: 'menu', label: '浏览菜单', icon: 'menu' },
    { id: 'orders', label: '我的点菜', icon: 'clipboard' },
    { id: 'reviews', label: '家人点评', icon: 'star' },
    ...(store.isAdmin ? [{ id: 'admin', label: '菜单管理', icon: 'shield', admin: true }] : []),
  ]

  const pageMeta = {
    home: { eyebrow: '家庭餐桌', title: '今日餐桌' },
    menu: { eyebrow: '厨房菜单', title: '浏览菜单' },
    orders: { eyebrow: '每天三餐', title: '我的点菜' },
    reviews: { eyebrow: '饭后分享', title: '家人点评' },
    admin: { eyebrow: '权限管理', title: '菜单管理' },
    profile: { eyebrow: '家庭成员', title: '个人设置' },
  }

  return (
    <div className="app-shell">
      <Sidebar navItems={navItems} view={view} goTo={goTo} user={store.user} isAdmin={store.isAdmin} orderCount={meals.filter((meal) => todayPlan[meal]).length} weeklyDishCount={weeklyDishCount} />
      <div className="main-column">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark small"><Icon name="utensils" size={17} /></span>
            <span>饭点</span>
          </div>
          <div className="breadcrumbs">
            <span>{pageMeta[view]?.eyebrow}</span>
            <Icon name="chevron" size={14} />
            <strong>{pageMeta[view]?.title}</strong>
          </div>
          <div className="topbar-actions">
            <label className="top-search">
              <Icon name="search" size={17} />
              <input
                aria-label="搜索菜品"
                onChange={(event) => {
                  setMenuSearch(event.target.value)
                  if (event.target.value) setView('menu')
                }}
                placeholder="搜索菜品、食材..."
                value={menuSearch}
              />
              <kbd>⌘ K</kbd>
            </label>
            <IconButton className="notification-button" label="查看通知" name="bell" onClick={() => notify('婆婆刚刚更新了晚餐菜单')} />
            <button className="top-user" onClick={() => goTo('profile')} type="button">
              <Avatar user={store.user} />
              <span className="top-user-copy">
                <strong>{store.user.name}</strong>
                <small>{store.isAdmin ? '管理员' : store.user.relation}</small>
              </span>
              <Icon name="chevron" size={15} />
            </button>
          </div>
        </header>

        <main className="page-content">
          {view === 'home' && (
            <Dashboard
              activeMenu={activeMenu}
              todayPlan={todayPlan}
              onConfirm={confirmPlan}
              onChooseMeal={setPickerMeal}
              onOpenDish={setDetailDish}
              onGoTo={goTo}
              onReview={setReviewDish}
              user={store.user}
            />
          )}
          {view === 'menu' && (
            <MenuView
              menu={visibleMenu}
              filter={menuFilter}
              search={menuSearch}
              onFilter={setMenuFilter}
              onSearch={setMenuSearch}
              onOpenDish={setDetailDish}
              onChooseMeal={setPickerMeal}
              onFavorite={toggleFavorite}
              todayPlan={todayPlan}
            />
          )}
          {view === 'orders' && (
            <OrdersView
              menu={store.menu}
              todayPlan={todayPlan}
              history={store.orderHistory}
              onChooseMeal={setPickerMeal}
              onConfirm={confirmPlan}
              onReview={setReviewDish}
              onOpenDish={setDetailDish}
            />
          )}
          {view === 'reviews' && <ReviewsView reviews={store.reviews} menu={store.menu} onReview={setReviewDish} />}
          {view === 'admin' && store.isAdmin && (
            <AdminView
              menu={store.menu}
              reviews={store.reviews}
              onAdd={() => {
                setEditingDish(null)
                setShowDishForm(true)
              }}
              onEdit={(dish) => {
                setEditingDish(dish)
                setShowDishForm(true)
              }}
              onToggleStatus={toggleDishStatus}
            />
          )}
          {view === 'profile' && (
            <ProfileView
              store={store}
              onToggleRole={() => {
                setStore((previous) => ({ ...previous, isAdmin: !previous.isAdmin }))
                notify(store.isAdmin ? '已切换为普通成员' : '管理员权限已授权')
              }}
              onReset={resetDemo}
              onGoTo={goTo}
            />
          )}
        </main>
      </div>

      <MobileNav navItems={navItems} view={view} goTo={goTo} />

      {pickerMeal && (
        <DishPickerModal
          meal={pickerMeal}
          menu={activeMenu.filter((dish) => dish.mealTypes.includes(pickerMeal))}
          selectedId={todayPlan[pickerMeal]}
          onClose={() => setPickerMeal(null)}
          onChoose={chooseDish}
          onOpenDish={setDetailDish}
        />
      )}
      {detailDish && (
        <DishDetailModal
          dish={detailDish}
          onClose={() => setDetailDish(null)}
          onChooseMeal={setPickerMeal}
          onReview={setReviewDish}
        />
      )}
      {reviewDish && <ReviewModal dish={reviewDish} onClose={() => setReviewDish(null)} onSave={saveReview} />}
      {showDishForm && (
        <DishFormModal
          dish={editingDish}
          onClose={() => {
            setShowDishForm(false)
            setEditingDish(null)
          }}
          onSave={saveDish}
        />
      )}
      {toast && (
        <div className={`toast toast-${toast.type}`} role={toast.type === 'warning' ? 'alert' : 'status'}>
          <span className="toast-icon"><Icon name={toast.type === 'warning' ? 'bell' : 'check'} size={16} /></span>
          {toast.message}
        </div>
      )}
    </div>
  )
}

function Avatar({ user, size = 'medium' }) {
  return <span className={`avatar avatar-${user.color || 'coral'} avatar-${size}`}>{user.initials || user.name?.slice(0, 1)}</span>
}

function Sidebar({ navItems, view, goTo, user, isAdmin, orderCount, weeklyDishCount }) {
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <span className="brand-mark"><Icon name="utensils" size={20} /></span>
        <div>
          <strong>饭点</strong>
          <small>FAMILY TABLE</small>
        </div>
      </div>
      <div className="sidebar-date">
        <span className="status-dot" />
        <span>今天 · {formatNow()}</span>
      </div>
      <nav className="sidebar-nav" aria-label="主导航">
        <span className="nav-label">菜单</span>
        {navItems.map((item) => (
          <button className={`nav-item ${view === item.id ? 'active' : ''} ${item.admin ? 'admin-nav' : ''}`} key={item.id} onClick={() => goTo(item.id)} type="button">
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
            {item.id === 'orders' && orderCount > 0 && <span className="nav-count">{orderCount}</span>}
            {item.admin && <span className="admin-dot">●</span>}
          </button>
        ))}
        <span className="nav-label nav-label-spaced">家庭</span>
        <button className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => goTo('profile')} type="button">
          <Icon name="user" size={19} />
          <span>成员设置</span>
        </button>
        <button className="nav-item" onClick={() => goTo('reviews')} type="button">
          <Icon name="heart" size={19} />
          <span>收藏与点评</span>
        </button>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <span className="tip-icon"><Icon name="flame" size={17} /></span>
          <div>
            <strong>本周已安排 {weeklyDishCount} 道菜</strong>
            <span>继续保持好胃口</span>
          </div>
        </div>
        <button className="sidebar-user" onClick={() => goTo('profile')} type="button">
          <Avatar user={user} />
          <span><strong>{user.name}</strong><small>{isAdmin ? '管理员' : user.relation}</small></span>
          <Icon name="more" size={18} />
        </button>
      </div>
    </aside>
  )
}

function MobileNav({ navItems, view, goTo }) {
  const mobileItems = navItems.slice(0, 4)
  return (
    <nav className="mobile-nav" aria-label="移动端主导航">
      {mobileItems.map((item) => (
        <button className={view === item.id ? 'active' : ''} key={item.id} onClick={() => goTo(item.id)} type="button">
          <Icon name={item.icon} size={20} />
          <span>{item.label.replace('今日', '').replace('浏览', '')}</span>
        </button>
      ))}
      <button className={view === 'profile' ? 'active' : ''} onClick={() => goTo('profile')} type="button">
        <Icon name="user" size={20} />
        <span>我的</span>
      </button>
    </nav>
  )
}

function Dashboard({ activeMenu, todayPlan, onConfirm, onChooseMeal, onOpenDish, onGoTo, onReview, user }) {
  const selectedCount = meals.filter((meal) => todayPlan[meal]).length
  const recommended = [...activeMenu].sort((first, second) => second.rating - first.rating).slice(0, 3)
  return (
    <div className="view-stack">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">{formatNow()}</p>
          <h1>{timeGreeting()}，{user.name} <span className="wave">👋</span></h1>
          <p className="page-subtitle">今天也要好好吃饭，想吃什么就告诉婆婆吧。</p>
        </div>
        <button className="date-pill" onClick={() => onGoTo('orders')} type="button">
          <Icon name="calendar" size={16} />
          <span>{dateLabel()}</span>
          <Icon name="chevron" size={14} />
        </button>
      </section>

      <section className="hero-card">
        <div className="hero-content">
          <span className="hero-kicker"><Icon name="flame" size={15} /> 今日好胃口</span>
          <h2>把喜欢的菜，<br /><em>留在今天的餐桌上。</em></h2>
          <p>三餐提前选，婆婆按时做。每一口，都是家人的惦记。</p>
          <button className="button button-light" onClick={() => onGoTo('menu')} type="button">
            去逛逛今日菜单 <Icon name="arrow" size={16} />
          </button>
        </div>
        <div className="hero-art">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-plate">
            <span>今日</span>
            <strong>好好<br />吃饭</strong>
            <small>♡</small>
          </div>
          <span className="hero-leaf leaf-one">✦</span>
          <span className="hero-leaf leaf-two">✦</span>
        </div>
        <div className="hero-stamp"><Icon name="heart" size={17} /> 为你准备</div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DAILY PLAN</p>
            <h2>今天吃什么？</h2>
          </div>
          <div className="section-heading-actions">
            <span className={`plan-status ${todayPlan.confirmed ? 'confirmed' : ''}`}><span />{todayPlan.confirmed ? '已告诉婆婆' : `${selectedCount}/3 已选择`}</span>
            <button className="text-button" onClick={onConfirm} type="button">{todayPlan.confirmed ? '更新菜单' : '确认今日菜单'} <Icon name="arrow" size={15} /></button>
          </div>
        </div>
        <div className="meal-grid">
          {meals.map((meal, index) => (
            <MealCard
              dish={activeMenu.find((item) => item.id === todayPlan[meal])}
              index={index}
              key={meal}
              meal={meal}
              onChoose={() => onChooseMeal(meal)}
              onOpenDish={onOpenDish}
            />
          ))}
        </div>
      </section>

      <section className="split-section">
        <div className="section-block recommendation-block">
          <div className="section-heading">
            <div><p className="eyebrow">MAYBE YOU LIKE</p><h2>婆婆的推荐</h2></div>
            <button className="text-button muted" onClick={() => onGoTo('menu')} type="button">查看全部 <Icon name="arrow" size={15} /></button>
          </div>
          <div className="mini-dish-list">
            {recommended.map((dish) => <MiniDish key={dish.id} dish={dish} onOpen={() => onOpenDish(dish)} onReview={() => onReview(dish)} />)}
          </div>
        </div>
        <div className="care-card">
          <div className="care-card-top"><span className="care-icon"><Icon name="heart" size={18} /></span><span>给准妈妈的小贴士</span></div>
          <h3>少食多餐，<br /><em>每餐都有好心情。</em></h3>
          <p>今天的汤品很适合搭配主食，别忘了饭后散散步哦。</p>
          <div className="care-footer"><span>婆婆的叮嘱</span><span className="care-flower">✿</span></div>
        </div>
      </section>
    </div>
  )
}

function MealCard({ meal, dish, index, onChoose, onOpenDish }) {
  const times = ['07:30 - 09:00', '11:30 - 13:00', '17:30 - 19:00']
  return (
    <article className={`meal-card meal-card-${index + 1} ${dish ? 'has-dish' : ''}`}>
      <div className="meal-card-head">
        <span className="meal-icon"><Icon name={index === 0 ? 'sunrise' : index === 1 ? 'sun' : 'moon'} size={18} /></span>
        <div><strong>{meal}</strong><small>{times[index]}</small></div>
        <span className="meal-number">0{index + 1}</span>
      </div>
      {dish ? (
        <button className="meal-dish" onClick={() => onOpenDish(dish)} type="button">
          <img alt={dish.name} src={dish.image} />
          <span className="meal-dish-info"><strong>{dish.name}</strong><small>{dish.tags.slice(0, 2).join(' · ')}</small></span>
          <Icon name="chevron" size={16} />
        </button>
      ) : (
        <button className="meal-empty" onClick={onChoose} type="button"><span><Icon name="plus" size={16} /></span>选择一道喜欢的菜</button>
      )}
      <button className="meal-change" onClick={onChoose} type="button">{dish ? '更换菜品' : '从菜单中选择'} <Icon name="arrow" size={14} /></button>
    </article>
  )
}

function MiniDish({ dish, onOpen, onReview }) {
  return (
    <article className="mini-dish">
      <button className="mini-dish-image" onClick={onOpen} type="button"><img alt={dish.name} src={dish.image} /><span>{dish.category}</span></button>
      <div className="mini-dish-copy"><button onClick={onOpen} type="button"><strong>{dish.name}</strong></button><span><StarRating value={dish.rating} compact /> <small>{dish.rating.toFixed(1)}</small></span><button className="mini-review" onClick={onReview} type="button">去点评 <Icon name="arrow" size={13} /></button></div>
    </article>
  )
}

function MenuView({ menu, filter, search, onFilter, onSearch, onOpenDish, onChooseMeal, onFavorite, todayPlan }) {
  return (
    <div className="view-stack">
      <section className="page-heading-row">
        <div><p className="eyebrow">KITCHEN MENU</p><h1>浏览菜单</h1><p className="page-subtitle">每一道菜都写清楚食材和做法，放心点，安心吃。</p></div>
        <div className="heading-stat"><span className="stat-icon green"><Icon name="utensils" size={19} /></span><strong>{menu.length}<small> 道今日上架</small></strong><span>婆婆正在持续上新</span></div>
      </section>
      <section className="filter-bar">
        <div className="filter-tabs">{categories.map((category) => <button className={filter === category ? 'active' : ''} key={category} onClick={() => onFilter(category)} type="button">{category}</button>)}</div>
        <label className="inline-search"><Icon name="search" size={17} /><input aria-label="筛选菜单" onChange={(event) => onSearch(event.target.value)} placeholder="按菜名或食材搜索" value={search} /></label>
      </section>
      {menu.length ? (
        <div className="dish-grid">{menu.map((dish) => <DishCard dish={dish} key={dish.id} onFavorite={onFavorite} onOpen={onOpenDish} onChoose={onChooseMeal} todayPlan={todayPlan} />)}</div>
      ) : (
        <EmptyState title="没有找到这道菜" description="换个关键词试试看，或者告诉婆婆想吃什么。" action="清除筛选" onAction={() => { onFilter('全部'); onSearch('') }} />
      )}
    </div>
  )
}

function DishCard({ dish, onOpen, onChoose, onFavorite, todayPlan }) {
  const selectedMeal = meals.find((meal) => todayPlan[meal] === dish.id)
  return (
    <article className="dish-card">
      <button className="dish-image-wrap" onClick={() => onOpen(dish)} type="button">
        <img alt={dish.name} className="dish-image" src={dish.image} />
        <span className="dish-category">{dish.category}</span>
        <span className="dish-time"><Icon name="clock" size={13} /> {dish.time}</span>
        {selectedMeal && <span className="selected-badge"><Icon name="check" size={13} /> 已选{selectedMeal}</span>}
      </button>
      <div className="dish-card-body">
        <div className="dish-card-title"><button onClick={() => onOpen(dish)} type="button"><h3>{dish.name}</h3></button><IconButton className={dish.favorite ? 'liked' : ''} label={dish.favorite ? '取消收藏' : '收藏'} name="heart" onClick={() => onFavorite(dish.id)} size={18} /></div>
        <p>{dish.description}</p>
        <div className="dish-meta"><span><StarRating value={dish.rating} compact /> <b>{dish.rating.toFixed(1)}</b> <small>({dish.reviews})</small></span><span className="dish-difficulty">{dish.difficulty}</span></div>
        <div className="dish-card-footer"><span className="tag-row">{dish.tags.slice(0, 2).map((tag) => <em key={tag}>{tag}</em>)}</span><button className="round-add" onClick={() => onChoose(selectedMeal || dish.mealTypes[0])} title={`加入${selectedMeal || dish.mealTypes[0]}`} type="button"><Icon name={selectedMeal ? 'check' : 'plus'} size={17} /></button></div>
      </div>
    </article>
  )
}

function OrdersView({ menu, todayPlan, history, onChooseMeal, onConfirm, onReview, onOpenDish }) {
  const selectedCount = meals.filter((meal) => todayPlan[meal]).length
  const findDish = (id) => menu.find((dish) => dish.id === id)
  const reviewTarget = findDish(todayPlan.午餐) || findDish(todayPlan.晚餐) || findDish(todayPlan.早餐)
  return (
    <div className="view-stack">
      <section className="page-heading-row">
        <div><p className="eyebrow">MY MEAL PLAN</p><h1>我的点菜</h1><p className="page-subtitle">选好的菜会同步给婆婆，想改口味随时都可以。</p></div>
        <button className="button button-primary" onClick={onConfirm} type="button"><Icon name="check" size={16} /> {todayPlan.confirmed ? '更新今日菜单' : '确认今日菜单'}</button>
      </section>
      <section className="order-overview">
        <div className="overview-heading"><div><span className="eyebrow">TODAY · {dateLabel()}</span><h2>今日三餐清单</h2></div><span className={`order-state ${todayPlan.confirmed ? 'done' : ''}`}><span />{todayPlan.confirmed ? '婆婆已收到' : '等待确认'}</span></div>
        <div className="order-timeline">
          {meals.map((meal, index) => {
            const dish = findDish(todayPlan[meal])
            return <div className="order-row" key={meal}><div className={`timeline-dot dot-${index + 1}`}><Icon name={index === 0 ? 'sunrise' : index === 1 ? 'sun' : 'moon'} size={15} /></div><div className="order-meal-label"><strong>{meal}</strong><small>{['07:30 早餐时间', '11:30 午餐时间', '17:30 晚餐时间'][index]}</small></div>{dish ? <button className="order-dish" onClick={() => onOpenDish(dish)} type="button"><img alt={dish.name} src={dish.image} /><span><strong>{dish.name}</strong><small>{dish.tags.join(' · ')}</small></span><Icon name="chevron" size={15} /></button> : <button className="order-empty" onClick={() => onChooseMeal(meal)} type="button"><Icon name="plus" size={15} /> 还没有选菜，去菜单看看</button>}<button className="order-edit" onClick={() => onChooseMeal(meal)} type="button">{dish ? '更换' : '选择'}</button></div>
          })}
        </div>
        <div className="order-overview-footer"><span><Icon name="heart" size={15} /> 已选择 {selectedCount} 道菜，婆婆会按你的口味准备</span><button className="text-button" disabled={!reviewTarget} onClick={() => onReview(reviewTarget)} type="button">写下今天的点评 <Icon name="arrow" size={15} /></button></div>
      </section>
      <section className="history-section"><div className="section-heading"><div><p className="eyebrow">ORDER HISTORY</p><h2>过往点菜</h2></div><button className="filter-small" type="button">最近 7 天 <Icon name="chevron" size={14} /></button></div><div className="history-list">{history.length ? history.map((record) => <HistoryRow findDish={findDish} key={record.date} record={record} />) : <EmptyState title="还没有点菜记录" description="从今天开始，记录每一顿喜欢的饭。" />}</div></section>
    </div>
  )
}

function HistoryRow({ record, findDish }) {
  const dishes = meals.map((meal) => findDish(record.plan[meal])).filter(Boolean)
  return <article className="history-row"><div className="history-date"><strong>{shortDate(record.date)}</strong><span>{dateLabel(record.date).split(' ')[1]}</span></div><div className="history-dishes">{dishes.map((dish) => <span className="history-dish" key={dish.id}><img alt={dish.name} src={dish.image} /><span>{dish.name}</span></span>)}</div><span className="history-status"><Icon name="check" size={14} /> 已完成</span><Icon name="chevron" size={16} /></article>
}

function ReviewsView({ reviews, menu, onReview }) {
  const findDish = (id) => menu.find((dish) => dish.id === id)
  const firstDish = menu.find((dish) => dish.status === '上架')
  return (
    <div className="view-stack">
      <section className="page-heading-row">
        <div><p className="eyebrow">FAMILY NOTES</p><h1>家人点评</h1><p className="page-subtitle">每一句好吃，都是下一顿饭的灵感。</p></div>
        <div className="rating-summary"><span className="rating-big">{averageRating(reviews)}</span><span><StarRating value={Number(averageRating(reviews)) || 0} /><small>来自 {reviews.length} 条家庭点评</small></span></div>
      </section>
      <section className="review-hero"><div><span className="hero-kicker"><Icon name="heart" size={15} /> FAMILY LOVE</span><h2>把饭桌上的<br /><em>幸福分享出来。</em></h2><p>上传婆婆做好的成品图，让每一次用心都被看见。</p></div><div className="review-hero-art"><span>好吃<br />就要说出来</span><strong>♡</strong></div></section>
      <section className="reviews-section"><div className="section-heading"><div><p className="eyebrow">RECENT REVIEWS</p><h2>最近的点评</h2></div><span className="review-count">{reviews.length} 条记录</span></div><div className="review-grid">{reviews.map((review) => <ReviewCard dish={findDish(review.dishId)} key={review.id} review={review} />)}</div></section>
      <section className="write-review-card"><div className="write-review-icon"><Icon name="image" size={22} /></div><div><h3>刚吃完一道喜欢的菜？</h3><p>给婆婆留句话，也可以上传今天的成品图。</p></div><button className="button button-outline" disabled={!firstDish} onClick={() => onReview(firstDish)} type="button">去点评 <Icon name="arrow" size={15} /></button></section>
    </div>
  )
}

function ReviewCard({ review, dish }) {
  return <article className="review-card">{review.image ? <img alt="成品图" className="review-photo" src={review.image} /> : <div className="review-photo review-photo-placeholder"><Icon name="utensils" size={25} /><span>家庭餐桌</span></div>}<div className="review-card-content"><div className="review-card-head"><Avatar user={{ initials: review.reviewer.slice(0, 1), color: review.reviewer === '婆婆' ? 'sage' : 'coral' }} size="small" /><span><strong>{review.reviewer}</strong><small>{review.date}</small></span><span className="review-dish-name">{dish?.name || '家庭菜品'}</span></div><StarRating value={review.rating} /><p>“{review.comment}”</p><div className="review-card-footer"><span><Icon name="heart" size={14} /> 家人觉得很赞</span><button type="button">回复</button></div></div></article>
}

function AdminView({ menu, reviews, onAdd, onEdit, onToggleStatus }) {
  const activeCount = menu.filter((dish) => dish.status === '上架').length
  const hiddenCount = menu.length - activeCount
  return (
    <div className="view-stack">
      <section className="page-heading-row admin-heading">
        <div><p className="eyebrow">ADMIN CONSOLE</p><h1>菜单管理</h1><p className="page-subtitle">只有获得授权的管理员可以上新、更新或下架菜品。</p></div>
        <button className="button button-primary" onClick={onAdd} type="button"><Icon name="plus" size={17} /> 添加新菜</button>
      </section>
      <div className="admin-stats"><AdminStat icon="menu" label="菜单总数" value={menu.length} tone="green" /><AdminStat icon="check" label="当前上架" value={activeCount} tone="blue" /><AdminStat icon="archive" label="已下架" value={hiddenCount} tone="orange" /><AdminStat icon="star" label="累计点评" value={reviews.length} tone="pink" /></div>
      <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">ALL DISHES</p><h2>全部菜品</h2></div><span className="admin-permission"><Icon name="shield" size={15} /> 管理员权限已开启</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>菜品</th><th>分类</th><th>适用餐次</th><th>状态</th><th>最近更新</th><th /></tr></thead><tbody>{menu.map((dish) => <tr key={dish.id}><td><div className="table-dish"><img alt={dish.name} src={dish.image} /><span><strong>{dish.name}</strong><small>{dish.time} · {dish.difficulty}</small></span></div></td><td><span className="table-category">{dish.category}</span></td><td><span className="meal-tags">{dish.mealTypes.map((meal) => <em key={meal}>{meal}</em>)}</span></td><td><button className={`status-toggle ${dish.status === '上架' ? 'online' : 'offline'}`} onClick={() => onToggleStatus(dish.id)} type="button"><span />{dish.status}</button></td><td><span className="updated-time">今天 09:24</span></td><td><div className="table-actions"><IconButton label="编辑菜品" name="edit" onClick={() => onEdit(dish)} size={16} /><IconButton label={dish.status === '上架' ? '下架菜品' : '重新上架'} name="archive" onClick={() => onToggleStatus(dish.id)} size={16} /></div></td></tr>)}</tbody></table></div></section>
      <section className="admin-reminder"><span className="reminder-icon"><Icon name="bell" size={18} /></span><div><strong>小提醒</strong><p>下架的菜品不会出现在家人的点菜页面，但历史记录和点评仍会保留。</p></div><Icon name="chevron" size={17} /></section>
    </div>
  )
}

function AdminStat({ icon, label, value, tone }) {
  return <div className="admin-stat"><span className={`stat-icon ${tone}`}><Icon name={icon} size={18} /></span><span><small>{label}</small><strong>{value}</strong></span><Icon name="trend" size={17} /></div>
}

function ProfileView({ store, onToggleRole, onReset, onGoTo }) {
  return (
    <div className="view-stack profile-view">
      <section className="page-heading-row"><div><p className="eyebrow">YOUR PROFILE</p><h1>成员设置</h1><p className="page-subtitle">管理你的家庭身份和点菜偏好。</p></div></section>
      <section className="profile-card"><div className="profile-card-main"><Avatar user={store.user} size="large" /><div><span className="profile-role">{store.isAdmin ? '管理员' : '家庭成员'}</span><h2>{store.user.name}</h2><p>{store.user.relation} · 负责今天的好胃口</p></div><IconButton className="profile-edit" label="编辑资料" name="edit" onClick={() => {}} /></div><div className="profile-info-grid"><div><small>家庭角色</small><strong>{store.user.relation}</strong></div><div><small>点菜偏好</small><strong>清淡、少油</strong></div><div><small>加入家庭</small><strong>2026 年 3 月</strong></div></div></section>
      <div className="settings-grid"><section className="settings-panel"><div className="settings-panel-heading"><span className="settings-icon green"><Icon name="shield" size={19} /></span><div><h3>权限与身份</h3><p>管理员可以维护家庭菜单内容。</p></div></div><div className="permission-row"><div><strong>{store.isAdmin ? '管理员权限已开启' : '普通成员模式'}</strong><span>{store.isAdmin ? '可以添加、编辑和上下架菜单' : '可以点菜、上传成品图并点评'}</span></div><button className={`toggle-switch ${store.isAdmin ? 'on' : ''}`} onClick={onToggleRole} type="button"><span /></button></div><button className="settings-link" onClick={() => onGoTo(store.isAdmin ? 'admin' : 'home')} type="button"><span>{store.isAdmin ? '进入菜单管理' : '返回今日餐桌'}</span><Icon name="arrow" size={15} /></button></section><section className="settings-panel"><div className="settings-panel-heading"><span className="settings-icon orange"><Icon name="clipboard" size={19} /></span><div><h3>数据与记录</h3><p>点菜和点评会保存在当前设备中。</p></div></div><div className="storage-status"><span className="status-dot" /><span><strong>本地记录已保存</strong><small>下次打开仍可继续使用</small></span></div><button className="settings-link danger" onClick={onReset} type="button"><span>恢复演示数据</span><Icon name="logout" size={15} /></button></section></div>
      <section className="deployment-note"><span className="deployment-icon"><Icon name="settings" size={19} /></span><div><strong>准备部署到 1Panel？</strong><p>本项目为 Vite 静态站点，执行 <code>npm run build</code> 后，将 <code>dist</code> 目录部署到 1Panel 网站即可。</p></div><Icon name="chevron" size={16} /></section>
    </div>
  )
}

function StarRating({ value, compact = false, interactive = false, onChange }) {
  return <span className={`star-rating ${compact ? 'compact' : ''} ${interactive ? 'interactive' : ''}`}>{[1, 2, 3, 4, 5].map((star) => interactive ? <button aria-label={`${star} 分`} className={star <= value ? 'filled' : ''} key={star} onClick={() => onChange(star)} type="button">★</button> : <span className={star <= value ? 'filled' : ''} key={star}>★</span>)}</span>
}

function EmptyState({ title, description, action, onAction }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name="search" size={25} /></span><h3>{title}</h3><p>{description}</p>{action && <button className="button button-outline" onClick={onAction} type="button">{action}</button>}</div>
}

function Modal({ eyebrow, title, onClose, children, wide = false }) {
  const titleId = useId()
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section aria-labelledby={titleId} aria-modal="true" className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog"><div className="modal-header"><div><p className="eyebrow">{eyebrow}</p><h2 id={titleId}>{title}</h2></div><IconButton label="关闭" name="close" onClick={onClose} /></div>{children}</section></div>
}

function DishPickerModal({ meal, menu, selectedId, onClose, onChoose, onOpenDish }) {
  return <Modal eyebrow={`${meal} · PICK A DISH`} title={`为${meal}选一道菜`} onClose={onClose}><div className="picker-intro">想吃什么就点什么，婆婆会看见你的选择。</div><div className="picker-list">{menu.map((dish) => <button className={`picker-item ${selectedId === dish.id ? 'selected' : ''}`} key={dish.id} onClick={() => onChoose(meal, dish.id)} type="button"><img alt={dish.name} src={dish.image} /><span className="picker-item-copy"><strong>{dish.name}</strong><small>{dish.tags.join(' · ')} · {dish.time}</small></span><span className="picker-item-rating"><StarRating compact value={dish.rating} /><small>{dish.rating.toFixed(1)}</small></span>{selectedId === dish.id ? <span className="picker-check"><Icon name="check" size={14} /></span> : <Icon name="chevron" size={16} />}</button>)}</div>{menu.length === 0 && <EmptyState title="这餐还没有可选菜品" description="请让管理员为这餐添加菜单。" />}<div className="modal-footer"><button className="text-button muted" onClick={onClose} type="button">稍后再选</button><button className="button button-primary" onClick={() => { const selected = menu.find((dish) => dish.id === selectedId); if (selected) onOpenDish(selected) }} type="button" disabled={!selectedId}>查看已选菜品 <Icon name="arrow" size={15} /></button></div></Modal>
}

function DishDetailModal({ dish, onClose, onChooseMeal, onReview }) {
  return <Modal eyebrow={`${dish.category} · RECIPE`} title={dish.name} onClose={onClose} wide><div className="detail-layout"><div className="detail-image-wrap"><img alt={dish.name} src={dish.image} /><div className="detail-image-overlay"><span><Icon name="clock" size={14} /> {dish.time}</span><span><Icon name="flame" size={14} /> {dish.difficulty}</span></div></div><div className="detail-copy"><p>{dish.description}</p><div className="detail-rating"><StarRating value={dish.rating} /><strong>{dish.rating ? dish.rating.toFixed(1) : '暂无'}</strong><span>({dish.reviews} 条点评)</span></div><div className="detail-actions"><button className="button button-primary" onClick={() => onChooseMeal(dish.mealTypes[0])} type="button"><Icon name="plus" size={16} /> 加入{dish.mealTypes[0]}</button><button className="button button-soft" onClick={() => onReview(dish)} type="button"><Icon name="star" size={16} /> 去点评</button></div></div></div><div className="recipe-grid"><RecipeList title="主食材" items={dish.mainIngredients} icon="utensils" /><RecipeList title="配菜" items={dish.sideIngredients} icon="leaf" /><RecipeList title="配料" items={dish.seasonings} icon="flame" /></div><div className="steps-block"><div className="detail-section-label"><span>01</span><h3>详细做法</h3></div><ol>{dish.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol></div></Modal>
}

function RecipeList({ title, items, icon }) {
  return <div className="recipe-list"><div className="detail-section-label"><span className="recipe-icon"><Icon name={icon === 'leaf' ? 'heart' : icon} size={15} /></span><h3>{title}</h3></div><ul>{items.map((item) => <li key={item}><span />{item}</li>)}</ul></div>
}

function ReviewModal({ dish, onClose, onSave }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [image, setImage] = useState('')
  const [error, setError] = useState('')
  const handleFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > maxReviewImageBytes) {
      setError('图片请控制在 700KB 以内')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImage(String(reader.result))
      setError('')
    }
    reader.readAsDataURL(file)
  }
  return <Modal eyebrow="SHARE YOUR TABLE" title={`点评「${dish.name}」`} onClose={onClose}><div className="review-form"><div className="review-dish-preview"><img alt={dish.name} src={dish.image} /><span><strong>{dish.name}</strong><small>{dish.category} · {dish.tags.join(' · ')}</small></span></div><label className="form-label">这道菜打几分？<StarRating interactive value={rating} onChange={setRating} /></label><label className="form-label">说说你的感受<textarea onChange={(event) => setComment(event.target.value)} placeholder="比如：汤很鲜，牛腩炖得很软……" rows="4" value={comment} /></label><label className="upload-zone">{image ? <img alt="待上传的成品预览" src={image} /> : <><span className="upload-icon"><Icon name="upload" size={21} /></span><strong>上传婆婆做好的成品图</strong><small>支持 JPG、PNG，最大 700KB</small></>}<input accept="image/png,image/jpeg,image/webp" onChange={handleFile} type="file" />{image && <span className="upload-again">重新选择图片</span>}</label>{error && <p className="form-error">{error}</p>}<div className="modal-footer"><button className="text-button muted" onClick={onClose} type="button">取消</button><button className="button button-primary" disabled={!comment.trim()} onClick={() => onSave({ dishId: dish.id, rating, comment: comment.trim(), image })} type="button">发布点评 <Icon name="arrow" size={15} /></button></div></div></Modal>
}

const formDefaults = {
  name: '',
  category: '家常菜',
  mealTypes: ['午餐'],
  description: '',
  image: '',
  time: '30 分钟',
  difficulty: '简单',
  tags: '',
  mainIngredients: '',
  sideIngredients: '',
  seasonings: '',
  steps: '',
}

function DishFormModal({ dish, onClose, onSave }) {
  const [form, setForm] = useState(() => dish ? { ...dish, tags: dish.tags.join('，'), mainIngredients: dish.mainIngredients.join('\n'), sideIngredients: dish.sideIngredients.join('\n'), seasonings: dish.seasonings.join('\n'), steps: dish.steps.join('\n') } : formDefaults)
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }))
  const toggleMeal = (meal) => setForm((previous) => ({ ...previous, mealTypes: previous.mealTypes.includes(meal) ? previous.mealTypes.filter((item) => item !== meal) : [...previous.mealTypes, meal] }))
  const submit = (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.mealTypes.length) return
    onSave({
      ...form,
      name: form.name.trim(),
      tags: form.tags.split(/[，,]/).map((item) => item.trim()).filter(Boolean),
      mainIngredients: form.mainIngredients.split('\n').map((item) => item.trim()).filter(Boolean),
      sideIngredients: form.sideIngredients.split('\n').map((item) => item.trim()).filter(Boolean),
      seasonings: form.seasonings.split('\n').map((item) => item.trim()).filter(Boolean),
      steps: form.steps.split('\n').map((item) => item.trim()).filter(Boolean),
      image: form.image.trim() || mealPlaceholder,
      status: dish?.status || '上架',
    })
  }
  return <Modal eyebrow={dish ? 'EDIT DISH' : 'NEW DISH'} title={dish ? '更新菜品内容' : '添加一道新菜'} onClose={onClose} wide><form className="dish-form" onSubmit={submit}><div className="form-grid"><label className="form-label">菜品名称<input onChange={(event) => update('name', event.target.value)} placeholder="例如：山药排骨汤" required value={form.name} /></label><label className="form-label">菜品分类<select onChange={(event) => update('category', event.target.value)} value={form.category}><option>家常菜</option><option>荤菜</option><option>素菜</option><option>汤品</option><option>主食</option><option>早餐</option></select></label><label className="form-label full-span">适用餐次<div className="checkbox-row">{meals.map((meal) => <label className={`checkbox-pill ${form.mealTypes.includes(meal) ? 'checked' : ''}`} key={meal}><input checked={form.mealTypes.includes(meal)} onChange={() => toggleMeal(meal)} type="checkbox" />{meal}</label>)}</div></label><label className="form-label full-span">一句话介绍<textarea onChange={(event) => update('description', event.target.value)} placeholder="让家人一眼就想点它" rows="2" value={form.description} /></label><label className="form-label">烹饪时间<input onChange={(event) => update('time', event.target.value)} value={form.time} /></label><label className="form-label">难度<select onChange={(event) => update('difficulty', event.target.value)} value={form.difficulty}><option>简单</option><option>中等</option><option>较难</option></select></label><label className="form-label full-span">图片地址<input onChange={(event) => update('image', event.target.value)} placeholder="粘贴菜品图片 URL" value={form.image} /></label><label className="form-label">主食材 <span>每行一项</span><textarea onChange={(event) => update('mainIngredients', event.target.value)} placeholder={'排骨 500g\\n山药 300g'} rows="4" value={form.mainIngredients} /></label><label className="form-label">配菜 <span>每行一项</span><textarea onChange={(event) => update('sideIngredients', event.target.value)} placeholder={'枸杞少许\\n小葱 2 根'} rows="4" value={form.sideIngredients} /></label><label className="form-label">配料 <span>每行一项</span><textarea onChange={(event) => update('seasonings', event.target.value)} placeholder={'姜片\\n盐\\n料酒'} rows="4" value={form.seasonings} /></label><label className="form-label">详细做法 <span>每行一步</span><textarea onChange={(event) => update('steps', event.target.value)} placeholder={'食材洗净切好。\\n锅中加水炖煮。'} rows="4" value={form.steps} /></label><label className="form-label full-span">标签 <span>用逗号分隔</span><input onChange={(event) => update('tags', event.target.value)} placeholder="家常，暖胃，少油" value={form.tags} /></label></div><div className="modal-footer"><button className="text-button muted" onClick={onClose} type="button">取消</button><button className="button button-primary" disabled={!form.name.trim() || !form.mealTypes.length} type="submit">{dish ? '保存更新' : '发布新菜'} <Icon name="arrow" size={15} /></button></div></form></Modal>
}

createRoot(document.getElementById('root')).render(<App />)
