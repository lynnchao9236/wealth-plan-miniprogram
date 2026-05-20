// app.js - 小程序入口（腾讯云服务器版）
var BASE = require('./utils/data.js').BASE
var calculateAssetTimeline = require('./utils/data.js').calculateAssetTimeline

// 服务器地址配置
var API_BASE = 'https://finance.goglobal.games'

// 本地存储 key 常量（多重备份）
var STORAGE_KEYS = {
  RECORDS: 'wealth_plan_records',
  RECORDS_BACKUP: 'wealth_plan_records_backup',
  HOLDINGS: 'wealth_holding_records',
  HOLDINGS_BACKUP: 'wealth_holding_records_backup',
  HOLDINGS_HISTORY: 'wealth_holding_records_history',
  META: 'wealth_meta'
}

// 判断一个持仓对象是否"有效"（至少包含一个持仓项或总额>0）
function isValidHolding(h) {
  if (!h || typeof h !== 'object') return false
  var ts = h.totalStock || 0
  var tf = h.totalFund || 0
  if (ts > 0 || tf > 0) return true
  var sAccs = h.stockAccounts || []
  var fAccs = h.fundAccounts || []
  for (var i = 0; i < sAccs.length; i++) {
    if (sAccs[i] && sAccs[i].items && sAccs[i].items.length > 0) return true
  }
  for (var j = 0; j < fAccs.length; j++) {
    if (fAccs[j] && fAccs[j].items && fAccs[j].items.length > 0) return true
  }
  return false
}

// 默认持仓（兜底）
function getDefaultHolding() {
  return {
    stockAccounts: [
      { name: '股票账户', items: [
        { code: 'mixed', name: '混合持仓', value: 130000, cost: 130000, currency: 'CNY', note: '持有不动，等待时机' }
      ]}
    ],
    fundAccounts: [
      { name: '基金账户', items: [
        { code: '510300', name: '沪深300ETF', value: 50000, cost: 50000, currency: 'CNY', note: '宽基指数定投' },
        { code: '510500', name: '中证500ETF', value: 40000, cost: 40000, currency: 'CNY', note: '宽基指数定投' }
      ]}
    ],
    totalStock: 130000,
    totalFund: 90000,
    updatedAt: '2026-03'
  }
}

// 封装 HTTP 请求（带超时）
function httpRequest(options) {
  var timeout = options.timeout || 8000
  return new Promise(function(resolve, reject) {
    var timer = setTimeout(function() {
      reject(new Error('请求超时(' + timeout + 'ms): ' + options.url))
    }, timeout)

    wx.request({
      url: options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: options.header || { 'content-type': 'application/json' },
      success: function(res) {
        clearTimeout(timer)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error('HTTP ' + res.statusCode + ': ' + JSON.stringify(res.data)))
        }
      },
      fail: function(err) {
        clearTimeout(timer)
        reject(err)
      }
    })
  })
}

App({
  globalData: {
    records: {},
    holdingRecordsCache: {},
    assetTimeline: [],
    BASE: BASE,
    isAuthenticated: false,
    apiBase: API_BASE
  },

  onLaunch: function() {
    var self = this
    // 优先使用本地缓存快速渲染，然后异步从服务器拉取覆盖
    self.preloadFromLocal()
    self.initData()
  },

  // 小程序隐藏时，兜底写一次本地
  onHide: function() {
    var self = this
    try {
      if (isValidHolding(self.globalData.holdingRecordsCache)) {
        self.persistHoldingsLocal(self.globalData.holdingRecordsCache)
      }
      if (self.globalData.records && Object.keys(self.globalData.records).length > 0) {
        wx.setStorageSync(STORAGE_KEYS.RECORDS, self.globalData.records)
        wx.setStorageSync(STORAGE_KEYS.RECORDS_BACKUP, self.globalData.records)
      }
    } catch (e) { }
  },

  // 预加载：先用本地缓存填充 globalData
  preloadFromLocal: function() {
    var self = this
    var recoveredHolding = self.recoverHoldingsFromLocal()
    var recoveredRecords = self.recoverRecordsFromLocal()

    self.globalData.records = recoveredRecords || {}
    self.globalData.holdingRecordsCache = recoveredHolding || getDefaultHolding()
    self.globalData.assetTimeline = calculateAssetTimeline(self.globalData.records)
  },

  // 从本地多重存储中恢复 holdings
  recoverHoldingsFromLocal: function() {
    var tryKeys = [STORAGE_KEYS.HOLDINGS, STORAGE_KEYS.HOLDINGS_BACKUP]
    for (var i = 0; i < tryKeys.length; i++) {
      try {
        var d = wx.getStorageSync(tryKeys[i])
        if (isValidHolding(d)) return d
      } catch (e) { }
    }
    try {
      var hist = wx.getStorageSync(STORAGE_KEYS.HOLDINGS_HISTORY)
      if (hist && hist.length > 0) {
        for (var j = hist.length - 1; j >= 0; j--) {
          if (isValidHolding(hist[j] && hist[j].data)) return hist[j].data
        }
      }
    } catch (e) { }
    return null
  },

  // 从本地恢复 records
  recoverRecordsFromLocal: function() {
    var tryKeys = [STORAGE_KEYS.RECORDS, STORAGE_KEYS.RECORDS_BACKUP]
    for (var i = 0; i < tryKeys.length; i++) {
      try {
        var d = wx.getStorageSync(tryKeys[i])
        if (d && typeof d === 'object') return d
      } catch (e) { }
    }
    return {}
  },

  // 多重持久化持仓数据（主 + 备份 + 历史存档）
  persistHoldingsLocal: function(data) {
    try { wx.setStorageSync(STORAGE_KEYS.HOLDINGS, data) } catch (e) { }
    try { wx.setStorageSync(STORAGE_KEYS.HOLDINGS_BACKUP, data) } catch (e) { }
    try {
      var hist = wx.getStorageSync(STORAGE_KEYS.HOLDINGS_HISTORY) || []
      if (!Array.isArray(hist)) hist = []
      var nowTs = Date.now()
      var nowDate = new Date(nowTs)
      var todayKey = nowDate.getFullYear() + '-' + String(nowDate.getMonth()+1).padStart(2,'0') + '-' + String(nowDate.getDate()).padStart(2,'0')
      // 同一天只保留最新一条（按天去重）
      hist = hist.filter(function(h) {
        var d = new Date(h.ts || 0)
        var dk = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
        return dk !== todayKey
      })
      hist.push({ ts: nowTs, data: data })
      if (hist.length > 60) hist = hist.slice(hist.length - 60)
      wx.setStorageSync(STORAGE_KEYS.HOLDINGS_HISTORY, hist)
    } catch (e) { }
    try {
      wx.setStorageSync(STORAGE_KEYS.META, { lastHoldingSave: Date.now() })
    } catch (e) { }
  },

  // 从本地缓存加载数据（降级方案）
  loadFromLocal: function() {
    var self = this
    var recoveredRecords = self.recoverRecordsFromLocal() || {}
    var recoveredHolding = self.recoverHoldingsFromLocal() || getDefaultHolding()

    self.globalData.records = recoveredRecords
    self.globalData.holdingRecordsCache = recoveredHolding
    self.globalData.assetTimeline = calculateAssetTimeline(self.globalData.records)

    var pages = getCurrentPages()
    for (var j = 0; j < pages.length; j++) {
      if (pages[j].onDataReady) pages[j].onDataReady()
    }
  },

  // 从服务器拉取数据
  initData: function() {
    var self = this

    // 并发拉取 records 和 holdings
    var pRecords = httpRequest({
      url: API_BASE + '/wealth-plan/api/records?user_id=default',
      method: 'GET',
      timeout: 8000
    }).catch(function(e) {
      console.warn('[initData] records 请求失败:', e)
      return null
    })

    var pHoldings = httpRequest({
      url: API_BASE + '/wealth-plan/api/holdings?user_id=default',
      method: 'GET',
      timeout: 8000
    }).catch(function(e) {
      console.warn('[initData] holdings 请求失败:', e)
      return null
    })

    Promise.all([pRecords, pHoldings]).then(function(results) {
      var recordsRes = results[0]
      var holdingsRes = results[1]

      // 处理 records
      var serverRecords = {}
      if (recordsRes && recordsRes.code === 0 && recordsRes.data) {
        serverRecords = recordsRes.data
      }

      // records 合并策略：以本地为准（本地删除的不从服务器补回），服务器补充本地没有的key
      var localRecords = self.recoverRecordsFromLocal() || {}
      var hasServerRecords = serverRecords && Object.keys(serverRecords).length > 0
      var hasLocalRecords = Object.keys(localRecords).length > 0
      var recordsData = {}

      if (!hasServerRecords && hasLocalRecords) {
        // 服务器无数据，用本地
        recordsData = localRecords
        self.saveRecords(localRecords).catch(function() { })
      } else if (hasServerRecords && !hasLocalRecords) {
        // 本地无数据，用服务器
        recordsData = serverRecords
      } else if (hasServerRecords && hasLocalRecords) {
        // 两边都有：以本地为基准，服务器补充本地没有的key（本地明确删除的不补回）
        recordsData = JSON.parse(JSON.stringify(localRecords))
        var skeys = Object.keys(serverRecords)
        for (var sk = 0; sk < skeys.length; sk++) {
          if (!recordsData[skeys[sk]]) {
            // 本地没有这个key（可能是其他设备新增的），从服务器补充
            recordsData[skeys[sk]] = serverRecords[skeys[sk]]
          }
        }
      }

      // 处理 holdings
      var serverHolding = (holdingsRes && holdingsRes.code === 0) ? holdingsRes.data : null
      var localHolding = self.recoverHoldingsFromLocal()

      var finalHolding
      if (isValidHolding(serverHolding) && isValidHolding(localHolding)) {
        // 服务器和本地都有效，比较时间戳
        var serverTime = serverHolding.savedAt || serverHolding.updatedAt || ''
        var localTime = localHolding.savedAt || localHolding.updatedAt || ''
        if (localTime > serverTime) {
          finalHolding = localHolding
          console.log('[initData] 本地holdings更新，使用本地, localTime:', localTime, 'serverTime:', serverTime)
          self.saveHoldingRecords(localHolding).catch(function() { })
        } else {
          finalHolding = serverHolding
          console.log('[initData] 使用服务器holdings, serverTime:', serverTime, 'localTime:', localTime)
        }
      } else if (isValidHolding(serverHolding)) {
        finalHolding = serverHolding
        console.log('[initData] 使用服务器holdings')
      } else if (isValidHolding(localHolding)) {
        finalHolding = localHolding
        console.log('[initData] 服务器无有效holdings，使用本地缓存')
        self.saveHoldingRecords(localHolding).catch(function() { })
      } else {
        finalHolding = getDefaultHolding()
        console.log('[initData] 服务器与本地均无有效holdings，使用默认')
      }

      self.globalData.records = recordsData
      self.globalData.holdingRecordsCache = finalHolding

      // 持久化到本地（多重备份）
      try { wx.setStorageSync(STORAGE_KEYS.RECORDS, recordsData) } catch (e) { }
      try { wx.setStorageSync(STORAGE_KEYS.RECORDS_BACKUP, recordsData) } catch (e) { }
      self.persistHoldingsLocal(finalHolding)

      console.log('数据加载完成，records:', Object.keys(recordsData).length, '条')
      console.log('holdings stockAccounts:', finalHolding.stockAccounts ? finalHolding.stockAccounts.length : 0)
      console.log('holdings fundAccounts:', finalHolding.fundAccounts ? finalHolding.fundAccounts.length : 0)

      self.globalData.assetTimeline = calculateAssetTimeline(self.globalData.records)
      var pages = getCurrentPages()
      for (var j = 0; j < pages.length; j++) {
        if (pages[j].onDataReady) pages[j].onDataReady()
      }
    }).catch(function(e) {
      console.warn('数据加载整体失败，降级本地', e)
      self.loadFromLocal()
    })
  },

  // 保存记录到服务器
  saveRecords: function(records) {
    var self = this
    self.globalData.records = records
    self.globalData.assetTimeline = calculateAssetTimeline(records)

    // 本地双备份
    try { wx.setStorageSync(STORAGE_KEYS.RECORDS, records) } catch (e) { }
    try { wx.setStorageSync(STORAGE_KEYS.RECORDS_BACKUP, records) } catch (e) { }

    // 异步保存到服务器
    return httpRequest({
      url: API_BASE + '/wealth-plan/api/records',
      method: 'POST',
      data: { records: records, user_id: 'default' },
      timeout: 10000
    }).then(function(res) {
      if (res && res.code === 0) {
        console.log('[saveRecords] 服务器保存成功, count:', res.count)
      } else {
        console.warn('[saveRecords] 服务器返回异常:', res)
      }
    }).catch(function(e) {
      console.error('[saveRecords] 服务器保存失败（本地已保存）:', e)
    })
  },

  // 保存持仓到服务器
  saveHoldingRecords: function(data) {
    var self = this
    self.globalData.holdingRecordsCache = data
    // 多重本地持久化（最重要的兜底）
    self.persistHoldingsLocal(data)

    // 深拷贝 + 清理无关字段
    var saveData = JSON.parse(JSON.stringify(data))
    delete saveData._id
    delete saveData._openid
    delete saveData._ownerOpenid
    saveData.updatedAt = new Date().toISOString()

    console.log('[saveHolding] 准备服务器保存:', JSON.stringify(saveData).substring(0, 200))

    return httpRequest({
      url: API_BASE + '/wealth-plan/api/holdings',
      method: 'POST',
      data: { data: saveData, user_id: 'default' },
      timeout: 10000
    }).then(function(res) {
      if (res && res.code === 0) {
        console.log('[saveHolding] 服务器保存成功')
      } else {
        console.warn('[saveHolding] 服务器返回异常:', res)
      }
    }).catch(function(e) {
      console.error('[saveHolding] 服务器保存失败（本地已保存，数据不会丢）:', e)
    })
  }
})