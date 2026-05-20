// pages/monthly/monthly.js
var dataUtils = require('../../utils/data.js')
var BASE = dataUtils.BASE
var getPhase = dataUtils.getPhase
var getPhaseLabel = dataUtils.getPhaseLabel
var getPhaseColor = dataUtils.getPhaseColor
var getCurrentMonthKey = dataUtils.getCurrentMonthKey
var parseMonthKey = dataUtils.parseMonthKey
var formatMonthKey = dataUtils.formatMonthKey
var getMonthlyPlan = dataUtils.getMonthlyPlan
var calculateAssetTimeline = dataUtils.calculateAssetTimeline
var getLatestHolding = dataUtils.getLatestHolding
var app = getApp()

Page({
  data: {
    currentMonth: '',
    monthDisplay: '',
    currentMonthHasRecord: false,
    phaseTag: 'Phase 1',
    monthlyAsset: '280.0',
    assetChange: '较上月 +¥2.5万',
    monthlyProgress: '完成 28.0%',
    actionCount: '',
    incomeItems: [],
    expenseItems: [],
    investItems: [],
    totalIncome: '0',
    totalExpense: '0',
    netCashChange: '0',
    monthPills: [],
    twelveMonths: [],
    cashTrend: [],
    cashTrendSelected: -1,
    scrollIntoView: '',
    showActualModal: false,
    actualData: {},
    // 自定义项目相关
    customItems: [],
    showCustomItemModal: false,
    customItemName: '',
    customItemCategory: 'income',
    customItemAmount: '',
    customItemNote: '',
    customCategoryList: [
      { value: 'income', label: '💵 主业收入' },
      { value: 'side_income', label: '🌱 副业收入' },
      { value: 'bonus', label: '🎁 奖金/一次性' },
      { value: 'fixed_expense', label: '🏠 固定支出' },
      { value: 'mortgage', label: '🏦 固定资产贷款' },
      { value: 'big_expense', label: '💸 大额支出' },
      { value: 'invest', label: '📈 投资' },
      { value: 'asset', label: '🏠 固定资产' },
      { value: 'other', label: '📌 其他' }
    ]
  },

  onShow: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    var cm = this.data.currentMonth || getCurrentMonthKey()
    this.setData({ currentMonth: cm })
    this.refreshData()
  },

  onDataReady: function() {
    this.refreshData()
  },

  refreshData: function() {
    var currentMonth = this.data.currentMonth
    var parsed = parseMonthKey(currentMonth)
    var year = parsed.year
    var month = parsed.month
    var timeline = app.globalData.assetTimeline
    var records = app.globalData.records
    if (!timeline || timeline.length === 0) return

    var plan = getMonthlyPlan(year, month)

    // 如果当月已有录入的实际数据，用实际数字覆盖计划动作
    var actualRecord = records[currentMonth] && records[currentMonth].actualData ? records[currentMonth].actualData : null
    if (actualRecord) {
      // 收入项：用实际数据覆盖计划数字
      var actualFieldMap = {
        'salary': { field: 'mainIncome', label: '主业税后收入' },
        'side_income': { field: 'sideIncome', label: '副业收入' },
        'bonus': { field: 'bonus', label: '年终奖' }
      }
      for (var ii = 0; ii < plan.incomeItems.length; ii++) {
        var incItem = plan.incomeItems[ii]
        var mapping = actualFieldMap[incItem.id]
        if (mapping && actualRecord[mapping.field] !== undefined && actualRecord[mapping.field] !== '') {
          var actualVal = parseFloat(actualRecord[mapping.field])
          if (!isNaN(actualVal)) {
            incItem.planned = actualVal
            incItem.desc = '✅ 实际录入'
            incItem.isActual = true
          }
        }
      }

      // 支出项：用实际数据覆盖计划数字
      var expenseFieldMap = {
        'daily_expense': { field: 'fixedExpense', label: '日常固定支出' },
        'my_insurance': { field: 'bigExpense', label: '本人保险缴费' },
        'car_insurance': { field: 'bigExpense', label: '车险缴费' },
        'daughter_insurance_2026': { field: 'bigExpense', label: '女儿保险（首年大额）' },
        'daughter_insurance': { field: 'bigExpense', label: '女儿保险年缴' }
      }
      // 房贷月供单独处理
      if (actualRecord.mortgage !== undefined && actualRecord.mortgage !== '') {
        var mortgageVal = parseFloat(actualRecord.mortgage)
        if (!isNaN(mortgageVal) && mortgageVal > 0) {
          // 查找是否已有房贷项
          var hasMortgage = false
          for (var ei = 0; ei < plan.expenseItems.length; ei++) {
            if (plan.expenseItems[ei].id === 'mortgage_actual') {
              hasMortgage = true
              break
            }
          }
          if (!hasMortgage) {
            // 如果固定支出中包含了房贷，不重复添加；否则单独显示
          }
        }
      }
      for (var ei2 = 0; ei2 < plan.expenseItems.length; ei2++) {
        var expItem = plan.expenseItems[ei2]
        var expMapping = expenseFieldMap[expItem.id]
        if (expMapping && actualRecord[expMapping.field] !== undefined && actualRecord[expMapping.field] !== '') {
          var actualExpVal = parseFloat(actualRecord[expMapping.field])
          if (!isNaN(actualExpVal)) {
            expItem.planned = actualExpVal
            expItem.desc = '✅ 实际录入'
            expItem.isActual = true
          }
        }
      }
      // 其他支出
      if (actualRecord.otherExpense !== undefined && actualRecord.otherExpense !== '' && parseFloat(actualRecord.otherExpense) > 0) {
        plan.expenseItems.push({
          id: 'other_expense_actual',
          label: '其他支出',
          planned: parseFloat(actualRecord.otherExpense),
          unit: '万',
          category: 'expense',
          desc: '✅ 实际录入',
          isActual: true
        })
      }

      // 投资项：用实际数据覆盖
      if (actualRecord.stock !== undefined && actualRecord.stock !== '') {
        var stockVal = parseFloat(actualRecord.stock)
        if (!isNaN(stockVal)) {
          // 更新股票持仓相关项
          for (var vi = 0; vi < plan.investItems.length; vi++) {
            if (plan.investItems[vi].id === 'hold_stock') {
              plan.investItems[vi].planned = stockVal
              plan.investItems[vi].desc = '✅ 实际市值'
              plan.investItems[vi].isActual = true
            }
          }
        }
      }
      if (actualRecord.fund !== undefined && actualRecord.fund !== '') {
        var fundVal = parseFloat(actualRecord.fund)
        if (!isNaN(fundVal)) {
          for (var fi = 0; fi < plan.investItems.length; fi++) {
            if (plan.investItems[fi].id === 'hold_fund') {
              plan.investItems[fi].planned = fundVal
              plan.investItems[fi].desc = '✅ 实际市值'
              plan.investItems[fi].isActual = true
            }
          }
        }
      }
      // 其他投资
      if (actualRecord.otherInvest !== undefined && actualRecord.otherInvest !== '' && parseFloat(actualRecord.otherInvest) > 0) {
        plan.investItems.push({
          id: 'other_invest_actual',
          label: '其他投资',
          planned: parseFloat(actualRecord.otherInvest),
          unit: '万',
          category: 'invest',
          desc: '✅ 实际录入',
          isActual: true
        })
      }

      // 自定义项目也加入对应分类
      if (actualRecord.customItems && Array.isArray(actualRecord.customItems)) {
        for (var ci = 0; ci < actualRecord.customItems.length; ci++) {
          var cItem = actualRecord.customItems[ci]
          var cAmt = parseFloat(cItem.amount || 0)
          if (cAmt > 0) {
            var cCat = cItem.category || 'other'
            if (cCat === 'income' || cCat === 'side_income' || cCat === 'bonus') {
              plan.incomeItems.push({
                id: 'custom_' + ci,
                label: cItem.name || '自定义收入',
                planned: cAmt,
                unit: '万',
                category: 'income',
                desc: '✅ 自定义项目',
                isActual: true
              })
            } else if (cCat === 'fixed_expense' || cCat === 'mortgage' || cCat === 'big_expense') {
              plan.expenseItems.push({
                id: 'custom_' + ci,
                label: cItem.name || '自定义支出',
                planned: cAmt,
                unit: '万',
                category: 'expense',
                desc: '✅ 自定义项目',
                isActual: true
              })
            } else {
              plan.investItems.push({
                id: 'custom_' + ci,
                label: cItem.name || '自定义项目',
                planned: cAmt,
                unit: '万',
                category: 'invest',
                desc: '✅ 自定义项目',
                isActual: true
              })
            }
          }
        }
      }

      // 重新计算汇总
      plan.totalIncome = 0
      for (var ti = 0; ti < plan.incomeItems.length; ti++) {
        plan.totalIncome += plan.incomeItems[ti].planned
      }
      plan.totalExpense = 0
      for (var te = 0; te < plan.expenseItems.length; te++) {
        plan.totalExpense += plan.expenseItems[te].planned
      }
      plan.totalInvest = 0
      for (var tv = 0; tv < plan.investItems.length; tv++) {
        if (plan.investItems[tv].planned > 0 && plan.investItems[tv].id !== 'hold_stock' && plan.investItems[tv].id !== 'hold_fund') {
          plan.totalInvest += plan.investItems[tv].planned
        }
      }
      plan.netCashChange = plan.totalIncome - plan.totalExpense
    }

    // 月份滚动：收集所有有记录月份 + 当前月前后2个月，合并去重后排序
    var pillKeySet = {}
    // 加入当前月前后2个月
    for (var i = -2; i <= 2; i++) {
      var py = year, pm = month + i
      while (pm > 12) { pm -= 12; py++ }
      while (pm < 1) { pm += 12; py-- }
      if (py >= 2026 && py <= 2041) pillKeySet[py + '-' + String(pm).padStart(2, '0')] = true
    }
    // 加入所有有记录的月份
    var rkeys = Object.keys(records)
    for (var ri = 0; ri < rkeys.length; ri++) {
      if (/^\d{4}-\d{2}$/.test(rkeys[ri]) && records[rkeys[ri]] && records[rkeys[ri]].actualData) {
        pillKeySet[rkeys[ri]] = true
      }
    }
    // 排序生成 pills
    var allPillKeys = Object.keys(pillKeySet).sort()
    var pills = []
    for (var pi = 0; pi < allPillKeys.length; pi++) {
      var pk = allPillKeys[pi]
      var pkParsed = parseMonthKey(pk)
      pills.push({ key: pk, label: pkParsed.month + '月', hasRecord: !!( records[pk] && records[pk].actualData ) })
    }

    // 当月资产
    var tl = null
    for (var j = 0; j < timeline.length; j++) {
      if (timeline[j].key === currentMonth) {
        tl = timeline[j]
        break
      }
    }
    
    var prevKey = month > 1 
      ? year + '-' + String(month - 1).padStart(2, '0')
      : (year - 1) + '-12'
    var prevTl = null
    for (var k = 0; k < timeline.length; k++) {
      if (timeline[k].key === prevKey) {
        prevTl = timeline[k]
        break
      }
    }

    var assetText = '0'
    var changeText = ''
    var progressText = ''
    if (tl) {
      assetText = tl.asset.toFixed(1)
      var change = prevTl ? (tl.asset - prevTl.asset) : 0
      var sign = change >= 0 ? '+' : ''
      changeText = '较上月 ' + sign + '¥' + change.toFixed(1) + '万'
      progressText = '完成 ' + (tl.asset / BASE.targetAsset * 100).toFixed(1) + '%'
    }

    // 净现金变动趋势（有记录月份）
    var cashTrend = []
    var recordKeys = Object.keys(records).filter(function(k) {
      return /^\d{4}-\d{2}$/.test(k) && records[k] && records[k].actualData
    }).sort()
    var cashMaxAbs = 0
    var cashValues = []
    for (var ci = 0; ci < recordKeys.length; ci++) {
      var rk = recordKeys[ci]
      var rd = records[rk].actualData || {}
      var inc = (parseFloat(rd.mainIncome) || 0) + (parseFloat(rd.sideIncome) || 0) + (parseFloat(rd.bonus) || 0)
      var exp = (parseFloat(rd.fixedExpense) || 0) + (parseFloat(rd.mortgage) || 0) + (parseFloat(rd.bigExpense) || 0) + (parseFloat(rd.otherExpense) || 0)
      if (rd.customItems && Array.isArray(rd.customItems)) {
        for (var cxi = 0; cxi < rd.customItems.length; cxi++) {
          var cxCat = rd.customItems[cxi].category || 'other'
          var cxAmt = parseFloat(rd.customItems[cxi].amount) || 0
          if (cxCat === 'income' || cxCat === 'side_income' || cxCat === 'bonus') inc += cxAmt
          else if (cxCat === 'fixed_expense' || cxCat === 'mortgage' || cxCat === 'big_expense') exp += cxAmt
        }
      }
      var net = inc - exp
      cashValues.push(net)
      if (Math.abs(net) > cashMaxAbs) cashMaxAbs = Math.abs(net)
    }
    var maxBarH = 120
    for (var ci2 = 0; ci2 < recordKeys.length; ci2++) {
      var ck = recordKeys[ci2]
      var cv = cashValues[ci2]
      var isPos = cv >= 0
      var barH = cashMaxAbs > 0 ? Math.round(Math.abs(cv) / cashMaxAbs * maxBarH) : 8
      if (barH < 8) barH = 8
      var ckParsed = parseMonthKey(ck)
      cashTrend.push({
        key: ck,
        shortLabel: ckParsed.month + '月',
        label: formatMonthKey(ck),
        value: cv,
        valueText: (cv >= 0 ? '+' : '') + cv.toFixed(1) + '万',
        isPositive: isPos,
        barH: barH,
        color: isPos ? '#07C160' : '#FA5151'
      })
    }

    // 统计已录入和待执行项数
    var allActions = [].concat(plan.incomeItems, plan.expenseItems)
    var doneCount = 0
    for (var ac = 0; ac < allActions.length; ac++) {
      if (allActions[ac].isActual) doneCount++
    }
    var actionCountText = actualRecord 
      ? doneCount + '/' + allActions.length + '项已录入'
      : allActions.length + '项待执行'

    var currentMonthHasRecord = !!(records[currentMonth] && records[currentMonth].actualData)
    this.setData({
      monthDisplay: formatMonthKey(currentMonth),
      phaseTag: getPhaseLabel(getPhase(year)),
      monthlyAsset: assetText,
      assetChange: changeText,
      monthlyProgress: progressText,
      actionCount: actionCountText,
      incomeItems: plan.incomeItems,
      expenseItems: plan.expenseItems,
      totalIncome: plan.totalIncome.toFixed(1),
      totalExpense: plan.totalExpense.toFixed(1),
      netCashChange: plan.netCashChange.toFixed(1),
      monthPills: pills,
      cashTrend: cashTrend,
      cashTrendSelected: -1,
      scrollIntoView: 'pill-' + currentMonth,
      currentMonthHasRecord: currentMonthHasRecord
    })
  },

  selectMonth: function(e) {
    var key = e.currentTarget.dataset.key
    this.setData({ currentMonth: key })
    this.refreshData()
  },

  prevMonth: function() {
    var parsed = parseMonthKey(this.data.currentMonth)
    var y = parsed.year
    var m = parsed.month - 1
    if (m < 1) { m = 12; y-- }
    if (y < 2026) return
    this.setData({ currentMonth: y + '-' + String(m).padStart(2, '0') })
    this.refreshData()
  },

  nextMonth: function() {
    var parsed = parseMonthKey(this.data.currentMonth)
    var y = parsed.year
    var m = parsed.month + 1
    if (m > 12) { m = 1; y++ }
    if (y > 2041) return
    this.setData({ currentMonth: y + '-' + String(m).padStart(2, '0') })
    this.refreshData()
  },

  openActualModal: function() {
    var records = app.globalData.records
    var key = this.data.currentMonth
    var existing = (records[key] && records[key].actualData) ? records[key].actualData : {}
    var actualDataCopy = {}
    var keys = Object.keys(existing)
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] !== 'customItems') {
        actualDataCopy[keys[i]] = existing[keys[i]]
      }
    }
    // 自动从最新持仓同步股票/基金市值（若当月尚未手动填写，则用持仓数据预填）
    var holding = getLatestHolding(app.globalData.holdingRecordsCache)
    if (holding) {
      var holdingStockWan = (holding.totalStock / 10000).toFixed(2)
      var holdingFundWan = (holding.totalFund / 10000).toFixed(2)
      if (!actualDataCopy.stock || actualDataCopy.stock === '') {
        actualDataCopy.stock = holdingStockWan
      }
      if (!actualDataCopy.fund || actualDataCopy.fund === '') {
        actualDataCopy.fund = holdingFundWan
      }
    }
    // 恢复自定义项目
    var customItems = []
    if (existing.customItems && Array.isArray(existing.customItems)) {
      customItems = existing.customItems.map(function(item) {
        return {
          name: item.name || '',
          category: item.category || 'other',
          categoryLabel: getCategoryLabel(item.category),
          amount: item.amount || 0,
          note: item.note || ''
        }
      })
    }
    this.setData({
      showActualModal: true,
      actualData: actualDataCopy,
      customItems: customItems
    })
  },

  closeActualModal: function() {
    this.setData({ showActualModal: false })
  },

  onActualInput: function(e) {
    var field = e.currentTarget.dataset.field
    var updateData = {}
    updateData['actualData.' + field] = e.detail.value
    this.setData(updateData)
  },

  saveActualData: function() {
    var self = this
    var records = app.globalData.records
    var key = self.data.currentMonth
    if (!records[key]) records[key] = {}
    records[key].actualData = {}
    var keys = Object.keys(self.data.actualData)
    for (var i = 0; i < keys.length; i++) {
      records[key].actualData[keys[i]] = self.data.actualData[keys[i]]
    }
    // 保存自定义项目
    records[key].actualData.customItems = self.data.customItems.map(function(item) {
      return { name: item.name, category: item.category, amount: item.amount, note: item.note }
    })
    records[key].updatedAt = new Date().toISOString()
    // 注意：不手动写入 netAsset / cleared 标记，由 calculateAssetTimeline 统一按 "上月净资产 + 收支净额 + 投资收益" 累加计算

    app.saveRecords(records).then(function() {
      self.setData({ showActualModal: false })
      wx.showToast({ title: '保存成功', icon: 'success' })
      self.refreshData()
    }).catch(function() {
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  // ===== 自定义项目功能 =====
  openCustomItemModal: function() {
    this.setData({
      showCustomItemModal: true,
      customItemName: '',
      customItemCategory: 'income',
      customItemAmount: '',
      customItemNote: ''
    })
  },

  closeCustomItemModal: function() {
    this.setData({ showCustomItemModal: false })
  },

  onCustomItemInput: function(e) {
    var field = e.currentTarget.dataset.field
    var updateData = {}
    if (field === 'name') {
      updateData.customItemName = e.detail.value
    } else if (field === 'amount') {
      updateData.customItemAmount = e.detail.value
    } else if (field === 'note') {
      updateData.customItemNote = e.detail.value
    }
    this.setData(updateData)
  },

  onCustomCategorySelect: function(e) {
    this.setData({ customItemCategory: e.currentTarget.dataset.value })
  },

  confirmCustomItem: function() {
    var name = this.data.customItemName.trim()
    var amount = parseFloat(this.data.customItemAmount)
    if (!name) {
      wx.showToast({ title: '请输入项目名称', icon: 'none' })
      return
    }
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }
    var customItems = this.data.customItems
    customItems.push({
      name: name,
      category: this.data.customItemCategory,
      categoryLabel: getCategoryLabel(this.data.customItemCategory),
      amount: amount,
      note: this.data.customItemNote.trim()
    })
    this.setData({
      customItems: customItems,
      showCustomItemModal: false
    })
  },

  removeCustomItem: function(e) {
    var index = e.currentTarget.dataset.index
    var customItems = this.data.customItems
    customItems.splice(index, 1)
    this.setData({ customItems: customItems })
  },

  deleteMonthData: function() {
    var self = this
    wx.showModal({
      title: '删除本月',
      content: '删除本月所有收支记录，本月将无任何数据，确认操作？',
      success: function(res) {
        if (res.confirm) {
          var records = app.globalData.records
          var key = self.data.currentMonth

          // 删除 records 中该月数据
          if (records[key]) {
            delete records[key]
          }

          // 同步清理 assetHistory 中该月的所有快照记录
          try {
            var assetHistory = wx.getStorageSync('wealth_asset_history') || []
            var parsed = parseMonthKey(key)
            var delYear = parsed.year
            var delMonth = parsed.month
            assetHistory = assetHistory.filter(function(h) {
              var d = new Date(h.ts || 0)
              return !(d.getFullYear() === delYear && (d.getMonth() + 1) === delMonth)
            })
            wx.setStorageSync('wealth_asset_history', assetHistory)
          } catch(e) { }

          app.saveRecords(records).then(function() {
            wx.showToast({ title: '已删除', icon: 'success' })
            self.refreshData()
          })
        }
      }
    })
  },

  onCashBarTap: function(e) {
    var idx = e.currentTarget.dataset.idx
    this.setData({ cashTrendSelected: idx })
  },

  preventMove: function() { }
})

// 类别标签映射
function getCategoryLabel(cat) {
  var map = {
    'income': '💵 主业收入',
    'side_income': '🌱 副业收入',
    'bonus': '🎁 奖金/一次性',
    'fixed_expense': '🏠 固定支出',
    'mortgage': '🏦 固定资产贷款',
    'big_expense': '💸 大额支出',
    'invest': '📈 投资',
    'asset': '🏠 固定资产',
    'other': '📌 其他'
  }
  return map[cat] || '📌 其他'
}
