// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    color: "#8A8A8A",
    selectedColor: "#07C160",
    list: [
      { pagePath: "/pages/overview/overview", icon: "📊", text: "总览" },
      { pagePath: "/pages/monthly/monthly", icon: "📅", text: "每月收支" },
      { pagePath: "/pages/investment/investment", icon: "🌱", text: "每月投资" },
      { pagePath: "/pages/records/records", icon: "📈", text: "资产记录" },
      { pagePath: "/pages/phases/phases", icon: "📶", text: "阶段目标" }
    ]
  },
  attached() {},
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({ url })
      this.setData({ selected: data.index })
    }
  }
})
