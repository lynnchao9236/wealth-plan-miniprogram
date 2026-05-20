// pages/investment/investment.js
var dataUtils = require('../../utils/data.js')
var getCurrentMonthKey = dataUtils.getCurrentMonthKey
var getLatestHolding = dataUtils.getLatestHolding
var normalizeHolding = dataUtils.normalizeHolding
var generateAdvice = dataUtils.generateAdvice
var formatMonthKey = dataUtils.formatMonthKey
var FX_RATES = dataUtils.FX_RATES
var analyzeAllocation = dataUtils.analyzeAllocation
var REGION_TARGET = dataUtils.REGION_TARGET
var ASSET_TYPE_TARGET = dataUtils.ASSET_TYPE_TARGET
var app = getApp()

Page({
  data: {
    currentTab: 'holding',
    totalValue: '22.0',
    stockValue: '13',
    fundValue: '9',
    updateTime: '初始数据（2026年3月）',
    stockAccounts: [],
    fundAccounts: [],
    stockPct: '59',
    fundPct: '41',
    advicePhase: 1,
    adviceBudget: '2.0',
    adviceSuggestions: [],
    regionCompare: [],
    typeGroups: [],
    allocTotalWan: '0.00',
    historyList: [],
    historyDisplayList: [],
    historyGroups: [],
    historyShowAll: false,
    historyTotalCount: 0,
    historySelectedMonth: '',
    historyTrend: [],          // [{accName, type, records:[{label,valueText,diffText,diffPctText,diffColor}]}]

    // ===== 步骤1：账户选择弹窗 =====
    showAccountPicker: false,
    pickerAccounts: [],        // [{name, type:'stock'|'fund', idx}]
    newAccName: '',
    newAccType: 'stock',

    // ===== 步骤2：批量识别弹窗 =====
    showBatchModal: false,
    batchType: 'stock',
    batchAccIdx: 0,
    batchAccName: '',
    batchText: '',
    batchPreviewItems: [],     // [{code, name, value, cost, currency, note}]
    batchPreviewCount: '0 条记录',

    // ===== 步骤3：单项编辑弹窗 =====
    showItemEditModal: false,
    editItemType: 'stock',     // 'stock'|'fund'
    editItemAccIdx: 0,
    editItemIdx: -1,           // -1 = 新增
    editItem: { name: '', code: '', currency: 'CNY', value: '', cost: '', note: '' },

    // ===== 账户重命名弹窗 =====
    showAccRenameModal: false,
    renameAccType: 'stock',
    renameAccNewType: 'stock', // 用户修改后的新类型
    renameAccIdx: 0,
    renameAccValue: '',

    // 持仓汇总预览
    previewStockTotal: '0.00',
    previewFundTotal: '0.00',
    previewTotal: '0.00'
  },

  _refreshing: false,
  _refreshTimer: null,

  onShow: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this.scheduleRefresh()
  },

  onDataReady: function() {
    this.scheduleRefresh()
  },

  scheduleRefresh: function() {
    var self = this
    if (self._refreshTimer) clearTimeout(self._refreshTimer)
    self._refreshTimer = setTimeout(function() {
      self._refreshTimer = null
      if (!self._refreshing) self.refreshData()
    }, 100)
  },

  refreshData: function() {
    if (this._refreshing) return
    this._refreshing = true

    var holding = getLatestHolding(app.globalData.holdingRecordsCache)
    var totalStock = holding.totalStock || 130000
    var totalFund = holding.totalFund || 90000
    var totalValue = totalStock + totalFund

    function buildAccountView(accList, defaultName) {
      var accounts = []
      for (var s = 0; s < accList.length; s++) {
        var acc = accList[s]
        if (!acc) continue
        var accItems = acc.items || []
        var items = []
        var accValue = 0
        var accCost = 0
        for (var si = 0; si < accItems.length; si++) {
          var item = accItems[si]
          if (!item) continue
          var itemValue = parseFloat(item.value) || 0
          var currency = item.currency || 'CNY'
          var cnValue = itemValue * (FX_RATES[currency] || 1)
          var costVal = (item.cost !== undefined && item.cost !== null && item.cost !== '') ? parseFloat(item.cost) : 0
          if (isNaN(costVal)) costVal = 0
          var cnCost = costVal * (FX_RATES[currency] || 1)
          var profit = cnValue - cnCost
          var profitPct = cnCost > 0 ? (profit / cnCost * 100) : 0
          accValue += cnValue
          accCost += cnCost
          items.push({
            name: item.name || '未知',
            code: item.code || '',
            value: itemValue,
            cnValue: cnValue,
            cost: costVal,
            cnCost: cnCost,
            currency: currency,
            showCurrency: currency !== 'CNY',
            valueText: (cnValue / 10000).toFixed(2),
            costText: costVal > 0 ? (cnCost / 10000).toFixed(2) : '—',
            profitText: costVal > 0 ? (profit >= 0 ? '+' : '') + (profit / 10000).toFixed(2) : '—',
            profitPctText: costVal > 0 ? (profitPct >= 0 ? '+' : '') + profitPct.toFixed(2) + '%' : '',
            profitColor: profit >= 0 ? '#EF4444' : '#22C55E',
            hasCost: costVal > 0,
            note: item.note || ''
          })
        }
        var accProfit = accValue - accCost
        var accProfitPct = accCost > 0 ? (accProfit / accCost * 100) : 0
        accounts.push({
          name: acc.name || defaultName,
          items: items,
          totalValueText: (accValue / 10000).toFixed(2),
          totalCostText: accCost > 0 ? (accCost / 10000).toFixed(2) : '—',
          totalProfitText: accCost > 0 ? (accProfit >= 0 ? '+' : '') + (accProfit / 10000).toFixed(2) : '—',
          totalProfitPctText: accCost > 0 ? (accProfitPct >= 0 ? '+' : '') + accProfitPct.toFixed(2) + '%' : '',
          totalProfitColor: accProfit >= 0 ? '#EF4444' : '#22C55E',
          hasCost: accCost > 0
        })
      }
      return accounts
    }

    var stockAccounts = buildAccountView(holding.stockAccounts || [], '股票账户')
    var fundAccounts = buildAccountView(holding.fundAccounts || [], '基金账户')
    var stockPct = totalValue > 0 ? Math.round(totalStock / totalValue * 100) : 0
    var fundPct = totalValue > 0 ? Math.round(totalFund / totalValue * 100) : 0

    this.setData({
      totalValue: (totalValue / 10000).toFixed(1),
      stockValue: (totalStock / 10000).toFixed(0),
      fundValue: (totalFund / 10000).toFixed(0),
      updateTime: holding.updatedAt ? holding.updatedAt + ' 更新' : '初始数据（2026年3月）',
      stockAccounts: stockAccounts,
      fundAccounts: fundAccounts,
      stockPct: String(stockPct),
      fundPct: String(fundPct)
    })

    this.renderAdvice(holding)
    this.renderHistory()

    var self = this
    setTimeout(function() { self._refreshing = false }, 200)
  },

  switchTab: function(e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab })
  },

  renderAdvice: function(holding) {
    var curKey = getCurrentMonthKey()
    var advice = generateAdvice(holding, curKey)
    var alloc = analyzeAllocation(holding)
    var totalCNY = alloc.totalCNY || 0
    var totalWan = totalCNY / 10000

    var regionCompare = REGION_TARGET.map(function(r) {
      var amtCNY = alloc.byRegion[r.key] || 0
      var amtWan = amtCNY / 10000
      var actualPct = totalCNY > 0 ? (amtCNY / totalCNY * 100) : 0
      var mid = (r.min + r.max) / 2
      var diff = actualPct - mid
      var status, statusColor, statusBg
      if (actualPct >= r.min && actualPct <= r.max) {
        status = '✓ 达标'; statusColor = '#059669'; statusBg = '#D1FAE5'
      } else if (actualPct < r.min) {
        status = '↑ 建议加仓'; statusColor = '#DC2626'; statusBg = '#FEE2E2'
      } else {
        status = '↓ 建议减仓'; statusColor = '#D97706'; statusBg = '#FEF3C7'
      }
      return {
        key: r.key, label: r.label, color: r.color,
        targetRange: r.min + '%-' + r.max + '%', targetMid: mid,
        actualPct: actualPct.toFixed(1), actualAmount: amtWan.toFixed(2),
        targetBarWidth: Math.min(100, mid), actualBarWidth: Math.min(100, actualPct),
        diffText: (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%',
        status: status, statusColor: statusColor, statusBg: statusBg
      }
    })

    var typeCompare = ASSET_TYPE_TARGET.map(function(t) {
      var amtCNY = alloc.byType[t.key] || 0
      var amtWan = amtCNY / 10000
      var actualPct = totalCNY > 0 ? (amtCNY / totalCNY * 100) : 0
      var hasRange = (t.min !== undefined && t.max !== undefined)
      var targetMid = hasRange ? (t.min + t.max) / 2 : t.pct
      var diff = actualPct - targetMid
      var status, statusColor, statusBg
      var tol = 2
      if (hasRange) {
        if (actualPct >= t.min && actualPct <= t.max) { status = '✓ 达标'; statusColor = '#059669'; statusBg = '#D1FAE5' }
        else if (actualPct < t.min) { status = '↑ 加仓'; statusColor = '#DC2626'; statusBg = '#FEE2E2' }
        else { status = '↓ 减仓'; statusColor = '#D97706'; statusBg = '#FEF3C7' }
      } else {
        if (Math.abs(diff) <= tol) { status = '✓ 达标'; statusColor = '#059669'; statusBg = '#D1FAE5' }
        else if (diff < 0) { status = '↑ 加仓'; statusColor = '#DC2626'; statusBg = '#FEE2E2' }
        else { status = '↓ 减仓'; statusColor = '#D97706'; statusBg = '#FEF3C7' }
      }
      var targetText = hasRange ? (t.min + '%-' + t.max + '%') : (t.pct + '%')
      return {
        key: t.key, label: t.label, group: t.group, color: t.color,
        targetPct: t.pct, targetText: targetText,
        actualPct: actualPct.toFixed(1), actualAmount: amtWan.toFixed(2),
        targetBarWidth: Math.min(100, targetMid * 2), actualBarWidth: Math.min(100, actualPct * 2),
        diffText: (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%',
        status: status, statusColor: statusColor, statusBg: statusBg
      }
    })

    var groupMap = {}
    typeCompare.forEach(function(t) {
      if (!groupMap[t.group]) groupMap[t.group] = { name: t.group, items: [], totalTarget: 0, totalActual: 0 }
      groupMap[t.group].items.push(t)
      groupMap[t.group].totalTarget += t.targetPct
      groupMap[t.group].totalActual += parseFloat(t.actualPct)
    })
    var typeGroups = ['核心进攻', '稳健增值', '防守底仓', '另类资产', '高波卫星'].map(function(g) {
      var grp = groupMap[g]
      if (!grp) return null
      return { name: grp.name, items: grp.items, totalTarget: grp.totalTarget.toFixed(1).replace(/\.0$/, ''), totalActual: grp.totalActual.toFixed(1) }
    }).filter(function(x) { return x })

    this.setData({
      advicePhase: advice.phase,
      adviceBudget: advice.totalBudget.toFixed(1),
      adviceSuggestions: advice.suggestions,
      regionCompare: regionCompare,
      typeGroups: typeGroups,
      allocTotalWan: totalWan.toFixed(2)
    })
  },

  renderHistory: function() {
    var holdingRecords = app.globalData.holdingRecordsCache || {}
    var monthKeyPattern = /^\d{4}-\d{2}$/
    var list = []
    var history = []
    try { history = wx.getStorageSync('wealth_holding_records_history') || [] } catch (e) { }
    if (!Array.isArray(history)) history = []

    // ===== 整体历史列表 =====
    if (history.length > 0) {
      var asc = history.slice().sort(function(a, b) { return (a.ts || 0) - (b.ts || 0) })
      var withDiff = []
      var prev = null
      for (var i = 0; i < asc.length; i++) {
        var d = asc[i].data || {}
        var totalStock = d.totalStock || 0
        var totalFund = d.totalFund || 0
        var total = totalStock + totalFund
        var diff = prev === null ? null : (total - prev)
        withDiff.push({ ts: asc[i].ts, total: total, totalStock: totalStock, totalFund: totalFund, diff: diff, data: d })
        prev = total
      }
      for (var k = withDiff.length - 1; k >= 0; k--) {
        var w = withDiff[k]
        var date = new Date(w.ts || Date.now())
        var y = date.getFullYear()
        var mo = String(date.getMonth() + 1).padStart(2, '0')
        var dd = String(date.getDate()).padStart(2, '0')
        var hh = String(date.getHours()).padStart(2, '0')
        var mm = String(date.getMinutes()).padStart(2, '0')
        var label = y + '-' + mo + '-' + dd + ' ' + hh + ':' + mm
        var diffText = '—', diffColor = '#8A8A8A'
        if (w.diff !== null) {
          var diffWan = w.diff / 10000
          if (diffWan > 0) { diffText = '+¥' + diffWan.toFixed(2) + '万'; diffColor = '#EF4444' }
          else if (diffWan < 0) { diffText = '¥' + diffWan.toFixed(2) + '万'; diffColor = '#22C55E' }
          else { diffText = '持平' }
        } else { diffText = '首次记录' }
        list.push({ key: 'h_' + w.ts, label: label, total: (w.total / 10000).toFixed(2), stock: (w.totalStock / 10000).toFixed(2), fund: (w.totalFund / 10000).toFixed(2), diffText: diffText, diffColor: diffColor })
      }
    } else {
      var isDirectObject = (holdingRecords.totalStock !== undefined || holdingRecords.totalFund !== undefined || holdingRecords.stockAccounts || holdingRecords.fundAccounts)
      if (isDirectObject) {
        var h = normalizeHolding(holdingRecords)
        var ts2 = h.totalStock || 0
        var tf2 = h.totalFund || 0
        var label2 = h.updatedAt || '当前'
        if (monthKeyPattern.test(label2)) label2 = formatMonthKey(label2)
        list.push({ key: 'current', label: label2, total: ((ts2 + tf2) / 10000).toFixed(2), stock: (ts2 / 10000).toFixed(2), fund: (tf2 / 10000).toFixed(2), diffText: '首次记录', diffColor: '#8A8A8A' })
      }
    }

    // ===== 分账户历史趋势 =====
    var accMap = {}
    var sortedHistory = history.slice().sort(function(a, b) { return (a.ts || 0) - (b.ts || 0) })
    for (var hi = 0; hi < sortedHistory.length; hi++) {
      var hd = sortedHistory[hi].data || {}
      var hts = sortedHistory[hi].ts
      var sAccs = hd.stockAccounts || []
      var fAccs = hd.fundAccounts || []
      for (var si = 0; si < sAccs.length; si++) {
        var sacc = sAccs[si]
        if (!sacc || !sacc.name) continue
        var skey = 'stock_' + sacc.name
        if (!accMap[skey]) accMap[skey] = { name: sacc.name, type: 'stock', records: [] }
        var sval = 0
        var sitems = sacc.items || []
        for (var sii = 0; sii < sitems.length; sii++) {
          sval += (parseFloat(sitems[sii].value) || 0) * (FX_RATES[sitems[sii].currency || 'CNY'] || 1)
        }
        accMap[skey].records.push({ ts: hts, value: sval })
      }
      for (var fi = 0; fi < fAccs.length; fi++) {
        var facc = fAccs[fi]
        if (!facc || !facc.name) continue
        var fkey = 'fund_' + facc.name
        if (!accMap[fkey]) accMap[fkey] = { name: facc.name, type: 'fund', records: [] }
        var fval = 0
        var fitems = facc.items || []
        for (var fii = 0; fii < fitems.length; fii++) {
          fval += (parseFloat(fitems[fii].value) || 0) * (FX_RATES[fitems[fii].currency || 'CNY'] || 1)
        }
        accMap[fkey].records.push({ ts: hts, value: fval })
      }
    }
    // 加入当前持仓最新值
    var currentHolding = app.globalData.holdingRecordsCache || {}
    var nowTs = Date.now()
    var cSAccs = currentHolding.stockAccounts || []
    var cFAccs = currentHolding.fundAccounts || []
    for (var csi = 0; csi < cSAccs.length; csi++) {
      var csacc = cSAccs[csi]
      if (!csacc || !csacc.name) continue
      var cskey = 'stock_' + csacc.name
      var csval = 0
      for (var csii = 0; csii < (csacc.items || []).length; csii++) {
        csval += (parseFloat(csacc.items[csii].value) || 0) * (FX_RATES[csacc.items[csii].currency || 'CNY'] || 1)
      }
      if (!accMap[cskey]) accMap[cskey] = { name: csacc.name, type: 'stock', records: [] }
      var csLast = accMap[cskey].records
      if (csLast.length === 0 || csLast[csLast.length - 1].value !== csval) {
        accMap[cskey].records.push({ ts: nowTs, value: csval })
      }
    }
    for (var cfi = 0; cfi < cFAccs.length; cfi++) {
      var cfacc = cFAccs[cfi]
      if (!cfacc || !cfacc.name) continue
      var cfkey = 'fund_' + cfacc.name
      var cfval = 0
      for (var cfii = 0; cfii < (cfacc.items || []).length; cfii++) {
        cfval += (parseFloat(cfacc.items[cfii].value) || 0) * (FX_RATES[cfacc.items[cfii].currency || 'CNY'] || 1)
      }
      if (!accMap[cfkey]) accMap[cfkey] = { name: cfacc.name, type: 'fund', records: [] }
      var cfLast = accMap[cfkey].records
      if (cfLast.length === 0 || cfLast[cfLast.length - 1].value !== cfval) {
        accMap[cfkey].records.push({ ts: nowTs, value: cfval })
      }
    }

    // 构建 historyTrend
    var historyTrend = []
    var accKeys = Object.keys(accMap)
    for (var ai = 0; ai < accKeys.length; ai++) {
      var acc = accMap[accKeys[ai]]
      if (!acc.records || acc.records.length === 0) continue
      var sortedRecs = acc.records.slice().sort(function(a, b) { return b.ts - a.ts })
      var trendRecords = []
      for (var ri = 0; ri < sortedRecs.length; ri++) {
        var rec = sortedRecs[ri]
        var prevRec = sortedRecs[ri + 1]
        var recDate = new Date(rec.ts)
        var recLabel = recDate.getFullYear() + '-'
          + String(recDate.getMonth() + 1).padStart(2, '0') + '-'
          + String(recDate.getDate()).padStart(2, '0')
          + ' ' + String(recDate.getHours()).padStart(2, '0')
          + ':' + String(recDate.getMinutes()).padStart(2, '0')
        var rDiffText = ri === sortedRecs.length - 1 ? '首次记录' : '—'
        var rDiffColor = '#8A8A8A'
        var rDiffPctText = ''
        if (prevRec !== undefined) {
          var rDiff = rec.value - prevRec.value
          var rDiffWan = rDiff / 10000
          if (rDiff > 0) { rDiffText = '+¥' + rDiffWan.toFixed(2) + '万'; rDiffColor = '#EF4444' }
          else if (rDiff < 0) { rDiffText = '¥' + rDiffWan.toFixed(2) + '万'; rDiffColor = '#22C55E' }
          else { rDiffText = '持平' }
          if (prevRec.value > 0) {
            var pct = rDiff / prevRec.value * 100
            rDiffPctText = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'
          }
        }
        trendRecords.push({
          label: recLabel,
          valueText: (rec.value / 10000).toFixed(2),
          diffText: rDiffText,
          diffPctText: rDiffPctText,
          diffColor: rDiffColor,
          isLatest: ri === 0
        })
      }
      historyTrend.push({
        accKey: accKeys[ai],
        accName: acc.name,
        type: acc.type,
        typeLabel: acc.type === 'stock' ? '📈 股票' : '💎 基金',
        typeColor: acc.type === 'stock' ? '#3B82F6' : '#06B6D4',
        latestValue: trendRecords.length > 0 ? trendRecords[0].valueText : '0',
        records: trendRecords
      })
    }

    // 分月分组：将 list 按月份分组，默认只显示最近20条
    var monthGroupMap = {}
    for (var mg = 0; mg < list.length; mg++) {
      var mitem = list[mg]
      var mlabel = mitem.label || ''
      var mmonth = mlabel.length >= 7 ? mlabel.substring(0, 7) : '其他'
      if (!monthGroupMap[mmonth]) monthGroupMap[mmonth] = []
      monthGroupMap[mmonth].push(mitem)
    }
    var historyMonths = Object.keys(monthGroupMap).sort(function(a, b) { return b > a ? 1 : -1 })
    var historyGroups = historyMonths.map(function(mk) {
      return { monthKey: mk, monthLabel: mk, items: monthGroupMap[mk] }
    })
    var totalCount = list.length
    var showAll = false
    var displayList = totalCount <= 20 ? list : list.slice(0, 20)

    this.setData({
      historyList: list,
      historyDisplayList: displayList,
      historyGroups: historyGroups,
      historyShowAll: showAll,
      historyTotalCount: totalCount,
      historyTrend: historyTrend
    })
  },

  // 历史记录：切换显示全部/折叠
  toggleHistoryShowAll: function() {
    var showAll = !this.data.historyShowAll
    var list = this.data.historyList
    var displayList = showAll ? list : list.slice(0, 20)
    this.setData({ historyShowAll: showAll, historyDisplayList: displayList, historySelectedMonth: '' })
  },

  // 历史记录：选择月份筛选
  selectHistoryMonth: function(e) {
    var mk = e.currentTarget.dataset.month
    var cur = this.data.historySelectedMonth
    if (cur === mk) {
      // 取消筛选
      var list = this.data.historyList
      this.setData({ historySelectedMonth: '', historyDisplayList: list.slice(0, 20), historyShowAll: false })
    } else {
      var groups = this.data.historyGroups
      var found = null
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].monthKey === mk) { found = groups[i]; break }
      }
      this.setData({ historySelectedMonth: mk, historyDisplayList: found ? found.items : [], historyShowAll: true })
    }
  },

  // ========== 步骤1：账户选择弹窗 ==========

  // 点击"更新持仓"按钮，弹出账户选择器
  openAccountPicker: function() {
    var holding = getLatestHolding(app.globalData.holdingRecordsCache)
    var accounts = []

    var stockAccs = holding.stockAccounts || []
    for (var i = 0; i < stockAccs.length; i++) {
      if (stockAccs[i] && stockAccs[i].name) {
        accounts.push({ name: stockAccs[i].name, type: 'stock', idx: i, icon: '[股]' })
      }
    }
    var fundAccs = holding.fundAccounts || []
    for (var j = 0; j < fundAccs.length; j++) {
      if (fundAccs[j] && fundAccs[j].name) {
        accounts.push({ name: fundAccs[j].name, type: 'fund', idx: j, icon: '[基]' })
      }
    }

    this.setData({
      showAccountPicker: true,
      pickerAccounts: accounts,
      newAccName: '',
      newAccType: 'stock'
    })
  },

  closeAccountPicker: function() {
    this.setData({ showAccountPicker: false })
  },

  // 选择已有账户 → 直接打开该账户的批量识别弹窗
  selectAccount: function(e) {
    var type = e.currentTarget.dataset.type
    var idx = e.currentTarget.dataset.idx
    var name = e.currentTarget.dataset.name
    this.setData({ showAccountPicker: false })
    this.openBatchForAccount(type, idx, name)
  },

  // 新增账户名输入
  onNewAccNameInput: function(e) {
    this.setData({ newAccName: e.detail.value })
  },

  // 新增账户类型选择
  onNewAccTypeChange: function(e) {
    this.setData({ newAccType: e.currentTarget.dataset.type })
  },

  // 确认新增账户 → 创建账户并打开批量识别
  confirmAddAccount: function() {
    var name = (this.data.newAccName || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入账户名', icon: 'none' })
      return
    }
    var type = this.data.newAccType

    // 在持仓数据中新增该账户
    var holding = getLatestHolding(app.globalData.holdingRecordsCache)
    var holding2 = JSON.parse(JSON.stringify(holding))

    var newIdx
    if (type === 'stock') {
      if (!holding2.stockAccounts) holding2.stockAccounts = []
      // 检查是否已存在同名
      var exists = false
      for (var i = 0; i < holding2.stockAccounts.length; i++) {
        if (holding2.stockAccounts[i].name === name) { newIdx = i; exists = true; break }
      }
      if (!exists) {
        holding2.stockAccounts.push({ name: name, items: [] })
        newIdx = holding2.stockAccounts.length - 1
      }
    } else {
      if (!holding2.fundAccounts) holding2.fundAccounts = []
      var fExists = false
      for (var j = 0; j < holding2.fundAccounts.length; j++) {
        if (holding2.fundAccounts[j].name === name) { newIdx = j; fExists = true; break }
      }
      if (!fExists) {
        holding2.fundAccounts.push({ name: name, items: [] })
        newIdx = holding2.fundAccounts.length - 1
      }
    }

    // 保存更新后的持仓（带新账户）
    app.globalData.holdingRecordsCache = holding2
    app.persistHoldingsLocal(holding2)

    this.setData({ showAccountPicker: false })
    this.openBatchForAccount(type, newIdx, name)
  },

  // ========== 步骤2：批量识别弹窗 ==========

  openBatchForAccount: function(type, accIdx, accName) {
    this.setData({
      showBatchModal: true,
      batchType: type,
      batchAccIdx: accIdx,
      batchAccName: accName,
      batchText: '',
      batchPreviewItems: [],
      batchPreviewCount: '0 条记录'
    })
  },

  closeBatchModal: function() {
    this.setData({ showBatchModal: false })
    this.refreshData()
  },

  // 智能解析批量输入文本（含币种识别）
  parseBatchText: function(text) {
    if (!text || !text.trim()) return []
    var lines = text.split('\n').map(function(l) { return l.trim() }).filter(function(l) { return l.length > 0 })
    var results = []

    // 币种识别映射
    var currencyMap = {
      'USD': 'USD', '$': 'USD', '美元': 'USD', 'US': 'USD',
      'HKD': 'HKD', 'HK$': 'HKD', '港币': 'HKD', '港元': 'HKD', 'HK': 'HKD',
      'CNY': 'CNY', 'RMB': 'CNY', '人民币': 'CNY', '¥': 'CNY', 'CN': 'CNY'
    }

    function detectCurrency(text) {
      for (var key in currencyMap) {
        if (text.toUpperCase().indexOf(key.toUpperCase()) !== -1) return currencyMap[key]
      }
      return null
    }

    for (var li = 0; li < lines.length; li++) {
      var line = lines[li]
      line = line.replace(/^[\s]*(?:\d+[\.、\)）:：]\s*|[•·・▪▸◆◇○●■□★☆※→\-\*]+\s*)/, '').trim()
      if (!line) continue
      if (/^[-=]+$/.test(line)) continue
      if (/^(代码|名称|股票|基金|市值|成本|盈亏|涨跌|持仓)/i.test(line) && !/\d/.test(line)) continue

      // 提取币种信息
      var lineCurrency = null
      var cleanLine = line

      // 尝试从行中提取币种标识
      var currencyPatterns = [
        /\b(USD|HKD|CNY|RMB)\b/i,
        /(\$|HK\$|¥)/,
        /\b(美元|港币|港元|人民币)\b/
      ]
      for (var pi = 0; pi < currencyPatterns.length; pi++) {
        var pm = cleanLine.match(currencyPatterns[pi])
        if (pm) {
          lineCurrency = detectCurrency(pm[0])
          cleanLine = cleanLine.replace(pm[0], '').trim()
          break
        }
      }

      // 冒号分隔格式：名称：市值
      var colonMatch = cleanLine.match(/^(.+?)\s*[：:]\s*(-?[\d,]+(?:\.\d+)?)\s*$/)
      if (colonMatch) {
        var rawName = colonMatch[1].trim()
        var value = parseFloat(colonMatch[2].replace(/,/g, '')) || 0
        var code = ''
        var codeMatch = rawName.match(/[（(](\d{4,6})[）)]/)
        if (codeMatch) { code = codeMatch[1]; rawName = rawName.replace(/\s*[（(]\d{4,6}[）)]\s*/, '').trim() }
        if (value > 0 && rawName) {
          results.push({ code: code, name: rawName, value: value, cost: 0, currency: lineCurrency || 'CNY', note: '' })
        }
        continue
      }

      var parts = cleanLine.split(/[\t,|\/]+|\s{2,}/).map(function(p) { return p.trim() }).filter(function(p) { return p.length > 0 })
      var tokens = parts
      if (parts.length === 1) {
        tokens = cleanLine.split(/\s+/).map(function(p) { return p.trim() }).filter(function(p) { return p.length > 0 })
      }
      if (tokens.length === 0) continue

      var tCode = '', tName = '', tValue = 0, tCost = 0, tNote = '', tCurrency = lineCurrency || 'CNY'

      // 从token中再尝试识别币种
      var filteredTokens = []
      for (var ti = 0; ti < tokens.length; ti++) {
        var detectedCur = detectCurrency(tokens[ti])
        if (detectedCur && !/\d/.test(tokens[ti])) {
          tCurrency = detectedCur
        } else {
          filteredTokens.push(tokens[ti])
        }
      }
      tokens = filteredTokens

      // 修复4: 去除token中的百分号再判断是否为数字
      var cleanedTokens = tokens.map(function(t) { return t.replace(/%/g, '') })
      var isNum = cleanedTokens.map(function(t) { return /^-?[\d,]+(\.\d+)?$/.test(t) && !isNaN(parseFloat(t.replace(/,/g, ''))) })
      var isCode = tokens.map(function(t) { return /^\d{5,6}$/.test(t) || /^[A-Za-z]{0,3}\d{4,6}$/.test(t) })
      // 用cleanedTokens做数字解析，tokens做名称拼接
      tokens = tokens.map(function(t, i) { return isNum[i] ? cleanedTokens[i] : t })

      if (tokens.length === 1) {
        continue
      } else if (tokens.length === 2) {
        if (isNum[1]) {
          if (isCode[0]) { tCode = tokens[0]; tName = tokens[0] } else { tName = tokens[0] }
          tValue = parseFloat(tokens[1].replace(/,/g, '')) || 0
        } else if (isNum[0]) {
          tValue = parseFloat(tokens[0].replace(/,/g, '')) || 0
          tName = tokens[1]
        } else { continue }
      } else if (tokens.length === 3) {
        if (isCode[0] && !isNum[1] && isNum[2]) {
          tCode = tokens[0]; tName = tokens[1]; tValue = parseFloat(tokens[2].replace(/,/g, '')) || 0
        } else if (!isNum[0] && isNum[1] && isNum[2]) {
          tName = tokens[0]; tCost = parseFloat(tokens[1].replace(/,/g, '')) || 0; tValue = parseFloat(tokens[2].replace(/,/g, '')) || 0
        } else if (isCode[0] && isNum[1] && isNum[2]) {
          tCode = tokens[0]; tName = tokens[0]; tCost = parseFloat(tokens[1].replace(/,/g, '')) || 0; tValue = parseFloat(tokens[2].replace(/,/g, '')) || 0
        } else if (!isNum[0] && !isNum[1] && isNum[2]) {
          tCode = tokens[0]; tName = tokens[1]; tValue = parseFloat(tokens[2].replace(/,/g, '')) || 0
        } else {
          if (isNum[1]) { tName = tokens[0]; tValue = parseFloat(tokens[1].replace(/,/g, '')) || 0; tNote = tokens[2] } else { continue }
        }
      } else if (tokens.length >= 4) {
        if (isCode[0] && !isNum[1] && isNum[2] && isNum[3]) {
          tCode = tokens[0]; tName = tokens[1]; tCost = parseFloat(tokens[2].replace(/,/g, '')) || 0; tValue = parseFloat(tokens[3].replace(/,/g, '')) || 0
          if (tokens.length > 4) tNote = tokens.slice(4).join(' ')
        } else {
          // 修复2: 把开头所有非数字token合并为名称，直到遇到第一个数字
          var firstNumIdx = -1
          for (var ni = 0; ni < tokens.length; ni++) {
            if (isNum[ni]) { firstNumIdx = ni; break }
          }
          if (firstNumIdx > 0) {
            // 检查首token是否像股票代码
            if (isCode[0] && firstNumIdx === 1) {
              tCode = tokens[0]; tName = tokens[0]
            } else {
              tName = tokens.slice(0, firstNumIdx).join(' ')
            }
            var numPart = tokens.slice(firstNumIdx)
            var numIdx = firstNumIdx
            var nums = numPart.filter(function(_, i) { return isNum[firstNumIdx + i] })
            if (nums.length >= 2) {
              tCost = parseFloat(nums[0].replace(/,/g, '')) || 0
              tValue = parseFloat(nums[1].replace(/,/g, '')) || 0
            } else if (nums.length === 1) {
              tValue = parseFloat(nums[0].replace(/,/g, '')) || 0
            }
          } else {
            var numTokens2 = tokens.filter(function(_, i) { return isNum[i] })
            var strTokens2 = tokens.filter(function(_, i) { return !isNum[i] })
            if (strTokens2.length >= 1) tName = strTokens2.join(' ')
            if (numTokens2.length >= 1) tCost = parseFloat(numTokens2[0].replace(/,/g, '')) || 0
            if (numTokens2.length >= 2) tValue = parseFloat(numTokens2[1].replace(/,/g, '')) || 0
          }
        }
      }

      if (tValue > 0 || tCost > 0) {
        results.push({ code: tCode || '', name: tName || (tCode || '未知'), value: tValue, cost: tCost || 0, currency: tCurrency, note: tNote || '' })
      }
    }
    return results
  },

  onBatchTextInput: function(e) {
    var text = e.detail.value || ''
    var items = this.parseBatchText(text)
    var total = items.reduce(function(s, i) {
      return s + i.value * (FX_RATES[i.currency] || 1)
    }, 0)
    var countText = items.length > 0 ? (items.length + ' 条记录 · 合计¥' + (total / 10000).toFixed(2) + '万') : '0 条记录'
    this.setData({ batchText: text, batchPreviewItems: items, batchPreviewCount: countText })
  },

  // 编辑预览项的字段
  onPreviewItemInput: function(e) {
    var idx = e.currentTarget.dataset.idx
    var field = e.currentTarget.dataset.field
    var items = this.data.batchPreviewItems
    if (!items[idx]) return
    items[idx][field] = e.detail.value
    var total = items.reduce(function(s, i) { return s + (parseFloat(i.value) || 0) * (FX_RATES[i.currency] || 1) }, 0)
    var countText = items.length + ' 条记录 · 合计¥' + (total / 10000).toFixed(2) + '万'
    this.setData({ batchPreviewItems: items, batchPreviewCount: countText })
  },

  // 编辑预览项币种
  onPreviewCurrencyChange: function(e) {
    var idx = e.currentTarget.dataset.idx
    var currency = e.currentTarget.dataset.currency
    var items = this.data.batchPreviewItems
    if (!items[idx]) return
    items[idx].currency = currency
    var total = items.reduce(function(s, i) { return s + (parseFloat(i.value) || 0) * (FX_RATES[i.currency] || 1) }, 0)
    var countText = items.length + ' 条记录 · 合计¥' + (total / 10000).toFixed(2) + '万'
    this.setData({ batchPreviewItems: items, batchPreviewCount: countText })
  },

  // 删除预览项
  removePreviewItem: function(e) {
    var idx = e.currentTarget.dataset.idx
    var items = this.data.batchPreviewItems
    items.splice(idx, 1)
    var total = items.reduce(function(s, i) { return s + (parseFloat(i.value) || 0) * (FX_RATES[i.currency] || 1) }, 0)
    var countText = items.length > 0 ? (items.length + ' 条记录 · 合计¥' + (total / 10000).toFixed(2) + '万') : '0 条记录'
    this.setData({ batchPreviewItems: items, batchPreviewCount: countText })
  },

  // 确认批量导入
  confirmBatchImport: function() {
    var self = this
    var items = this.data.batchPreviewItems
    if (!items || items.length === 0) {
      wx.showToast({ title: '没有解析到有效数据', icon: 'none' })
      return
    }

    var type = this.data.batchType
    var accIdx = this.data.batchAccIdx
    var accName = this.data.batchAccName
    var isStock = type === 'stock'

    // 获取最新持仓
    var holding = getLatestHolding(app.globalData.holdingRecordsCache)
    var holding2 = JSON.parse(JSON.stringify(holding))

    var targetAccs = isStock ? (holding2.stockAccounts || []) : (holding2.fundAccounts || [])

    // 确保账户存在
    if (!targetAccs[accIdx]) {
      targetAccs[accIdx] = { name: accName, items: [] }
    }

    // 构建已有项名称映射（覆盖逻辑）
    var existItems = targetAccs[accIdx].items || []
    var existMap = {}
    for (var i = 0; i < existItems.length; i++) {
      var key = (existItems[i].name || '').toLowerCase()
      if (key) existMap[key] = i
    }

    var addedCount = 0, updatedCount = 0
    for (var j = 0; j < items.length; j++) {
      var item = items[j]
      var matchKey = item.name.toLowerCase()
      var newItem = {
        name: item.name,
        code: item.code || '',
        currency: item.currency || 'CNY',
        value: parseFloat(item.value) || 0,
        cost: parseFloat(item.cost) || 0,
        note: item.note || ''
      }
      if (existMap[matchKey] !== undefined) {
        existItems[existMap[matchKey]] = newItem
        updatedCount++
      } else {
        existItems.push(newItem)
        addedCount++
      }
    }
    targetAccs[accIdx].items = existItems

    if (isStock) holding2.stockAccounts = targetAccs
    else holding2.fundAccounts = targetAccs

    // 重新计算总值
    holding2 = self._recalcHolding(holding2)

    // 保存
    app.globalData.holdingRecordsCache = holding2
    app.persistHoldingsLocal(holding2)
    app.saveHoldingRecords(holding2).catch(function(err) { console.warn('[confirmBatchImport] 云端同步失败:', err) })

    var msg = []
    if (addedCount > 0) msg.push('新增' + addedCount + '条')
    if (updatedCount > 0) msg.push('更新' + updatedCount + '条')
    wx.showToast({ title: '导入：' + (msg.join('，') || '完成'), icon: 'success' })

    self.setData({ showBatchModal: false })
    self.refreshData()
    self._syncMonthlyRecord(holding2)
  },

  // 重新计算持仓总值
  _recalcHolding: function(holding) {
    var totalStock = 0, totalFund = 0
    var sAccs = holding.stockAccounts || []
    for (var i = 0; i < sAccs.length; i++) {
      var items = sAccs[i].items || []
      for (var j = 0; j < items.length; j++) {
        totalStock += (parseFloat(items[j].value) || 0) * (FX_RATES[items[j].currency || 'CNY'] || 1)
      }
    }
    var fAccs = holding.fundAccounts || []
    for (var fi = 0; fi < fAccs.length; fi++) {
      var fitems = fAccs[fi].items || []
      for (var fj = 0; fj < fitems.length; fj++) {
        totalFund += (parseFloat(fitems[fj].value) || 0) * (FX_RATES[fitems[fj].currency || 'CNY'] || 1)
      }
    }
    holding.totalStock = totalStock
    holding.totalFund = totalFund
    holding.updatedAt = formatMonthKey(getCurrentMonthKey())
    holding.savedAt = new Date().toISOString()
    return holding
  },

  _syncMonthlyRecord: function(holding) {
    try {
      var curKey = getCurrentMonthKey()
      var records = app.globalData.records
      if (!records[curKey]) records[curKey] = {}
      if (!records[curKey].actualData) records[curKey].actualData = {}
      records[curKey].actualData.stock = holding.totalStock / 10000
      records[curKey].actualData.fund = holding.totalFund / 10000
      records[curKey].updatedAt = new Date().toISOString()
      app.saveRecords(records).catch(function(e) { console.warn('[syncMonthlyRecord] 失败:', e) })
    } catch (e) { console.warn('[syncMonthlyRecord] 异常:', e) }
  },

  // ========== 持仓列表 - 账户编辑 ==========

  // 点击账户名 → 弹出重命名弹窗
  openAccRename: function(e) {
    var type = e.currentTarget.dataset.type
    var idx = e.currentTarget.dataset.idx
    var name = e.currentTarget.dataset.name
    this.setData({
      showAccRenameModal: true,
      renameAccType: type,
      renameAccNewType: type,  // 默认新类型 = 原类型
      renameAccNewType: type,  // 默认新类型 = 原类型
      renameAccIdx: idx,
      renameAccValue: name
    })
  },

  onRenameAccNewTypeChange: function(e) {
    this.setData({ renameAccNewType: e.currentTarget.dataset.type })
  },

  onRenameAccNewTypeChange: function(e) {
    this.setData({ renameAccNewType: e.currentTarget.dataset.type })
  },

  onRenameAccInput: function(e) {
    this.setData({ renameAccValue: e.detail.value })
  },

  closeAccRename: function() {
    this.setData({ showAccRenameModal: false })
  },

  confirmAccRename: function() {
    var newName = (this.data.renameAccValue || '').trim()
    if (!newName) {
      wx.showToast({ title: '账户名不能为空', icon: 'none' })
      return
    }
    var oldType = this.data.renameAccType
    var newType = this.data.renameAccNewType || oldType
    var idx = this.data.renameAccIdx
    var holding = getLatestHolding(app.globalData.holdingRecordsCache)
    var holding2 = JSON.parse(JSON.stringify(holding))

    if (!holding2.stockAccounts) holding2.stockAccounts = []
    if (!holding2.fundAccounts) holding2.fundAccounts = []

    if (oldType === newType) {
      var accs = newType === 'stock' ? holding2.stockAccounts : holding2.fundAccounts
      if (accs && accs[idx]) accs[idx].name = newName
    } else {
      // 类型变更：把账户从旧类型迁移到新类型，持仓数据不丢失
      var srcAccs = oldType === 'stock' ? holding2.stockAccounts : holding2.fundAccounts
      var dstAccs = newType === 'stock' ? holding2.stockAccounts : holding2.fundAccounts
      if (srcAccs && srcAccs[idx]) {
        var movedAcc = JSON.parse(JSON.stringify(srcAccs[idx]))
        movedAcc.name = newName
        srcAccs.splice(idx, 1)
        dstAccs.push(movedAcc)
      }
    }

    holding2 = this._recalcHolding(holding2)
    app.globalData.holdingRecordsCache = holding2
    app.persistHoldingsLocal(holding2)
    app.saveHoldingRecords(holding2).catch(function(err) { console.warn('[renameAcc] 云端同步失败:', err) })

    this.setData({ showAccRenameModal: false })
    var msg = oldType !== newType ? ('已迁移至' + (newType === 'stock' ? '股票' : '基金') + '账户') : '账户名已更新'
    wx.showToast({ title: msg, icon: 'success', duration: 2000 })
    this.refreshData()
    this._syncMonthlyRecord(holding2)
  },

  // ========== 持仓列表 - 单项编辑 ==========

  // 点击单项 → 打开编辑弹窗
  openItemEdit: function(e) {
    var type = e.currentTarget.dataset.type
    var accIdx = e.currentTarget.dataset.accidx
    var itemIdx = e.currentTarget.dataset.itemidx

    var holding = getLatestHolding(app.globalData.holdingRecordsCache)
    var accs = type === 'stock' ? (holding.stockAccounts || []) : (holding.fundAccounts || [])
    var acc = accs[accIdx]
    if (!acc) return
    var item = acc.items[itemIdx]
    if (!item) return

    this.setData({
      showItemEditModal: true,
      editItemType: type,
      editItemAccIdx: accIdx,
      editItemIdx: itemIdx,
      editItem: {
        name: item.name || '',
        code: item.code || '',
        currency: item.currency || 'CNY',
        value: String(item.value || ''),
        cost: String(item.cost || ''),
        note: item.note || ''
      }
    })
  },

  closeItemEdit: function() {
    this.setData({ showItemEditModal: false })
  },

  onEditItemInput: function(e) {
    var field = e.currentTarget.dataset.field
    var updateData = {}
    updateData['editItem.' + field] = e.detail.value
    this.setData(updateData)
  },

  onEditItemCurrencyChange: function(e) {
    this.setData({ 'editItem.currency': e.currentTarget.dataset.currency })
  },

  confirmItemEdit: function() {
    var editItem = this.data.editItem
    var name = (editItem.name || '').trim()
    if (!name) {
      wx.showToast({ title: '名称不能为空', icon: 'none' })
      return
    }

    var type = this.data.editItemType
    var accIdx = this.data.editItemAccIdx
    var itemIdx = this.data.editItemIdx

    var holding = getLatestHolding(app.globalData.holdingRecordsCache)
    var holding2 = JSON.parse(JSON.stringify(holding))
    var accs = type === 'stock' ? holding2.stockAccounts : holding2.fundAccounts
    if (!accs || !accs[accIdx]) return

    accs[accIdx].items[itemIdx] = {
      name: name,
      code: editItem.code || '',
      currency: editItem.currency || 'CNY',
      value: parseFloat(editItem.value) || 0,
      cost: parseFloat(editItem.cost) || 0,
      note: editItem.note || ''
    }

    holding2 = this._recalcHolding(holding2)
    app.globalData.holdingRecordsCache = holding2
    app.persistHoldingsLocal(holding2)
    app.saveHoldingRecords(holding2).catch(function(err) { console.warn('[editItem] 云端同步失败:', err) })

    this.setData({ showItemEditModal: false })
    wx.showToast({ title: '已保存', icon: 'success' })
    this.refreshData()
    this._syncMonthlyRecord(holding2)
  },

  // 删除单项
  deleteItem: function(e) {
    var self = this
    var type = e.currentTarget.dataset.type
    var accIdx = e.currentTarget.dataset.accidx
    var itemIdx = e.currentTarget.dataset.itemidx

    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确认吗？',
      success: function(res) {
        if (!res.confirm) return

        var holding = getLatestHolding(app.globalData.holdingRecordsCache)
        var holding2 = JSON.parse(JSON.stringify(holding))
        var accs = type === 'stock' ? holding2.stockAccounts : holding2.fundAccounts
        if (!accs || !accs[accIdx]) return

        accs[accIdx].items.splice(itemIdx, 1)

        // 若账户下无持仓，自动删除该账户
        if (accs[accIdx].items.length === 0) {
          accs.splice(accIdx, 1)
          wx.showToast({ title: '已删除，账户也已移除', icon: 'success' })
        } else {
          wx.showToast({ title: '已删除', icon: 'success' })
        }

        holding2 = self._recalcHolding(holding2)
        app.globalData.holdingRecordsCache = holding2
        app.persistHoldingsLocal(holding2)
        app.saveHoldingRecords(holding2).catch(function(err) { console.warn('[deleteItem] 云端同步失败:', err) })

        self.refreshData()
        self._syncMonthlyRecord(holding2)
      }
    })
  },

  preventMove: function() { }
})
