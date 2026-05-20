// pages/overview/overview.js
const { BASE, getPhase, getPhaseLabel, getCurrentMonthKey, getLatestHolding, calculateAssetTimeline } = require('../../utils/data.js')
const app = getApp()

Page({
  data: {
    showPwdModal: true,
    pwdInput: '',
    pwdError: false,
    currentAsset: '272.0',
    progressPct: '27.2',
    gap: '728',
    netAsset: '272',
    phaseTag: 'Phase 1',
    currentPhase: 1,
    assetItems: [],
    growthData: [],
    assetTrend: [],
    assetTrendSelected: -1,
    phases: [
      { phase: 1, period: '2026–2029 · 34~38岁', desc: '¥272万 → ¥520万 · 奠基期', target: '520', emoji: '🔵', bgColor: '#EFF6FF', valueColor: '#3B82F6' },
      { phase: 2, period: '2030–2034 · 39~43岁', desc: '¥520万 → ¥900万 · 加速期', target: '900', emoji: '🟡', bgColor: '#FEFCE8', valueColor: '#EAB308' },
      { phase: 3, period: '2035–2041 · 44~50岁', desc: '¥850万 → ¥1050万+ · 收官期', target: '1050', emoji: '🟢', bgColor: '#F0FFF4', valueColor: '#22C55E' }
    ],
    rules: [
      { title: '奖金一分不花，全部投资', desc: '奖金是超额完成的核心弹药', icon: '🎁', bgColor: '#FEF2F2' },
      { title: '换房首付不动权益仓', desc: '只动固收+卖旧房，保住复利引擎', icon: '🛡️', bgColor: '#FFFBEB' },
      { title: '宽基ETF定投，不追热点', desc: '纪律 > 择时，坚持比聪明更重要', icon: '📊', bgColor: '#EFF6FF' }
    ],
    showAssetEditModal: false,
    assetEditData: {}
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    const app = getApp()
    if (app.globalData.isAuthenticated) {
      this.setData({ showPwdModal: false })
      this.refreshData()
    } else {
      this.setData({ showPwdModal: true, pwdInput: '', pwdError: false })
    }
  },

  onDataReady() {
    this.refreshData()
  },

  refreshData() {
    const timeline = app.globalData.assetTimeline
    const records = app.globalData.records
    if (!timeline || timeline.length === 0) return

    const curKey = getCurrentMonthKey()
    const curIdx = timeline.findIndex(t => t.key === curKey)
    const cur = curIdx >= 0 ? timeline[curIdx] : timeline[0]
    if (!cur) return

    const savedAsset = (records['__assetStructure__'] && records['__assetStructure__'].actualData) || {}
    const cashWan = savedAsset.cash !== undefined && savedAsset.cash !== '' ? parseFloat(savedAsset.cash) : 50
    const stockWan = savedAsset.stock !== undefined && savedAsset.stock !== '' ? parseFloat(savedAsset.stock) : (getLatestHolding(app.globalData.holdingRecordsCache).totalStock || 130000) / 10000
    const fundWan = savedAsset.fund !== undefined && savedAsset.fund !== '' ? parseFloat(savedAsset.fund) : (getLatestHolding(app.globalData.holdingRecordsCache).totalFund || 90000) / 10000
    const houseWan = savedAsset.house !== undefined && savedAsset.house !== '' ? parseFloat(savedAsset.house) : BASE.initHouse
    const loanWan = savedAsset.loan !== undefined && savedAsset.loan !== '' ? parseFloat(savedAsset.loan) : BASE.initLoan

    const totalNetAsset = cashWan + stockWan + fundWan + houseWan - loanWan
    const displayAsset = totalNetAsset
    const pct = Math.min(100, (displayAsset / BASE.targetAsset * 100)).toFixed(1)
    const gap = Math.max(0, BASE.targetAsset - displayAsset).toFixed(0)

    const assetItems = [
      { name: '银行现金基金', valueText: `¥${cashWan}万`, color: '#22C55E', pct: (cashWan / totalNetAsset * 100).toFixed(1) },
      { name: '股票持仓', valueText: `¥${stockWan.toFixed(1)}万`, color: '#3B82F6', pct: (stockWan / totalNetAsset * 100).toFixed(1) },
      { name: '基金持仓', valueText: `¥${fundWan.toFixed(1)}万`, color: '#06B6D4', pct: (fundWan / totalNetAsset * 100).toFixed(1) },
      { name: '深圳翻身片区房产', valueText: `¥${houseWan}万`, color: '#A78BFA', pct: (houseWan / totalNetAsset * 100).toFixed(1) },
      { name: '房贷余额（负债）', valueText: `-¥${loanWan}万`, color: '#FA5151', pct: 0 }
    ]

    const years = [2026, 2028, 2030, 2032, 2034, 2036, 2038, 2040, 2041]
    const growthData = years.map(y => {
      const item = timeline.find(t => t.year === y && t.month === 12) || timeline.find(t => t.year === y)
      const asset = item ? item.asset.toFixed(0) : '0'
      const pctVal = item ? Math.min(100, item.asset / BASE.targetAsset * 100).toFixed(0) : 0
      const phase = getPhase(y)
      const colors = { 1: '#3B82F6', 2: '#EAB308', 3: '#22C55E' }
      return { year: y, asset, pct: pctVal, color: colors[phase] || '#07C160' }
    })

    // 资产变化趋势：本地存储历史净资产快照
    let assetHistory = []
    try { assetHistory = wx.getStorageSync('wealth_asset_history') || [] } catch(e) {}
    const nowTs = Date.now()
    // 按天去重：同一天只保留最新一条
    const nowDate = new Date(nowTs)
    const todayKey = nowDate.getFullYear() + '-' + String(nowDate.getMonth()+1).padStart(2,'0') + '-' + String(nowDate.getDate()).padStart(2,'0')
    assetHistory = assetHistory.filter(h => {
      const d = new Date(h.ts || 0)
      const dk = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
      return dk !== todayKey
    })
    assetHistory.push({ ts: nowTs, value: totalNetAsset })
    if (assetHistory.length > 90) assetHistory = assetHistory.slice(assetHistory.length - 90)
    try { wx.setStorageSync('wealth_asset_history', assetHistory) } catch(e) {}

    // 智能聚合：超过12条时按月聚合（取每月最后一条），否则按天显示
    let displayHistory = assetHistory
    if (assetHistory.length > 12) {
      // 按月聚合，每月取最后一条
      const monthMap = {}
      assetHistory.forEach(h => {
        const d = new Date(h.ts)
        const mk = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')
        monthMap[mk] = h  // 后面的会覆盖前面的，即每月最后一条
      })
      displayHistory = Object.keys(monthMap).sort().map(mk => monthMap[mk])
    }

    const maxAsset = displayHistory.reduce((m, h) => Math.max(m, h.value), 0)
    const maxBarH = 120
    const isMonthMode = assetHistory.length > 12
    const assetTrend = displayHistory.map((h, i) => {
      const d = new Date(h.ts)
      const shortLabel = isMonthMode
        ? (d.getMonth()+1) + '月'
        : (d.getMonth()+1) + '/' + d.getDate()
      const label = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
      const barH = Math.max(8, maxAsset > 0 ? Math.round(h.value / maxAsset * maxBarH) : 8)
      const prev = i > 0 ? displayHistory[i-1] : null
      let diffText = '', diffColor = '#07C160'
      if (prev) {
        const diff = h.value - prev.value
        const diffPct = prev.value > 0 ? (diff / prev.value * 100) : 0
        diffColor = diff >= 0 ? '#07C160' : '#FA5151'
        diffText = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '万 (' + (diff >= 0 ? '+' : '') + diffPct.toFixed(1) + '%)'
      }
      return { ts: h.ts, shortLabel, label, valueText: h.value.toFixed(1), barH, color: '#22C55E', diffText, diffColor }
    })

    this.setData({
      currentAsset: displayAsset.toFixed(1),
      progressPct: pct,
      gap: gap,
      netAsset: totalNetAsset.toFixed(0),
      phaseTag: getPhaseLabel(cur.phase),
      currentPhase: cur.phase,
      assetItems,
      growthData,
      assetTrend,
      assetTrendSelected: -1
    })
  },

  goPhase(e) {
    wx.switchTab({ url: '/pages/phases/phases' })
  },

  onPwdInput(e) {
    this.setData({ pwdInput: e.detail.value, pwdError: false })
  },

  onPwdConfirm() {
    const pwd = this.data.pwdInput
    if (pwd === 'Lynn9236') {
      const app = getApp()
      app.globalData.isAuthenticated = true
      this.setData({ showPwdModal: false, pwdInput: '', pwdError: false })
      this.refreshData()
    } else {
      this.setData({ pwdError: true, pwdInput: '' })
    }
  },

  onAssetTrendTap(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ assetTrendSelected: idx })
  },

  // ===== 资产编辑功能 =====
  openAssetEditModal() {
    const records = app.globalData.records
    const savedAsset = (records['__assetStructure__'] && records['__assetStructure__'].actualData) || {}
    const latestHolding = getLatestHolding(app.globalData.holdingRecordsCache)
    this.setData({
      showAssetEditModal: true,
      assetEditData: {
        cash: savedAsset.cash !== undefined ? String(savedAsset.cash) : '50',
        stock: savedAsset.stock !== undefined ? String(savedAsset.stock) : String(((latestHolding.totalStock || 130000) / 10000).toFixed(1)),
        fund: savedAsset.fund !== undefined ? String(savedAsset.fund) : String(((latestHolding.totalFund || 90000) / 10000).toFixed(1)),
        house: savedAsset.house !== undefined ? String(savedAsset.house) : String(BASE.initHouse),
        loan: savedAsset.loan !== undefined ? String(savedAsset.loan) : String(BASE.initLoan)
      }
    })
  },

  closeAssetEditModal() {
    this.setData({ showAssetEditModal: false })
  },

  onAssetEditInput(e) {
    const field = e.currentTarget.dataset.field
    const updateData = {}
    updateData['assetEditData.' + field] = e.detail.value
    this.setData(updateData)
  },

  saveAssetEdit() {
    const self = this
    const records = app.globalData.records
    records['__assetStructure__'] = {
      actualData: {
        cash: self.data.assetEditData.cash,
        stock: self.data.assetEditData.stock,
        fund: self.data.assetEditData.fund,
        house: self.data.assetEditData.house,
        loan: self.data.assetEditData.loan
      },
      updatedAt: new Date().toISOString()
    }
    app.saveRecords(records).then(function() {
      self.setData({ showAssetEditModal: false })
      wx.showToast({ title: '保存成功', icon: 'success' })
      self.refreshData()
      const pages = getCurrentPages()
      for (let i = 0; i < pages.length; i++) {
        if (pages[i].onDataReady) pages[i].onDataReady()
      }
    }).catch(function() {
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  preventMove() { }
})
