// Expense Analysis BI Mock Data

export const entities = ["集团", "华东主体", "华南主体", "华北主体"];
export const currencies = ["本位币", "集团币"];
export const expenseRanges = ["销售费用", "管理费用", "研发费用", "制造费用"];
export const expenseSubjects = [
  "差旅费", "招待费", "市场推广费", "咨询服务费", "房租水电费",
  "办公费", "通讯费", "折旧费", "薪酬福利", "培训费",
  "保险费", "运输费", "维修费", "外包服务费", "会议费",
];
export const analysisDimensions = ["部门", "销售人员", "客户", "项目", "供应商", "费用科目"];
export const compareDimensions = ["地区", "团队", "客户分层", "费用大类"];
export const metricOptions = [
  "费用发生额", "费用率", "同比", "环比", "预算差异额", "预算差异率", "人均费用",
];
export const granularityOptions = ["月", "周", "日"];

export const departments = ["销售一部", "销售二部", "研发一部", "研发二部", "市场部", "管理部", "财务部", "人力资源部", "供应链部", "品质部"];
export const salesPersons = ["张伟", "李娜", "王强", "刘洋", "陈芳", "赵鹏", "黄丽", "周明", "吴刚", "林燕"];
export const customers = ["比亚迪", "特斯拉", "大众汽车", "丰田汽车", "本田汽车", "宝马", "奔驰", "吉利汽车", "长城汽车", "理想汽车"];
export const projects = ["NovaDrive量产", "PulseVision研发", "OptiSense迭代", "智能座舱平台", "车载感知方案", "动力电子模块", "域控制器联调", "舱内监测方案"];
export const suppliers = ["德勤咨询", "上海电信", "万科物业", "中国国航", "携程商旅", "京东企业购", "顺丰速运", "阿里云"];
export const approvalStatuses = ["已审批", "审批中", "已驳回", "待提交"];

// Generate monthly trend data
export function generateTrendData(months: number = 12) {
  const data = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const base = 3800 + Math.random() * 1200;
    const revenue = base * 2.5 + Math.random() * 800;
    data.push({
      period: label,
      expense: Math.round(base),
      revenue: Math.round(revenue),
      expenseRate: Number(((base / revenue) * 100).toFixed(1)),
      budget: Math.round(base * (0.95 + Math.random() * 0.15)),
      lastYear: Math.round(base * (0.85 + Math.random() * 0.2)),
    });
  }
  return data;
}

// Generate TopN data by dimension
export function generateTopNData(dimension: string, n: number = 10) {
  const sources: Record<string, string[]> = {
    "部门": departments,
    "销售人员": salesPersons,
    "客户": customers,
    "项目": projects,
    "供应商": suppliers,
    "费用科目": expenseSubjects,
  };
  const items = sources[dimension] || departments;
  return items.slice(0, Math.min(n, items.length)).map((name, i) => ({
    name,
    value: Math.round(5000 - i * 380 + Math.random() * 300),
    budget: Math.round(5200 - i * 350 + Math.random() * 300),
    lastYear: Math.round(4600 - i * 340 + Math.random() * 300),
  }));
}

// Generate stacked composition data
export function generateCompositionData() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      period: label,
      销售费用: Math.round(800 + Math.random() * 400),
      管理费用: Math.round(500 + Math.random() * 300),
      研发费用: Math.round(1200 + Math.random() * 600),
      制造费用: Math.round(300 + Math.random() * 200),
    });
  }
  return months;
}

// Generate waterfall data
export function generateWaterfallData() {
  return [
    { name: "预算总额", value: 12380, type: "total" },
    { name: "销售费用", value: -280, type: "negative" },
    { name: "管理费用", value: 150, type: "positive" },
    { name: "研发费用", value: -520, type: "negative" },
    { name: "制造费用", value: 80, type: "positive" },
    { name: "其他", value: -130, type: "negative" },
    { name: "实际总额", value: 11680, type: "total" },
  ];
}

// Generate detail table rows
export function generateDetailRows(count: number = 50) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    rows.push({
      id: `EXP-${String(10001 + i)}`,
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      entity: entities[Math.floor(Math.random() * entities.length)],
      department: departments[Math.floor(Math.random() * departments.length)],
      salesPerson: salesPersons[Math.floor(Math.random() * salesPersons.length)],
      customer: customers[Math.floor(Math.random() * customers.length)],
      project: projects[Math.floor(Math.random() * projects.length)],
      subject: expenseSubjects[Math.floor(Math.random() * expenseSubjects.length)],
      amount: Math.round(500 + Math.random() * 9500),
      currency: "CNY",
      docNo: `BX${d.getFullYear()}${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}`,
      summary: ["业务拓展", "客户拜访", "项目评审", "团队建设", "供应商考察", "展会参加"][Math.floor(Math.random() * 6)],
      supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
      status: approvalStatuses[Math.floor(Math.random() * approvalStatuses.length)],
    });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

// KPI summaries
export function generateKpiData() {
  return {
    totalExpense: 12380,
    expenseRate: 18.6,
    yoy: -3.2,
    mom: 1.8,
    budgetDiffAmount: -700,
    budgetDiffRate: -5.4,
    perCapita: 4.2,
  };
}
