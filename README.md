# Wealth Plan - 家庭财富计划

微信小程序 + FastAPI 后端，用于记录和可视化家庭财务数据。

## 项目结构

```
miniprogram/          # 微信小程序前端
  app.js              # 小程序入口，负责数据加载与同步逻辑
  pages/
    overview/         # 总览页（资产时间线）
    records/          # 月度收支记录
    monthly/          # 月度详情
    investment/       # 投资持仓
    phases/           # 阶段规划
  utils/data.js       # 数据处理工具函数

backend/              # FastAPI 后端服务
  main.py             # 主服务（运行在腾讯云服务器 port 8002）
  requirements.txt    # Python 依赖

deploy/
  finance.conf        # Nginx 配置（HTTPS 443 端口，代理到 8002）
```

## 服务器部署

- **服务器**：腾讯云轻量 106.54.210.200
- **访问域名**：https://finance.goglobal.games
- **后端端口**：8002
- **数据库**：MySQL `wealth_plan` 库（独立隔离）
- **systemd 服务**：`wealth-plan.service`

## 本地开发

1. 微信开发者工具导入 `miniprogram/` 目录
2. AppID 填写小程序 AppID
3. 开发时可开启「不校验域名」绕过 HTTPS 检查

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /wealth-plan/api/records | 获取月度收支记录 |
| POST | /wealth-plan/api/records | 批量保存月度记录 |
| GET | /wealth-plan/api/holdings | 获取持仓数据 |
| POST | /wealth-plan/api/holdings | 保存持仓数据 |
| GET | /wealth-plan/api/health | 健康检查 |
