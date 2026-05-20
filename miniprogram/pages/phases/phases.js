// pages/phases/phases.js
Page({
  data: {
    currentPhase: '1',
    phaseInfo: {},
    houseStrategies: [
      { title: '卖旧买新', desc: '卖掉翻身片区房产，用旧房款+固收部分凑首付', icon: '🏠', bgColor: '#FCE7F3' },
      { title: '不动权益仓', desc: '绝不触碰股票/基金，保住复利引擎', icon: '🛡️', bgColor: '#FEF2F2' },
      { title: '控制总贷款', desc: '新房贷款控制在月供可承受范围内', icon: '💰', bgColor: '#FFFBEB' },
      { title: '时机选择', desc: '市场低谷期买入，不追高', icon: '📈', bgColor: '#EFF6FF' }
    ]
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
    }
    this.renderPhase(this.data.currentPhase)
  },

  switchPhase(e) {
    const phase = e.currentTarget.dataset.phase
    this.setData({ currentPhase: phase })
    this.renderPhase(phase)
  },

  renderPhase(phase) {
    const phaseData = {
      '1': {
        title: 'Phase 1 · 奠基期',
        period: '2026–2029',
        age: '34~38岁',
        startAsset: '272',
        targetAsset: '520',
        color: '#3B82F6',
        gradientFrom: '#3B82F6',
        gradientTo: '#2563EB',
        shadow: 'rgba(59,130,246,0.3)',
        strategies: [
          { title: '月度定投¥2.9万', desc: '沪深300/中证500/恒科/纳指ETF', icon: '📊', bgColor: '#EFF6FF' },
          { title: '年终奖全投', desc: '铁律：奖金一分不花，约¥10万/年', icon: '🎁', bgColor: '#FEF2F2' },
          { title: '应急金补充', desc: '每月¥0.42万，至¥20万止', icon: '🛡️', bgColor: '#FFFBEB' },
          { title: '2027年启动副业', desc: '咨询合作，建立个人品牌', icon: '🌱', bgColor: '#F0FFF4' }
        ],
        portfolio: [
          { value: 25, name: 'A股宽基ETF', color: '#3B82F6' },
          { value: 15, name: '港股/海外', color: '#06B6D4' },
          { value: 40, name: '债券/固收', color: '#22C55E' },
          { value: 15, name: '货币/短债', color: '#EAB308' },
          { value: 5, name: '黄金', color: '#F97316' }
        ],
        annualFlow: [
          { label: '主业收入', value: '¥42万', color: '#22C55E' },
          { label: '副业收入', value: '¥0→10万', color: '#10B981' },
          { label: '年终奖', value: '¥10万', color: '#059669' },
          { label: '日常支出', value: '-¥18万', color: '#FA5151' },
          { label: '年度定投', value: '¥35万+', color: '#3B82F6' }
        ],
        milestones: [
          { title: '2026年3月', desc: '启动定投，建立投资纪律' },
          { title: '2026年12月', desc: '女儿保险缴费¥28万（从现金池）' },
          { title: '2027年', desc: '副业探索启动' },
          { title: '2029年底', desc: '目标净资产突破¥520万' }
        ]
      },
      '2': {
        title: 'Phase 2 · 加速期',
        period: '2030–2034',
        age: '39~43岁',
        startAsset: '520',
        targetAsset: '900',
        color: '#EAB308',
        gradientFrom: '#EAB308',
        gradientTo: '#CA8A04',
        shadow: 'rgba(234,179,8,0.3)',
        strategies: [
          { title: '月度定投¥3.3万', desc: '主业储蓄全部定投', icon: '📊', bgColor: '#FEFCE8' },
          { title: '副业收入¥10~20万/年', desc: '副业收入全部投入', icon: '🌱', bgColor: '#F0FFF4' },
          { title: '教育基金¥3万/年', desc: '为女儿准备教育资金', icon: '🎓', bgColor: '#EFF6FF' },
          { title: '权益占比提升', desc: 'A股+海外占比提至55%', icon: '📈', bgColor: '#FEF2F2' }
        ],
        portfolio: [
          { value: 30, name: 'A股宽基ETF', color: '#3B82F6' },
          { value: 20, name: '港股/海外', color: '#06B6D4' },
          { value: 30, name: '债券/固收', color: '#22C55E' },
          { value: 10, name: '货币/短债', color: '#EAB308' },
          { value: 5, name: '黄金', color: '#F97316' },
          { value: 5, name: '教育专项', color: '#EC4899' }
        ],
        annualFlow: [
          { label: '主业收入', value: '¥42万', color: '#22C55E' },
          { label: '副业收入', value: '¥10→20万', color: '#10B981' },
          { label: '年终奖', value: '¥12万', color: '#059669' },
          { label: '日常支出', value: '-¥20万', color: '#FA5151' },
          { label: '年度定投', value: '¥50~60万', color: '#3B82F6' }
        ],
        milestones: [
          { title: '2030年', desc: '副业收入稳定¥10万+' },
          { title: '2032年', desc: '可投资资产突破¥400万' },
          { title: '2034年底', desc: '目标净资产达¥900万' }
        ]
      },
      '3': {
        title: 'Phase 3 · 收官期',
        period: '2035–2041',
        age: '44~50岁',
        startAsset: '850',
        targetAsset: '1050',
        color: '#22C55E',
        gradientFrom: '#22C55E',
        gradientTo: '#16A34A',
        shadow: 'rgba(34,197,94,0.3)',
        strategies: [
          { title: '月度定投¥1.8万', desc: '换房后储蓄定投', icon: '📊', bgColor: '#F0FFF4' },
          { title: '副业收入¥15~20万/年', desc: '副业全部投入', icon: '🌱', bgColor: '#FFFBEB' },
          { title: '逐步降风险', desc: '固收占比逐步提升至40%+', icon: '🛡️', bgColor: '#EFF6FF' },
          { title: '复利终局', desc: '投资收益成为主要增长动力', icon: '🏆', bgColor: '#FEF2F2' }
        ],
        portfolio: [
          { value: 20, name: 'A股宽基ETF', color: '#3B82F6' },
          { value: 20, name: '港股/海外', color: '#06B6D4' },
          { value: 40, name: '债券/固收', color: '#22C55E' },
          { value: 10, name: '货币/现金', color: '#EAB308' },
          { value: 5, name: '黄金', color: '#F97316' },
          { value: 5, name: '教育/备用', color: '#EC4899' }
        ],
        annualFlow: [
          { label: '主业收入', value: '¥42万', color: '#22C55E' },
          { label: '副业收入', value: '¥15~20万', color: '#10B981' },
          { label: '年终奖', value: '¥10万', color: '#059669' },
          { label: '日常支出+房贷', value: '-¥30万', color: '#FA5151' },
          { label: '年度定投', value: '¥22万+', color: '#3B82F6' }
        ],
        milestones: [
          { title: '2035年', desc: '换房完成，新生活开始' },
          { title: '2038年', desc: '复利效果显著，投资收益>¥30万/年' },
          { title: '2041年', desc: '🎉 目标达成！净资产突破¥1000万' }
        ]
      }
    }

    if (phase !== 'house') {
      this.setData({ phaseInfo: phaseData[phase] || phaseData['1'] })
    }
  }
})