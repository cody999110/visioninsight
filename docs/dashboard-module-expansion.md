# 看板分析模块扩容计划

> 状态：**实施中（第一批）**  
> 已确认：第一批 6 项；管报演示用 mock；经营 KPI 与资金 KPI 可并存；模块选择并入布局预设对话框。

---

## 已锁定

| 项 | 结论 |
|----|------|
| 第一批模块 | `ops_kpi`、`biz_line_revenue`、`expense_trend`、`expense_dept`、`fund_flow`、`mgmt_line_compare` |
| 管报演示 | mock |
| 双 KPI | 可并存（由预设/勾选决定） |
| 模块选择 | 并入「布局预设」对话框（页签） |

其余设计见下文历史章节；实施以本锁定表为准。


## 1. 结论（先看）

| 判断 | 说明 |
|------|------|
| 根因正确 | 不是预设 UI 问题，是**可上板图表种类不够** |
| 数据基础够用 | 收入/费用/资金字段 + **已有** `/management/report`；不必新造事实表 |
| 最快出差异 | **先把管理图表抽上首页（零新聚合）**，再补费用趋势/资金流水等薄 API |
| 选择机制 | **模块目录勾选显隐**（阶段 C'）；完整拖拽后置 |
| 不建议 | 嵌查询整页、预算 Widget（链路未通）、未扩目录前猛加预设数量 |

推荐下一期：**E0 注册表/迁移 → E1 管理类 P0 上板 → C' 模块选择 → E2 新聚合模块 + 预设改版**。

---

## 2. 现状盘点

### 2.1 首页已有 Widget（6）

| id | 模块 | 数据域 | 底层 API |
|----|------|--------|----------|
| `kpi` | 资金 KPI 卡 | fund | `/dashboard/fund-kpi` |
| `revenue` | 收入与毛利趋势 | revenue | `/dashboard/revenue-trend` |
| `customers` | Top 客户 | revenue | `/dashboard/top-customers` |
| `map` | 区域地图 | revenue | `/dashboard/region-sales` |
| `margin` | 产品毛利率 | revenue | `/dashboard/product-margin` |
| `expense` | 费用结构饼图 | expense | `/dashboard/expense-structure` |

### 2.2 已有但未上首页

- **管理报表** `/management/report`：业务线收入/费用/毛利/同比 + KPI；`ManagementCharts` 已有三图，可抽 Widget  
- **收入字段未聚合**：`business_line`、`sales_channel`、`sales_person`…  
- **费用字段未聚合**：`department_name`、科目、月度趋势…  
- **资金字段未聚合**：入/出账月度、银行/对手…  
- **预算模板** `tpl_budget`：看板未消费 → 本期不做  

### 2.3 工程缺口

- 查询分析页是明细透视，**几乎无图表可抽**；新模块 = 瘦 Widget + dashboard/management 聚合  
- 当前 `layoutStorage` 对 widget id **整份校验失败即回退经典** → 扩目录前必须改为：未知 id 忽略、缺省 id 补 `visible:false`

---

## 3. 推荐新增模块

### 3.1 P0（优先：复用管理报表，零新聚合）

| id | 名称 | 数据 | 前端 |
|----|------|------|------|
| `ops_kpi` | 经营 KPI 条 | `report.kpis` | 新建；与资金 `kpi` 叙事不同，可并存 |
| `mgmt_revenue` | 业务线收入对比 | report.lines | 抽离 ManagementCharts 柱图 |
| `mgmt_margin` | 业务线毛利率 | report.lines | 抽离折线图 |
| `mgmt_expense` | 业务线费用对比 | report.lines（需 has_expense） | 抽离；无费用则空态 |

演示态：用简化 mock **或** 提示切换公司（待你确认）。

### 3.2 P1（薄新 API，字段已在明细）

| id | 名称 | 建议 API |
|----|------|----------|
| `biz_line_revenue` | 业务线收入（不依赖管报配置） | `GET /dashboard/business-line-revenue` |
| `expense_trend` | 费用月度趋势 | `GET /dashboard/expense-trend` |
| `expense_dept` | 部门费用排行 | `GET /dashboard/expense-by-dept` |
| `fund_flow` | 资金流入流出 | `GET /dashboard/fund-flow` |

### 3.3 P2（后置）

`channel_mix`、`customer_concentration`、`product_rank`、`expense_subject`、预算执行等。

### 3.4 明确不做（本期）

预算上板、自定义 SQL、嵌查询页、完整拖拽网格。

---

## 4. 模块选择

**层 1** 预设画廊（已有）→ 整包叙事  
**层 2** 模块面板（本期做）→ 勾选显隐  
**层 3** 拖拽（远期）

### 4.1 交互

1. 「功能」中增加 **模块选择**（独立入口；或与布局预设双页签，待确认）  
2. 按域分组：资金 / 收入 / 费用 / 管理  
3. 勾选 = `visible`；配置保留便于再开  
4. 默认 `colSpan` 走注册表；本期可不做跨度编辑（可后续加按钮）  
5. 建议可见上限 **6～8**（防首屏噪声；可软提示）  
6. 改动后 `presetId` → `custom`；「恢复经典」回到原 6 模块  

### 4.2 预设改版（目录扩容后）

每套至少多带 **1 个其他预设没有的模块**：

| 预设 | 故事 | 典型可见 |
|------|------|----------|
| 经典 | 兼容 | 原 6 |
| 经营管理 | 管报口径 | `ops_kpi`、`mgmt_revenue`、`mgmt_margin`、（可选）`mgmt_expense` |
| 费用管控 | 费用三板斧 | `expense`、`expense_trend`、`expense_dept` |
| 资金健康 | 流动性 | `kpi`、`fund_flow`、`revenue` |
| 经营概览 | 结构+区域 | `ops_kpi`、`revenue`、`biz_line_revenue`、`map` |

---

## 5. 技术要点

1. 集中 `widgetRegistry`：`id / title / group / domains / defaultSpan / renderer`  
2. `normalizeLayout`：未知 id **忽略**；缺新 id **补 hidden**（勿整份丢弃）  
3. 空数据：`DataEmptyState`；管理类按确认策略 mock 或提示  
4. 演示数据：新 dashboard API 无 live 时回落 mock  
5. 图表：theme token + `glass-card` + ResponsiveContainer  
6. 资金 KPI 拆分（62/12/26）仍为近似值；`fund_flow` 上线前可不改，单独立项  

---

## 6. 分期与工作量

| 阶段 | 内容 | 人天 |
|------|------|------|
| **E0** | registry + layout 迁移容错 | 0.5～1 |
| **E1** | P0 管理四件（ops_kpi + 三图）+「经营管理」预设 | 1.5～2 |
| **C'** | 模块选择面板（显隐） | 1～1.5 |
| **E2** | P1 薄 API 3～4 个 + 预设改版 | 2～3 |
| **E3** | P2 / 跨度排序 / 拖拽 | 单独立项 |

**建议顺序：E0 → E1 → C' → E2。**  
合计约 **5～7.5 人天**（若 P1 砍到 2 个 API 可压到约 4～5）。

---

## 7. 验收标准

- [ ] 可选模块明显多于 6；至少含管理类 P0  
- [ ] 旧 localStorage 不因新 id 被整份清空  
- [ ] 模块勾选可添加/隐藏，按公司持久化  
- [ ] ≥3 套预设「可见模块集合」肉眼可辨  
- [ ] 经典默认仍接近当前首页  

---

## 8. 需你确认

1. **范围**：只做 P0（管理上板 + 模块选择），还是 P0+P1 一起做？  
2. **管报演示态**：mock，还是仅提示切公司？  
3. **双 KPI**：资金 `kpi` 与经营 `ops_kpi` 由预设决定并存，还是互斥？  
4. **模块选择入口**：独立「模块选择」，还是并入布局对话框页签？  
5. **可见上限**：是否接受软限制 8？  

示例回复：  
`P0+P1；管报演示 mock；双 KPI 由预设决定；独立模块选择；上限 8`  
确认后再开工。

---

*关联：`docs/visual-upgrade-plan.md`（方案甲 A/B 已完成）*
