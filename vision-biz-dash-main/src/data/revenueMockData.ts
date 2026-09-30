// Mock data for revenue/cost/margin query platform

export const revenueEntities = ["集团", "华东主体", "华南主体", "华北主体"];
export const businessLines = ["智能驾驶", "智能座舱", "车载感知", "动力电子", "技术服务"];
export const revenueCurrencies = ["本位币", "集团币", "USD"];
export const regions = ["华东", "华南", "华北", "华中", "西南", "西北", "东北", "海外"];
export const revenueCustomers = [
  "比亚迪", "特斯拉", "大众汽车", "丰田汽车", "本田汽车",
  "宝马", "奔驰", "吉利汽车", "长城汽车", "理想汽车",
  "蔚来", "小鹏汽车", "上汽集团", "广汽集团", "长安汽车",
];
export const revenueTypes = ["收入", "成本"];

// Dimension options
export const revenueDimensions = [
  "客户编号", "客户名称", "业务线编号", "业务线名称",
  "销售人员编号", "销售人员名称", "销售渠道", "产品编号",
  "品名", "规格", "汇报型号", "销售区域",
];

// Metric options
export const revenueMetrics = [
  { key: "quantity", label: "数量", unit: "PCS" },
  { key: "unitPrice", label: "单价", unit: "元" },
  { key: "revenue", label: "收入", unit: "万" },
  { key: "cost", label: "成本", unit: "万" },
  { key: "grossProfit", label: "毛利", unit: "万" },
  { key: "grossMargin", label: "毛利率", unit: "%" },
];

// Products
const products = [
  { id: "P-001", name: "NovaDrive-H800", spec: "BGA/7nm/32TOPS", model: "NovaDrive-H800" },
  { id: "P-002", name: "PulseVision-M600", spec: "BGA/12nm/16TOPS", model: "PulseVision-M600" },
  { id: "P-003", name: "OptiSense-Q400", spec: "QFN/16nm/8TOPS", model: "OptiSense-Q400" },
  { id: "P-004", name: "GridCam-A300", spec: "BGA/22nm/4TOPS", model: "GridCam-A300" },
  { id: "P-005", name: "CoreLink-S200", spec: "QFN/28nm/2TOPS", model: "CoreLink-S200" },
  { id: "P-006", name: "CabinView-C150", spec: "QFN/28nm/1TOPS", model: "CabinView-C150" },
  { id: "P-007", name: "EdgeGuard-E100", spec: "QFP/40nm/0.5TOPS", model: "EdgeGuard-E100" },
];

const salesPersonList = [
  { id: "SP-001", name: "张明" },
  { id: "SP-002", name: "李华" },
  { id: "SP-003", name: "王强" },
  { id: "SP-004", name: "赵丽" },
  { id: "SP-005", name: "陈伟" },
  { id: "SP-006", name: "刘洋" },
  { id: "SP-007", name: "周杰" },
];

const salesChannels = ["直销", "代理商", "分销商", "OEM", "线上"];

const customerIds: Record<string, string> = {};
revenueCustomers.forEach((c, i) => { customerIds[c] = `C-${String(i + 1).padStart(3, "0")}`; });

const blIds: Record<string, string> = {};
businessLines.forEach((b, i) => { blIds[b] = `BL-${String(i + 1).padStart(2, "0")}`; });

// Generate grouped data based on selected dimensions and metrics
export function generateRevenueGroupedData(
  dimensions: string[],
  metrics: string[],
): Record<string, any>[] {
  const dimSources: Record<string, () => Record<string, any>[]> = {
    "客户编号": () => revenueCustomers.map(c => ({ "客户编号": customerIds[c] })),
    "客户名称": () => revenueCustomers.map(c => ({ "客户名称": c })),
    "业务线编号": () => businessLines.map(b => ({ "业务线编号": blIds[b] })),
    "业务线名称": () => businessLines.map(b => ({ "业务线名称": b })),
    "销售人员编号": () => salesPersonList.map(s => ({ "销售人员编号": s.id })),
    "销售人员名称": () => salesPersonList.map(s => ({ "销售人员名称": s.name })),
    "销售渠道": () => salesChannels.map(c => ({ "销售渠道": c })),
    "产品编号": () => products.map(p => ({ "产品编号": p.id })),
    "品名": () => products.map(p => ({ "品名": p.name })),
    "规格": () => products.map(p => ({ "规格": p.spec })),
    "汇报型号": () => products.map(p => ({ "汇报型号": p.model })),
    "销售区域": () => regions.map(r => ({ "销售区域": r })),
  };

  const primary = dimensions[0];
  const secondary = dimensions[1];
  const primaryItems = primary && dimSources[primary] ? dimSources[primary]() : [{}];
  const secondaryItems = secondary && dimSources[secondary] ? dimSources[secondary]().slice(0, 4) : [null];

  const rows: Record<string, any>[] = [];
  for (const pItem of primaryItems) {
    for (const sItem of secondaryItems) {
      const row: Record<string, any> = { ...pItem };
      if (sItem) Object.assign(row, sItem);

      const baseRev = 500 + Math.random() * 8000;
      const margin = 0.15 + Math.random() * 0.2;
      const costVal = baseRev * (1 - margin);

      if (metrics.includes("数量")) row["数量"] = Math.round(1000 + Math.random() * 50000);
      if (metrics.includes("单价")) row["单价"] = Number((5 + Math.random() * 95).toFixed(2));
      if (metrics.includes("收入")) row["收入"] = Math.round(baseRev);
      if (metrics.includes("成本")) row["成本"] = Math.round(costVal);
      if (metrics.includes("毛利")) row["毛利"] = Math.round(baseRev - costVal);
      if (metrics.includes("毛利率")) row["毛利率"] = Number((margin * 100).toFixed(1));

      rows.push(row);
    }
  }
  return rows;
}

// Generate detail-level rows
export function generateRevenueDetailRows(count: number): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < count; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    const customer = revenueCustomers[Math.floor(Math.random() * revenueCustomers.length)];
    const sp = salesPersonList[Math.floor(Math.random() * salesPersonList.length)];
    const bl = businessLines[Math.floor(Math.random() * businessLines.length)];
    const qty = Math.round(100 + Math.random() * 5000);
    const price = Number((10 + Math.random() * 90).toFixed(2));
    const rev = Math.round(qty * price / 10000);
    const margin = 0.15 + Math.random() * 0.2;

    rows.push({
      date: `2025-${String(Math.floor(Math.random() * 6) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
      entity: revenueEntities[Math.floor(Math.random() * revenueEntities.length)],
      businessLine: bl,
      customerCode: customerIds[customer],
      customer,
      salesPerson: sp.name,
      channel: salesChannels[Math.floor(Math.random() * salesChannels.length)],
      productCode: product.id,
      productName: product.name,
      spec: product.spec,
      model: product.model,
      region: regions[Math.floor(Math.random() * regions.length)],
      quantity: qty,
      unitPrice: price,
      revenue: rev,
      cost: Math.round(rev * (1 - margin)),
      grossProfit: Math.round(rev * margin),
      grossMargin: Number((margin * 100).toFixed(1)),
      docNo: `SO-${String(2025000 + i).padStart(7, "0")}`,
      currency: "CNY",
    });
  }
  return rows;
}

export function generateRevenueMockSQL(entity: string, dimensions: string[], metrics: string[]) {
  const metricCols = metrics.map(m => {
    if (m === "数量") return "SUM(quantity) AS qty";
    if (m === "单价") return "AVG(unit_price) AS avg_price";
    if (m === "收入") return "SUM(revenue) AS revenue";
    if (m === "成本") return "SUM(cost) AS cost";
    if (m === "毛利") return "SUM(revenue - cost) AS gross_profit";
    if (m === "毛利率") return "SUM(revenue - cost)/SUM(revenue)*100 AS gross_margin";
    return m;
  });
  const groupCols = dimensions.join(", ");
  return `SELECT ${groupCols ? groupCols + ", " : ""}
  ${metricCols.join(",\n  ")}
FROM dw_revenue_cost_fact
WHERE entity = '${entity}'
  AND period BETWEEN '2024-07' AND '2025-06'
${groupCols ? `GROUP BY ${groupCols}` : ""}
ORDER BY revenue DESC
LIMIT 500;`;
}
