// Mock financial data for dashboard

export const fundBalance = {
  total: 3520000000,
  bankDeposit: 2180000000,
  cashOnHand: 420000000,
  shortTermInvestment: 920000000,
  change: 5.8,
};

export const revenueGrossProfitData: Record<string, { month: string; revenue: number; grossProfit: number; grossMargin: number }[]> = {
  "2021": [
    { month: "1月", revenue: 2800, grossProfit: 560, grossMargin: 20 },
    { month: "2月", revenue: 2200, grossProfit: 418, grossMargin: 19 },
    { month: "3月", revenue: 3100, grossProfit: 651, grossMargin: 21 },
    { month: "4月", revenue: 3500, grossProfit: 735, grossMargin: 21 },
    { month: "5月", revenue: 3800, grossProfit: 836, grossMargin: 22 },
    { month: "6月", revenue: 4200, grossProfit: 924, grossMargin: 22 },
    { month: "7月", revenue: 4800, grossProfit: 1056, grossMargin: 22 },
    { month: "8月", revenue: 5200, grossProfit: 1196, grossMargin: 23 },
    { month: "9月", revenue: 5800, grossProfit: 1334, grossMargin: 23 },
    { month: "10月", revenue: 6500, grossProfit: 1560, grossMargin: 24 },
    { month: "11月", revenue: 7200, grossProfit: 1728, grossMargin: 24 },
    { month: "12月", revenue: 8500, grossProfit: 2125, grossMargin: 25 },
  ],
  "2022": [
    { month: "1月", revenue: 3200, grossProfit: 640, grossMargin: 20 },
    { month: "2月", revenue: 2600, grossProfit: 494, grossMargin: 19 },
    { month: "3月", revenue: 3800, grossProfit: 798, grossMargin: 21 },
    { month: "4月", revenue: 4100, grossProfit: 861, grossMargin: 21 },
    { month: "5月", revenue: 4500, grossProfit: 990, grossMargin: 22 },
    { month: "6月", revenue: 4800, grossProfit: 1056, grossMargin: 22 },
    { month: "7月", revenue: 5500, grossProfit: 1210, grossMargin: 22 },
    { month: "8月", revenue: 6200, grossProfit: 1426, grossMargin: 23 },
    { month: "9月", revenue: 6800, grossProfit: 1564, grossMargin: 23 },
    { month: "10月", revenue: 7500, grossProfit: 1800, grossMargin: 24 },
    { month: "11月", revenue: 8200, grossProfit: 1968, grossMargin: 24 },
    { month: "12月", revenue: 9800, grossProfit: 2450, grossMargin: 25 },
  ],
  "2023": [
    { month: "1月", revenue: 3500, grossProfit: 700, grossMargin: 20 },
    { month: "2月", revenue: 2900, grossProfit: 551, grossMargin: 19 },
    { month: "3月", revenue: 4200, grossProfit: 882, grossMargin: 21 },
    { month: "4月", revenue: 4500, grossProfit: 945, grossMargin: 21 },
    { month: "5月", revenue: 4800, grossProfit: 1056, grossMargin: 22 },
    { month: "6月", revenue: 5200, grossProfit: 1144, grossMargin: 22 },
    { month: "7月", revenue: 5800, grossProfit: 1276, grossMargin: 22 },
    { month: "8月", revenue: 6500, grossProfit: 1495, grossMargin: 23 },
    { month: "9月", revenue: 7200, grossProfit: 1656, grossMargin: 23 },
    { month: "10月", revenue: 7800, grossProfit: 1872, grossMargin: 24 },
    { month: "11月", revenue: 8500, grossProfit: 2125, grossMargin: 25 },
    { month: "12月", revenue: 10200, grossProfit: 2652, grossMargin: 26 },
  ],
  "2024": [
    { month: "1月", revenue: 3800, grossProfit: 760, grossMargin: 20 },
    { month: "2月", revenue: 3200, grossProfit: 608, grossMargin: 19 },
    { month: "3月", revenue: 4500, grossProfit: 945, grossMargin: 21 },
    { month: "4月", revenue: 4800, grossProfit: 1008, grossMargin: 21 },
    { month: "5月", revenue: 5100, grossProfit: 1122, grossMargin: 22 },
    { month: "6月", revenue: 5500, grossProfit: 1210, grossMargin: 22 },
    { month: "7月", revenue: 6200, grossProfit: 1426, grossMargin: 23 },
    { month: "8月", revenue: 6800, grossProfit: 1564, grossMargin: 23 },
    { month: "9月", revenue: 7500, grossProfit: 1800, grossMargin: 24 },
    { month: "10月", revenue: 8200, grossProfit: 2050, grossMargin: 25 },
    { month: "11月", revenue: 9000, grossProfit: 2340, grossMargin: 26 },
    { month: "12月", revenue: 10800, grossProfit: 2916, grossMargin: 27 },
  ],
  "2025": [
    { month: "1月", revenue: 4200, grossProfit: 840, grossMargin: 20 },
    { month: "2月", revenue: 3500, grossProfit: 665, grossMargin: 19 },
    { month: "3月", revenue: 4800, grossProfit: 1008, grossMargin: 21 },
    { month: "4月", revenue: 5200, grossProfit: 1092, grossMargin: 21 },
    { month: "5月", revenue: 5500, grossProfit: 1210, grossMargin: 22 },
    { month: "6月", revenue: 5800, grossProfit: 1276, grossMargin: 22 },
    { month: "7月", revenue: 6500, grossProfit: 1495, grossMargin: 23 },
    { month: "8月", revenue: 7200, grossProfit: 1656, grossMargin: 23 },
    { month: "9月", revenue: 7800, grossProfit: 1872, grossMargin: 24 },
    { month: "10月", revenue: 8500, grossProfit: 2125, grossMargin: 25 },
    { month: "11月", revenue: 9500, grossProfit: 2470, grossMargin: 26 },
    { month: "12月", revenue: 11500, grossProfit: 3105, grossMargin: 27 },
  ],
};

export const regionSalesData: Record<string, number> = {
  "广东": 52000,
  "浙江": 38500,
  "江苏": 42000,
  "上海": 35800,
  "北京": 28500,
  "山东": 22000,
  "四川": 15800,
  "福建": 18500,
  "湖北": 12800,
  "湖南": 11200,
  "河南": 10500,
  "安徽": 16200,
  "河北": 9800,
  "辽宁": 13500,
  "陕西": 8200,
  "重庆": 19500,
  "天津": 11800,
  "江西": 9500,
  "广西": 7800,
  "云南": 5200,
  "贵州": 4800,
  "山西": 6500,
  "吉林": 7200,
  "黑龙江": 6800,
  "内蒙古": 3800,
  "新疆": 2500,
  "甘肃": 3200,
  "海南": 4500,
  "宁夏": 1800,
  "青海": 1200,
  "西藏": 800,
  "台湾": 15200,
  "香港": 8800,
  "澳门": 2200,
};

export const topCustomers = [
  { name: "比亚迪", sales: 42800, percentage: 18.5, trend: 22.3 },
  { name: "特斯拉", sales: 31200, percentage: 13.5, trend: 15.8 },
  { name: "大众汽车", sales: 25600, percentage: 11.1, trend: 8.6 },
  { name: "丰田汽车", sales: 19800, percentage: 8.6, trend: -2.5 },
  { name: "理想汽车", sales: 16500, percentage: 7.1, trend: 12.1 },
];

export const productGrossMargin = [
  { name: "NovaDrive-H800", margin: 28.5, revenue: 45200, color: "hsl(262, 60%, 55%)" },
  { name: "PulseVision-M600", margin: 24.2, revenue: 32100, color: "hsl(195, 85%, 50%)" },
  { name: "OptiSense-Q400", margin: 22.8, revenue: 25800, color: "hsl(150, 60%, 50%)" },
  { name: "GridCam-A300", margin: 20.5, revenue: 18600, color: "hsl(35, 90%, 55%)" },
  { name: "CoreLink-S200", margin: 18.2, revenue: 12500, color: "hsl(340, 70%, 55%)" },
];

export const operatingExpenses: Record<string, { category: string; amount: number; percentage: number; color: string }[]> = {
  "2025": [
    { category: "研发费用", amount: 48.5, percentage: 39.2, color: "hsl(262, 60%, 55%)" },
    { category: "销售费用", amount: 28.2, percentage: 22.8, color: "hsl(195, 85%, 50%)" },
    { category: "管理费用", amount: 19.8, percentage: 16.0, color: "hsl(150, 60%, 50%)" },
    { category: "财务费用", amount: 9.2, percentage: 7.4, color: "hsl(35, 90%, 55%)" },
    { category: "折旧摊销", amount: 11.5, percentage: 9.3, color: "hsl(340, 70%, 55%)" },
    { category: "其他费用", amount: 6.58, percentage: 5.3, color: "hsl(220, 40%, 50%)" },
  ],
  "2024": [
    { category: "研发费用", amount: 42.5, percentage: 38.2, color: "hsl(262, 60%, 55%)" },
    { category: "销售费用", amount: 25.8, percentage: 23.2, color: "hsl(195, 85%, 50%)" },
    { category: "管理费用", amount: 18.2, percentage: 16.4, color: "hsl(150, 60%, 50%)" },
    { category: "财务费用", amount: 8.5, percentage: 7.6, color: "hsl(35, 90%, 55%)" },
    { category: "折旧摊销", amount: 10.2, percentage: 9.2, color: "hsl(340, 70%, 55%)" },
    { category: "其他费用", amount: 5.98, percentage: 5.4, color: "hsl(220, 40%, 50%)" },
  ],
};

export const years = ["2021", "2022", "2023", "2024", "2025"];

export const mockOpsKpiByYear: Record<string, {
  revenue: number;
  revenuePrior: number;
  revenueYoy: number;
  grossProfit: number;
  grossMargin: number;
  expense: number;
}> = {
  "2025": {
    revenue: 12850,
    revenuePrior: 11240,
    revenueYoy: 14.3,
    grossProfit: 4120,
    grossMargin: 32.1,
    expense: 1860,
  },
  "2024": {
    revenue: 11240,
    revenuePrior: 9860,
    revenueYoy: 14.0,
    grossProfit: 3480,
    grossMargin: 31.0,
    expense: 1620,
  },
};

export const mockBizLineRevenueByYear: Record<string, { name: string; amount: number; percentage: number }[]> = {
  "2025": [
    { name: "智能驾驶", amount: 5200, percentage: 40.5 },
    { name: "座舱域控", amount: 3400, percentage: 26.5 },
    { name: "车规芯片", amount: 2800, percentage: 21.8 },
    { name: "其他", amount: 1450, percentage: 11.2 },
  ],
  "2024": [
    { name: "智能驾驶", amount: 4500, percentage: 40.0 },
    { name: "座舱域控", amount: 3100, percentage: 27.6 },
    { name: "车规芯片", amount: 2400, percentage: 21.4 },
    { name: "其他", amount: 1240, percentage: 11.0 },
  ],
};

export const mockExpenseTrendByYear: Record<string, { month: string; amount: number }[]> = {
  "2025": [
    { month: "1月", amount: 98 }, { month: "2月", amount: 86 }, { month: "3月", amount: 112 },
    { month: "4月", amount: 105 }, { month: "5月", amount: 128 }, { month: "6月", amount: 142 },
    { month: "7月", amount: 136 }, { month: "8月", amount: 148 }, { month: "9月", amount: 155 },
    { month: "10月", amount: 162 }, { month: "11月", amount: 170 }, { month: "12月", amount: 178 },
  ],
  "2024": [
    { month: "1月", amount: 88 }, { month: "2月", amount: 79 }, { month: "3月", amount: 96 },
    { month: "4月", amount: 92 }, { month: "5月", amount: 110 }, { month: "6月", amount: 124 },
    { month: "7月", amount: 118 }, { month: "8月", amount: 130 }, { month: "9月", amount: 138 },
    { month: "10月", amount: 145 }, { month: "11月", amount: 152 }, { month: "12月", amount: 160 },
  ],
};

export const mockExpenseByDeptByYear: Record<string, { name: string; amount: number; percentage: number }[]> = {
  "2025": [
    { name: "研发一部", amount: 420, percentage: 28.4 },
    { name: "研发二部", amount: 310, percentage: 21.0 },
    { name: "销售中心", amount: 260, percentage: 17.6 },
    { name: "供应链", amount: 180, percentage: 12.2 },
    { name: "行政人事", amount: 150, percentage: 10.1 },
    { name: "财务", amount: 160, percentage: 10.7 },
  ],
  "2024": [
    { name: "研发一部", amount: 380, percentage: 28.0 },
    { name: "研发二部", amount: 285, percentage: 21.0 },
    { name: "销售中心", amount: 240, percentage: 17.7 },
    { name: "供应链", amount: 165, percentage: 12.2 },
    { name: "行政人事", amount: 140, percentage: 10.3 },
    { name: "财务", amount: 148, percentage: 10.8 },
  ],
};

export const mockFundFlowByYear: Record<string, { month: string; income: number; expense: number; net: number }[]> = {
  "2025": [
    { month: "1月", income: 820, expense: 640, net: 180 },
    { month: "2月", income: 610, expense: 580, net: 30 },
    { month: "3月", income: 980, expense: 720, net: 260 },
    { month: "4月", income: 870, expense: 690, net: 180 },
    { month: "5月", income: 1020, expense: 760, net: 260 },
    { month: "6月", income: 1150, expense: 810, net: 340 },
    { month: "7月", income: 980, expense: 790, net: 190 },
    { month: "8月", income: 1080, expense: 830, net: 250 },
    { month: "9月", income: 1210, expense: 880, net: 330 },
    { month: "10月", income: 990, expense: 860, net: 130 },
    { month: "11月", income: 1120, expense: 910, net: 210 },
    { month: "12月", income: 1280, expense: 950, net: 330 },
  ],
  "2024": [
    { month: "1月", income: 740, expense: 590, net: 150 },
    { month: "2月", income: 560, expense: 540, net: 20 },
    { month: "3月", income: 880, expense: 660, net: 220 },
    { month: "4月", income: 790, expense: 640, net: 150 },
    { month: "5月", income: 920, expense: 700, net: 220 },
    { month: "6月", income: 1040, expense: 750, net: 290 },
    { month: "7月", income: 900, expense: 730, net: 170 },
    { month: "8月", income: 980, expense: 770, net: 210 },
    { month: "9月", income: 1100, expense: 810, net: 290 },
    { month: "10月", income: 910, expense: 790, net: 120 },
    { month: "11月", income: 1020, expense: 840, net: 180 },
    { month: "12月", income: 1160, expense: 880, net: 280 },
  ],
};

/** 管报演示 mock：按年业务线经营对比 */
export const mockMgmtLineCompareByYear: Record<string, {
  year: number;
  priorYear: number;
  lines: { name: string; revenue: number; priorRevenue: number; margin: number; expense: number }[];
}> = {
  "2025": {
    year: 2025,
    priorYear: 2024,
    lines: [
      { name: "智能驾驶", revenue: 5200, priorRevenue: 4500, margin: 34.2, expense: 680 },
      { name: "座舱域控", revenue: 3400, priorRevenue: 3100, margin: 29.8, expense: 420 },
      { name: "车规芯片", revenue: 2800, priorRevenue: 2400, margin: 38.5, expense: 360 },
      { name: "其他", revenue: 1450, priorRevenue: 1240, margin: 22.1, expense: 400 },
    ],
  },
  "2024": {
    year: 2024,
    priorYear: 2023,
    lines: [
      { name: "智能驾驶", revenue: 4500, priorRevenue: 3900, margin: 32.8, expense: 610 },
      { name: "座舱域控", revenue: 3100, priorRevenue: 2700, margin: 28.4, expense: 380 },
      { name: "车规芯片", revenue: 2400, priorRevenue: 2050, margin: 36.9, expense: 320 },
      { name: "其他", revenue: 1240, priorRevenue: 1100, margin: 21.0, expense: 360 },
    ],
  },
};

/** @deprecated use mockOpsKpiByYear */
export const mockOpsKpi = mockOpsKpiByYear["2025"];
/** @deprecated use mockBizLineRevenueByYear */
export const mockBizLineRevenue = mockBizLineRevenueByYear["2025"];
/** @deprecated use mockExpenseTrendByYear */
export const mockExpenseTrend = mockExpenseTrendByYear["2025"];
/** @deprecated use mockExpenseByDeptByYear */
export const mockExpenseByDept = mockExpenseByDeptByYear["2025"];
/** @deprecated use mockFundFlowByYear */
export const mockFundFlow = mockFundFlowByYear["2025"];
/** @deprecated use mockMgmtLineCompareByYear */
export const mockMgmtLineCompare = mockMgmtLineCompareByYear["2025"];
