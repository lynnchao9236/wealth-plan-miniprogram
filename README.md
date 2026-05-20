# Wealth Plan - 家庭财富计划

微信小程序 + FastAPI 后端，用于记录和可视化家庭财务数据。

## 项目结构

```
miniprogram/          # 微信小程序前端
  app.js              # 小程序入口，负责数据加载与同步逻辑
  pages/
    overview/         # 总览页（资产时间线）
    monthly/          # 月度收支记录
    investment/       # 投资持仓
    phases/           # 阶段规划
  utils/data.js       # 数据处理工具函数

backend/
  requirements.txt    # Python 依赖
```

## 本地开发

1. 微信开发者工具导入 `miniprogram/` 目录
2. AppID 填写你自己的小程序 AppID
3. 开发时可开启「不校验域名」绕过 HTTPS 检查
4. 后端需自行部署 FastAPI 服务并配置数据库连接

## 功能说明

- **总览页**：资产净值趋势、持仓分布图表
- **月度收支**：收入/支出/投资三类记录，与阶段目标对比
- **投资持仓**：多账户持仓管理，支持批量录入，自动计算盈亏
- **阶段规划**：三阶段财富增长目标追踪
