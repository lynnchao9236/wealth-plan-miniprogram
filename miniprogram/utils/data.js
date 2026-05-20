// utils/data.js - 核心数据模型和计算引擎

// 基础参数
const BASE = {
  startAsset: 100,
  targetAsset: 1000,
  startYear: 2026,
  endYear: 2041,
  annualIncome: 50,
  annualExpense: 10,
  annualSaving: 35,
  emergencyFund: 20,
  initCash: 50,
  initStock: 10,
  initFund: 10,
  initHouse: 250, // 初始固定资产
  initLoan: 50, // 初始欠款负债
  monthlyFixedExpense: 1
}

// 初始持仓数据（单位：元）
const INIT_HOLDING = {
  stockAccounts: [
    { name: '股票账户', items: [
      { code: 'mixed', name: '混合持仓', value: 100000, cost: 100000, note: '持有不动，等待时机' }
    ]}
  ],
  fundAccounts: [
    { name: '基金账户', items: [
      { code: '510300', name: '沪深300ETF', value: 50000, cost: 50000, note: '宽基指数定投' },
      { code: '510500', name: '中证500ETF', value: 40000, cost: 40000, note: '宽基指数定投' }
    ]}
  ],
  updatedAt: '2026-03',
  totalStock: 100000,
  totalFund: 90000
}

// 推荐标的库
const RECOMMEND_POOL = {
  aStock: [
    { code: '510300', name: '沪深300ETF', type: 'ETF', risk: '中', desc: '跟踪沪深300指数', reason: '长期定投首选' },
    { code: '510500', name: '中证500ETF', type: 'ETF', risk: '中高', desc: '跟踪中证500指数', reason: '与沪深300互补' },
    { code: '159915', name: '创业板ETF', type: 'ETF', risk: '高', desc: '跟踪创业板指数', reason: '成长股弹性' }
  ],
  hkOverseas: [
    { code: '513050', name: '中概互联ETF', type: 'ETF', risk: '高', desc: '港股互联网', reason: '估值低位' },
    { code: '513100', name: '纳指100ETF', type: 'ETF', risk: '中高', desc: '纳斯达克100', reason: '美股科技龙头' },
    { code: '513500', name: '标普500ETF', type: 'ETF', risk: '中', desc: '标普500', reason: '全球资产配置' }
  ],
  bond: [
    { code: '511010', name: '国债ETF', type: 'ETF', risk: '低', desc: '上证国债', reason: '低风险固收' },
    { code: 'bond_fund', name: '纯债基金', type: '基金', risk: '低', desc: '债券市场', reason: '年化3-5%' }
  ],
  gold: [
    { code: '518880', name: '黄金ETF', type: 'ETF', risk: '中', desc: '黄金现货', reason: '避险资产' }
  ]
}

// 汇率配置
const FX_RATES = { CNY: 1, USD: 7.25, HKD: 0.93 }
const CURRENCY_SYMBOLS = { CNY: '¥', USD: '$', HKD: 'HK$' }

function toCNY(amount, currency) {
  return amount * (FX_RATES[currency] || 1)
}

function getPhase(year) {
  if (year <= 2029) return 1
  if (year <= 2034) return 2
  return 3
}

function getPhaseColor(phase) {
  const map = { 1: '#3B82F6', 2: '#EAB308', 3: '#22C55E', house: '#EC4899' }
  return map[phase] || '#8A8A8A'
}

function getPhaseLabel(phase) {
  return `Phase ${phase}`
}

function getCurrentMonthKey() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  if (y < 2026) return '2026-04'
  if (y > 2041) return '2041-12'
  return `${y}-${String(m).padStart(2, '0')}`
}

function parseMonthKey(key) {
  const parts = key.split('-').map(Number)
  return { year: parts[0], month: parts[1] }
}

function formatMonthKey(key) {
  const { year, month } = parseMonthKey(key)
  return `${year}年${month}月`
}

// 每月计划模板
function getMonthlyPlan(year, month) {
  const phase = getPhase(year)
  const isSpecial2026 = (year === 2026)
  const monthKey = `${year}-${String(month).padStart(2, '0')}`

  const incomeItems = []
  incomeItems.push({ id: 'salary', label: '主业税后收入', planned: 2, unit: '万', category: 'income', desc: '月薪税后约¥2万' })

  if (year === 2028) {
    incomeItems.push({ id: 'side_income', label: '副业收入', planned: 0.3, unit: '万', category: 'income', desc: '目标¥3~5万/年' })
  } else if (year === 2029) {
    incomeItems.push({ id: 'side_income', label: '副业收入', planned: 0.6, unit: '万', category: 'income', desc: '目标¥5~10万/年' })
  } else if (phase === 2) {
    incomeItems.push({ id: 'side_income', label: '副业收入', planned: year <= 2031 ? 1.0 : 1.5, unit: '万', category: 'income', desc: '副业收入月均' })
  } else if (phase === 3) {
    incomeItems.push({ id: 'side_income', label: '副业收入', planned: 1.5, unit: '万', category: 'income', desc: '副业¥15~20万/年' })
  }

  if (month === 12) {
    const bonusAmt = phase === 2 ? 12 : 10
    incomeItems.push({ id: 'bonus', label: '年终奖', planned: bonusAmt, unit: '万', category: 'income', desc: '铁律：奖金全部投资' })
  }

  const expenseItems = []
  expenseItems.push({ id: 'daily_expense', label: '日常固定支出', planned: BASE.monthlyFixedExpense, unit: '万', category: 'expense', desc: '房贷+生活+餐饮+交通' })

  if (month === 4) {
    expenseItems.push({ id: 'my_insurance', label: '本人保险缴费', planned: 0.9, unit: '万', category: 'expense', desc: '年度保险保费' })
  }
  if (month === 8) {
    expenseItems.push({ id: 'car_insurance', label: '车险缴费', planned: 0.5, unit: '万', category: 'expense', desc: '年度车险保费' })
  }
  if (month === 12 && year === 2026) {
    expenseItems.push({ id: 'family_insurance_2026', label: '家人保险（首年大额）', planned: 28, unit: '万', category: 'expense', desc: '26年期储蓄险首缴¥28万' })
  }
  if (month === 12 && year >= 2027) {
    expenseItems.push({ id: 'family_insurance', label: '家人保险年缴', planned: 0.9, unit: '万', category: 'expense', desc: '年缴¥0.9万' })
  }

  const investItems = []
  if (isSpecial2026) {
    if (month >= 3) {
      investItems.push({ id: 'invest', label: '月度定投（基金）', planned: 2.0, unit: '万', category: 'invest', desc: '全部定投沪深300/中证500 ETF' })
    }
    investItems.push({ id: 'hold_stock', label: '股票持仓维持', planned: 13, unit: '万', category: 'invest', desc: '¥13万持有不动' })
    investItems.push({ id: 'hold_fund', label: '基金持仓（含定投）', planned: month >= 3 ? 9 + (month - 2) * 2.0 : 9, unit: '万', category: 'invest', desc: `基金约¥${month >= 3 ? (9 + (month - 2) * 2.0).toFixed(0) : 9}万` })
    if (month === 12) {
      investItems.push({ id: 'bonus_invest', label: '年终奖定投', planned: 10, unit: '万', category: 'invest', desc: '奖金全部投入' })
    }
  } else if (phase === 1) {
    investItems.push({ id: 'monthly_invest', label: '月度定投', planned: 1, unit: '万', category: 'invest', desc: '沪深300/中证500/恒科/纳指' })
    investItems.push({ id: 'reserve_topup', label: '备用金补充', planned: 0.42, unit: '万', category: 'invest', desc: '年¥5万分摊' })
    if (month % 3 === 0) {
      investItems.push({ id: 'rebalance', label: '季度再平衡', planned: 0, unit: '', category: 'invest', desc: '检查组合偏离度' })
    }
    if (month === 12) {
      investItems.push({ id: 'bonus_invest', label: '年终奖全投', planned: 10, unit: '万', category: 'invest', desc: '铁律：奖金一分不花' })
    }
    if (year === 2027) {
      investItems.push({ id: 'side_biz', label: '副业探索', planned: 0, unit: '', category: 'invest', desc: '尝试咨询合作' })
    }
  } else if (phase === 2) {
    investItems.push({ id: 'monthly_invest', label: '月度定投', planned: 2, unit: '万', category: 'invest', desc: '主业储蓄定投' })
    investItems.push({ id: 'side_invest', label: '副业收入定投', planned: year <= 2031 ? 1.0 : 1.5, unit: '万', category: 'invest', desc: '副业收入全部投入' })
    investItems.push({ id: 'edu_fund', label: '教育基金定投', planned: 0.25, unit: '万', category: 'invest', desc: '¥3万/年' })
    if (month % 3 === 0) {
      investItems.push({ id: 'rebalance', label: '季度再平衡', planned: 0, unit: '', category: 'invest', desc: '调整至目标配比' })
    }
    if (month === 12) {
      investItems.push({ id: 'bonus_invest', label: '年终奖全投', planned: 12, unit: '万', category: 'invest', desc: '铁律：奖金一分不花' })
    }
  } else if (phase === 3) {
    investItems.push({ id: 'monthly_invest', label: '月度定投', planned: 3, unit: '万', category: 'invest', desc: '换房后储蓄定投' })
    investItems.push({ id: 'side_invest', label: '副业收入定投', planned: 1.5, unit: '万', category: 'invest', desc: '副业全投' })
    if (month % 6 === 0) {
      investItems.push({ id: 'risk_reduce', label: '半年度降风险', planned: 0, unit: '', category: 'invest', desc: '逐步增加固收占比' })
    }
    if (month === 12) {
      investItems.push({ id: 'bonus_invest', label: '年终奖全投', planned: 10, unit: '万', category: 'invest', desc: '铁律：奖金一分不花' })
    }
  }

  const totalIncome = incomeItems.reduce((s, a) => s + a.planned, 0)
  const totalExpense = expenseItems.reduce((s, a) => s + a.planned, 0)
  const totalInvest = investItems.filter(a => a.planned > 0 && a.id !== 'hold_stock' && a.id !== 'hold_fund').reduce((s, a) => s + a.planned, 0)
  const netCashChange = totalIncome - totalExpense - totalInvest
  const actions = [...incomeItems, ...expenseItems, ...investItems]

  return { monthKey, year, month, phase, actions, incomeItems, expenseItems, investItems, totalIncome, totalExpense, totalInvest, netCashChange }
}

// 预估资产计算引擎
function calculateAssetTimeline(records) {
  const timeline = []
  let asset = BASE.startAsset
  let investAsset = BASE.initStock + BASE.initFund

  for (let y = BASE.startYear; y <= BASE.endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const key = `${y}-${String(m).padStart(2, '0')}`
      const record = records[key]
      const actual = record && record.actualData ? record.actualData : null

      if (actual && actual.cleared === true) {
        // 已清零：当月无任何变动，asset 和 investAsset 均保持与上月相同
        // 不做任何累加
      } else if (actual && actual.netAsset !== undefined && actual.netAsset !== null && actual.netAsset !== '') {
        asset = parseFloat(actual.netAsset)
        // 仅当显式设置了投资字段时才覆盖 investAsset，否则保留上月值，避免清零时投资基数被误置为0
        const hasInvestField = (actual.stock !== undefined && actual.stock !== '') ||
                               (actual.fund !== undefined && actual.fund !== '') ||
                               (actual.otherInvest !== undefined && actual.otherInvest !== '')
        if (hasInvestField) {
          investAsset = parseFloat(actual.stock || 0) + parseFloat(actual.fund || 0) + parseFloat(actual.otherInvest || 0)
        }
      } else if (actual) {
        const actualIncome = parseFloat(actual.mainIncome || 0) + parseFloat(actual.sideIncome || 0) + parseFloat(actual.bonus || 0)
        const actualExpense = parseFloat(actual.fixedExpense || 0) + parseFloat(actual.mortgage || 0) + parseFloat(actual.bigExpense || 0) + parseFloat(actual.otherExpense || 0)
        let customInc = 0, customExp = 0
        ;(actual.customItems || []).forEach(item => {
          const cat = item.category || 'other'
          const amt = parseFloat(item.amount || 0)
          if (['income', 'side_income', 'bonus'].includes(cat)) customInc += amt
          else if (['fixed_expense', 'mortgage', 'big_expense'].includes(cat)) customExp += amt
        })
        const actualInvest = parseFloat(actual.fund || 0) + parseFloat(actual.stock || 0) + parseFloat(actual.otherInvest || 0)
        const monthlyGrowth = actualIncome + customInc - actualExpense - customExp
        const investReturn = investAsset * 0.004
        if (actual.house !== undefined && actual.house !== '' && actual.loan !== undefined && actual.loan !== '') {
          const houseVal = parseFloat(actual.house || BASE.initHouse)
          const loanVal = parseFloat(actual.loan || 0)
          asset = houseVal - loanVal + actualInvest + (asset - investAsset - (BASE.initHouse - BASE.initLoan))
        } else {
          asset += monthlyGrowth + investReturn
        }
        investAsset += actualInvest + investReturn
      } else {
        const plan = getMonthlyPlan(y, m)
        const monthlyInvest = plan.investItems.filter(a => a.planned > 0 && a.id !== 'hold_stock' && a.id !== 'hold_fund').reduce((s, a) => s + a.planned, 0)
        let monthlyGrowth = plan.totalIncome - plan.totalExpense
        if (y === 2035 && m <= 6) monthlyGrowth = -8.0
        const investReturn = investAsset * 0.004
        asset += monthlyGrowth + investReturn
        investAsset += monthlyInvest + investReturn
      }

      timeline.push({
        key, year: y, month: m,
        asset: Math.round(asset * 10) / 10,
        phase: getPhase(y)
      })
    }
  }
  return timeline
}

// 归一化持仓数据
function normalizeHolding(holding) {
  if (!holding) {
    return {
      stockAccounts: INIT_HOLDING.stockAccounts.map(function(a) { return { name: a.name, items: a.items.map(function(i) { return JSON.parse(JSON.stringify(i)) }) } }),
      fundAccounts: INIT_HOLDING.fundAccounts.map(function(a) { return { name: a.name, items: a.items.map(function(i) { return JSON.parse(JSON.stringify(i)) }) } }),
      totalStock: INIT_HOLDING.totalStock,
      totalFund: INIT_HOLDING.totalFund,
      updatedAt: INIT_HOLDING.updatedAt
    }
  }
  
  var result = {}
  var keys = Object.keys(holding)
  for (var k = 0; k < keys.length; k++) {
    // 跳过云数据库系统字段，避免干扰后续逻辑
    if (keys[k] === '_id' || keys[k] === '_openid' || keys[k] === '_ownerOpenid') continue
    result[keys[k]] = holding[keys[k]]
  }
  
  // 处理 stocks -> stockAccounts 的兼容
  if (holding.stocks && !holding.stockAccounts) {
    result.stockAccounts = [{ name: '股票账户', items: holding.stocks.map(function(s) { return JSON.parse(JSON.stringify(s)) }) }]
  }
  if (holding.funds && !holding.fundAccounts) {
    result.fundAccounts = [{ name: '基金账户', items: holding.funds.map(function(f) { return JSON.parse(JSON.stringify(f)) }) }]
  }
  
  // 确保 stockAccounts 存在且每个账户都有 items 数组
  if (!result.stockAccounts || !Array.isArray(result.stockAccounts)) {
    result.stockAccounts = [{ name: '股票账户', items: [] }]
  } else {
    for (var si = 0; si < result.stockAccounts.length; si++) {
      if (!result.stockAccounts[si]) {
        result.stockAccounts[si] = { name: '股票账户', items: [] }
      }
      if (!result.stockAccounts[si].items || !Array.isArray(result.stockAccounts[si].items)) {
        result.stockAccounts[si].items = []
      }
      if (!result.stockAccounts[si].name) {
        result.stockAccounts[si].name = '股票账户'
      }
    }
  }
  
  // 确保 fundAccounts 存在且每个账户都有 items 数组
  if (!result.fundAccounts || !Array.isArray(result.fundAccounts)) {
    result.fundAccounts = [{ name: '基金账户', items: [] }]
  } else {
    for (var fi = 0; fi < result.fundAccounts.length; fi++) {
      if (!result.fundAccounts[fi]) {
        result.fundAccounts[fi] = { name: '基金账户', items: [] }
      }
      if (!result.fundAccounts[fi].items || !Array.isArray(result.fundAccounts[fi].items)) {
        result.fundAccounts[fi].items = []
      }
      if (!result.fundAccounts[fi].name) {
        result.fundAccounts[fi].name = '基金账户'
      }
    }
  }
  
  // 确保 totalStock 和 totalFund 有值
  if (result.totalStock === undefined || result.totalStock === null) {
    var ts = 0
    for (var a = 0; a < result.stockAccounts.length; a++) {
      for (var b = 0; b < result.stockAccounts[a].items.length; b++) {
        ts += (result.stockAccounts[a].items[b].value || 0)
      }
    }
    result.totalStock = ts || INIT_HOLDING.totalStock
  }
  if (result.totalFund === undefined || result.totalFund === null) {
    var tf = 0
    for (var c = 0; c < result.fundAccounts.length; c++) {
      for (var d = 0; d < result.fundAccounts[c].items.length; d++) {
        tf += (result.fundAccounts[c].items[d].value || 0)
      }
    }
    result.totalFund = tf || INIT_HOLDING.totalFund
  }
  
  return result
}

function getLatestHolding(holdingRecordsCache) {
  if (!holdingRecordsCache) return normalizeHolding(null)
  
  // 判断是否为直接的持仓对象（包含 totalStock/totalFund/stockAccounts 等字段）
  if (holdingRecordsCache.totalStock !== undefined || holdingRecordsCache.totalFund !== undefined ||
      holdingRecordsCache.stockAccounts || holdingRecordsCache.fundAccounts) {
    return normalizeHolding(holdingRecordsCache)
  }
  
  // 按月份key组织的字典结构，过滤掉非月份key（如 _id, updatedAt 等）
  const monthKeyPattern = /^\d{4}-\d{2}$/
  const keys = Object.keys(holdingRecordsCache).filter(function(k) {
    return monthKeyPattern.test(k)
  }).sort()
  
  if (keys.length === 0) {
    // 可能是直接对象但没有标准字段，尝试直接归一化
    return normalizeHolding(holdingRecordsCache)
  }
  return normalizeHolding(holdingRecordsCache[keys[keys.length - 1]])
}

function flattenHolding(holding) {
  const h = normalizeHolding(holding)
  const stocks = h.stockAccounts.flatMap(a => a.items.map(item => ({ ...item, accountName: a.name })))
  const funds = h.fundAccounts.flatMap(a => a.items.map(item => ({ ...item, accountName: a.name })))
  return { stocks, funds }
}

// 生成购买建议
function generateAdvice(holding, yearMonth) {
  const parts = yearMonth.split('-').map(Number)
  const year = parts[0], month = parts[1] || 1
  const phase = getPhase(year)
  const plan = getMonthlyPlan(year, month)

  const totalStockWan = (holding.totalStock || 100000) / 10000
  const totalFundWan = (holding.totalFund || 90000) / 10000
  const totalInvest = totalStockWan + totalFundWan

  const monthlyInvestAmt = plan.investItems
    .filter(a => a.id === 'invest' || a.id === 'monthly_invest')
    .reduce((s, a) => s + a.planned, 0)
  const bonusAmt = plan.investItems
    .filter(a => a.id === 'bonus_invest')
    .reduce((s, a) => s + a.planned, 0)
  const totalBudget = monthlyInvestAmt + bonusAmt

  const targetRatio = {
    1: { aStock: 0.40, hkOverseas: 0.20, bond: 0.25, gold: 0.05, cash: 0.10 },
    2: { aStock: 0.45, hkOverseas: 0.25, bond: 0.20, gold: 0.05, cash: 0.05 },
    3: { aStock: 0.35, hkOverseas: 0.25, bond: 0.30, gold: 0.05, cash: 0.05 }
  }
  const ratio = targetRatio[phase] || targetRatio[1]

  const suggestions = []
  const categories = ['aStock', 'hkOverseas', 'bond', 'gold']
  const catLabels = { aStock: 'A股宽基', hkOverseas: '港股/海外', bond: '债券/固收', gold: '黄金' }

  categories.forEach(cat => {
    const target = ratio[cat] || 0
    const amt = Math.round(totalBudget * target * 100) / 100
    if (amt > 0 && RECOMMEND_POOL[cat]) {
      const pool = RECOMMEND_POOL[cat]
      const pick = pool[Math.floor(Math.random() * pool.length)]
      suggestions.push({
        category: catLabels[cat],
        target: `${(target * 100).toFixed(0)}%`,
        amount: amt,
        recommend: pick
      })
    }
  })

  return { phase, totalBudget, suggestions, ratio }
}

// ===== 持仓智能分类 =====

// 地域建议配比（取区间中值作为展示基准，同时保留区间文本）
const REGION_TARGET = [
  { key: 'domestic', label: '🇨🇳 国内市场', min: 35, max: 40, color: '#EF4444' },
  { key: 'us',       label: '🇺🇸 美股市场', min: 30, max: 35, color: '#3B82F6' },
  { key: 'hk',       label: '🇭🇰 港股市场', min: 10, max: 15, color: '#F59E0B' },
  { key: 'global',   label: '🌏 全球/其他', min: 10, max: 15, color: '#8B5CF6' }
]

// 资产类型建议配比（来自"定投领航员"表格）
const ASSET_TYPE_TARGET = [
  { key: 'broadIndex',  label: '📊 宽基指数(美股+A股)', group: '核心进攻', pct: 30, color: '#3B82F6' },
  { key: 'industryETF', label: '🏭 行业/主题ETF', group: '核心进攻', pct: 5,  color: '#60A5FA' },
  { key: 'dividend',    label: '💰 红利/价值指数', group: '稳健增值', pct: 10, color: '#F59E0B' },
  { key: 'activeFund',  label: '⚡ 主动/增强基金', group: '稳健增值', pct: 10, color: '#FBBF24' },
  { key: 'pureBond',    label: '📜 纯债基金', group: '防守底仓', pct: 15, color: '#10B981' },
  { key: 'convBond',    label: '🔄 可转债基金', group: '防守底仓', pct: 5,  color: '#34D399' },
  { key: 'hedge',       label: '🧮 量化对冲/中性', group: '防守底仓', pct: 5,  color: '#6EE7B7' },
  { key: 'gold',        label: '🥇 黄金', group: '另类资产', pct: 5, color: '#EAB308' },
  { key: 'reits',       label: '🏢 REITs(不动产)', group: '另类资产', pct: 5, color: '#A78BFA' },
  { key: 'commodity',   label: '🛢️ 大宗商品(原油等)', group: '另类资产', pct: 2.5, min: 0, max: 5, color: '#C084FC' },
  { key: 'singleStock', label: '🎯 个股', group: '高波卫星', pct: 5, color: '#EC4899' }
]

/**
 * 按地域分类单个持仓项
 * @param {Object} item { name, code, currency, ... }
 * @returns {string} 'domestic' | 'us' | 'hk' | 'global'
 */
function classifyRegion(item) {
  var name = (item && item.name) ? String(item.name) : ''
  var code = (item && item.code) ? String(item.code) : ''
  var currency = (item && item.currency) ? String(item.currency).toUpperCase() : 'CNY'

  // 1. 币种优先（最准确）
  if (currency === 'USD') return 'us'
  if (currency === 'HKD') return 'hk'

  // 2. 名称关键词匹配（CNY标的里有QDII/跨境ETF）
  var text = name + ' ' + code
  // 美股相关
  if (/纳指|纳斯达克|标普|道琼斯|美股|美国|QDII.*美|罗素|华泰柏瑞标普|博时标普|大成标普|华宝标普/i.test(text)) return 'us'
  if (/^51(3100|3500|3800|3030|3350)|^159834|^159659/.test(code)) return 'us' // 常见美股ETF代码
  // 港股相关
  if (/港股|恒生|恒科|H股|国企|中概|互联网.*ETF|恒指/i.test(text)) return 'hk'
  if (/^51(3050|3060|5700|3090|3180|3220)|^159920|^159792|^513770/.test(code)) return 'hk'
  // 全球/其他（黄金、REITs、大宗、全球配置）
  if (/黄金|白银|石油|原油|大宗|商品|REIT|不动产|全球|越南|德国|日经|日本|欧洲|新兴市场/i.test(text)) return 'global'
  if (/^518(880|800|860|890)|^159934|^159937|^161226/.test(code)) return 'global' // 黄金相关ETF

  // 3. 默认国内
  return 'domestic'
}

/**
 * 按资产类型分类单个持仓项（股票 or 基金）
 * @param {Object} item
 * @param {string} kind 'stock' | 'fund'
 */
function classifyAssetType(item, kind) {
  var name = (item && item.name) ? String(item.name) : ''
  var code = (item && item.code) ? String(item.code) : ''
  var text = name + ' ' + code

  // 黄金
  if (/黄金|白银/i.test(text) || /^518(880|800|860|890)/.test(code)) return 'gold'
  // REITs / 不动产
  if (/REIT|不动产|基础设施/i.test(text)) return 'reits'
  // 大宗商品
  if (/原油|石油|豆粕|有色|大宗|商品|天然气/i.test(text)) return 'commodity'
  // 可转债
  if (/可转债|转债/i.test(text)) return 'convBond'
  // 纯债 / 债券基金 / 国债
  if (/纯债|债券|国债|信用债|短债|中短债/i.test(text) && !/可转/.test(text)) return 'pureBond'
  // 量化对冲
  if (/量化|对冲|中性|套利/i.test(text)) return 'hedge'
  // 红利/价值
  if (/红利|价值|低波|高股息/i.test(text)) return 'dividend'
  // 宽基指数（沪深300、中证500/1000、创业板、科创50、上证50、纳指、标普、恒生等）
  if (/沪深300|中证(500|1000|800|A50|A500)|创业板|科创50|上证50|上证180|深证100|纳指|纳斯达克|标普|恒生|恒指|MSCI/i.test(text)) return 'broadIndex'
  if (/宽基|指数ETF/i.test(text)) return 'broadIndex'
  // 行业/主题ETF
  if (/医药|医疗|生物|科技|半导体|芯片|5G|新能源|军工|消费|白酒|银行|证券|地产|光伏|汽车|人工智能|AI|机器人|游戏|传媒|化工|有色|券商|保险/i.test(text)) return 'industryETF'
  // 主动/增强基金（名称含"混合/主动/优选/精选/甄选/增强"等关键词）
  if (kind === 'fund' && /混合|主动|优选|精选|甄选|增强|成长|价值精选|明星|经理/i.test(text)) return 'activeFund'

  // 兜底：个股（股票默认归类到高波卫星"个股"），基金默认归到主动基金
  if (kind === 'stock') return 'singleStock'
  return 'activeFund'
}

/**
 * 分析当前持仓，按地域和类型汇总市值（CNY）
 * @param {Object} holding normalized holding
 * @returns {Object} { byRegion: {key: cnyAmount}, byType: {key: cnyAmount}, totalCNY }
 */
function analyzeAllocation(holding) {
  var h = holding || {}
  var byRegion = {}
  var byType = {}
  var totalCNY = 0

  function accumulate(accList, kind) {
    for (var i = 0; i < (accList || []).length; i++) {
      var acc = accList[i]
      if (!acc || !acc.items) continue
      for (var j = 0; j < acc.items.length; j++) {
        var it = acc.items[j]
        if (!it) continue
        var cur = it.currency || 'CNY'
        var val = parseFloat(it.value) || 0
        if (val <= 0) continue
        var cny = it.cnValue !== undefined ? it.cnValue : (val * (FX_RATES[cur] || 1))
        totalCNY += cny
        var region = classifyRegion(it)
        var type = classifyAssetType(it, kind)
        byRegion[region] = (byRegion[region] || 0) + cny
        byType[type] = (byType[type] || 0) + cny
      }
    }
  }

  accumulate(h.stockAccounts, 'stock')
  accumulate(h.fundAccounts, 'fund')

  return { byRegion: byRegion, byType: byType, totalCNY: totalCNY }
}

// ===== API 请求 =====
function loadRecordsFromAPI(apiBase) {
  return new Promise((resolve) => {
    // 先尝试本地缓存
    const localData = wx.getStorageSync('wealth_plan_records')

    wx.request({
      url: `${apiBase}/api/records`,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.code === 0 && res.data.data && Object.keys(res.data.data).length > 0) {
          try { wx.setStorageSync('wealth_plan_records', res.data.data) } catch (e) { }
          resolve(res.data.data)
        } else if (localData && Object.keys(localData).length > 0) {
          resolve(localData)
        } else {
          resolve({})
        }
      },
      fail: () => {
        resolve(localData || {})
      }
    })
  })
}

function loadHoldingRecordsFromAPI(apiBase) {
  return new Promise((resolve) => {
    const localData = wx.getStorageSync('wealth_holding_records')

    wx.request({
      url: `${apiBase}/api/holdings`,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.code === 0 && res.data.data && Object.keys(res.data.data).length > 0) {
          try { wx.setStorageSync('wealth_holding_records', res.data.data) } catch (e) { }
          resolve(res.data.data)
        } else if (localData && Object.keys(localData).length > 0) {
          resolve(localData)
        } else {
          resolve({})
        }
      },
      fail: () => {
        resolve(localData || {})
      }
    })
  })
}

module.exports = {
  BASE,
  INIT_HOLDING,
  RECOMMEND_POOL,
  FX_RATES,
  CURRENCY_SYMBOLS,
  REGION_TARGET,
  ASSET_TYPE_TARGET,
  toCNY,
  getPhase,
  getPhaseColor,
  getPhaseLabel,
  getCurrentMonthKey,
  parseMonthKey,
  formatMonthKey,
  getMonthlyPlan,
  calculateAssetTimeline,
  normalizeHolding,
  getLatestHolding,
  flattenHolding,
  generateAdvice,
  classifyRegion,
  classifyAssetType,
  analyzeAllocation,
  loadRecordsFromAPI,
  loadHoldingRecordsFromAPI
}