// Mock data for fund/capital flow BI query platform

export const bankAccounts = [
  "6222021234567890001",
  "6222021234567890002",
  "6222021234567890003",
  "6222021234567890004",
  "6222021234567890005",
];

export const bankNames = [
  "中国工商银行", "中国建设银行", "中国银行", "招商银行", "交通银行",
  "中国农业银行", "浦发银行", "中信银行",
];

export const counterparties = [
  "比亚迪股份有限公司", "特斯拉（上海）有限公司", "一汽-大众汽车有限公司",
  "丰田汽车（中国）投资有限公司", "本田汽车（中国）有限公司",
  "华晨宝马汽车有限公司", "北京奔驰汽车有限公司", "吉利汽车控股有限公司",
  "长城汽车股份有限公司", "理想汽车有限公司", "蔚来汽车科技有限公司",
  "小鹏汽车有限公司", "上汽集团股份有限公司", "广汽集团股份有限公司",
  "宁德时代新能源科技有限公司",
];

export const transactionTypes = [
  "转账", "贷记", "借记", "托收", "汇款", "票据", "代扣", "利息",
];

export const businessSources = [
  "ERP系统", "OA报销", "资金管理系统", "银企直联", "手工录入",
];

export const fundCurrencies = ["CNY", "USD", "EUR", "HKD", "JPY"];

export const fundEntities = ["集团合并", "A公司", "B公司", "C公司", "D公司"];

export const summaryKeywords = [
  "货款支付", "服务费", "咨询费", "工资", "社保", "公积金",
  "租金", "水电费", "材料采购", "设备采购", "退款", "预付款",
  "保证金", "利息收入", "股利分配", "税费缴纳", "运输费",
];

// Dimensions available for group-by
export const fundDimensions = [
  { key: "transDate", label: "交易日期" },
  { key: "bankAccount", label: "银行账户" },
  { key: "bankName", label: "开户银行" },
  { key: "counterparty", label: "交易对手" },
  { key: "transType", label: "交易类型" },
  { key: "businessSource", label: "业务系统来源" },
  { key: "currency", label: "币种" },
];

// Metrics
export const fundMetrics = [
  { key: "incomeAmount", label: "收入金额" },
  { key: "expenseAmount", label: "支出金额" },
  { key: "netFlow", label: "净流入" },
  { key: "transCount", label: "交易笔数" },
  { key: "avgAmount", label: "平均交易金额" },
];

export interface FundDetailRow {
  id: string;
  transDate: string;
  incomeAmount: number;
  expenseAmount: number;
  balance: number;
  counterparty: string;
  bankAccount: string;
  bankName: string;
  summary: string;
  transType: string;
  businessSource: string;
  currency: string;
  entity: string;
}

const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export function generateFundDetailRows(count: number = 200): FundDetailRow[] {
  const rows: FundDetailRow[] = [];
  let balance = randomBetween(5000000, 20000000);

  for (let i = 0; i < count; i++) {
    const isIncome = Math.random() > 0.45;
    const amount = randomBetween(1000, 5000000);
    const incomeAmount = isIncome ? amount : 0;
    const expenseAmount = isIncome ? 0 : amount;
    balance += incomeAmount - expenseAmount;

    const month = randomBetween(1, 12);
    const day = randomBetween(1, 28);

    rows.push({
      id: `FD-${String(i + 1).padStart(6, "0")}`,
      transDate: `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      incomeAmount,
      expenseAmount,
      balance: Math.max(balance, 0),
      counterparty: randomFrom(counterparties),
      bankAccount: randomFrom(bankAccounts),
      bankName: randomFrom(bankNames),
      summary: randomFrom(summaryKeywords),
      transType: randomFrom(transactionTypes),
      businessSource: randomFrom(businessSources),
      currency: Math.random() > 0.15 ? "CNY" : randomFrom(fundCurrencies),
      entity: randomFrom(fundEntities),
    });
  }

  return rows.sort((a, b) => b.transDate.localeCompare(a.transDate));
}

export function generateFundGroupedData(
  dimensions: string[],
  metrics: string[],
  rows: FundDetailRow[]
): Record<string, unknown>[] {
  if (dimensions.length === 0) return [];

  const groups: Record<string, FundDetailRow[]> = {};
  rows.forEach(row => {
    const key = dimensions.map(d => String((row as unknown as Record<string, unknown>)[d] ?? "")).join("|||");
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });

  return Object.entries(groups).map(([key, items]) => {
    const vals = key.split("|||");
    const result: Record<string, unknown> = {};
    dimensions.forEach((d, i) => {
      const dim = fundDimensions.find(fd => fd.key === d);
      result[dim?.label ?? d] = vals[i];
    });

    if (metrics.includes("incomeAmount")) {
      result["收入金额"] = items.reduce((s, r) => s + r.incomeAmount, 0);
    }
    if (metrics.includes("expenseAmount")) {
      result["支出金额"] = items.reduce((s, r) => s + r.expenseAmount, 0);
    }
    if (metrics.includes("netFlow")) {
      result["净流入"] = items.reduce((s, r) => s + r.incomeAmount - r.expenseAmount, 0);
    }
    if (metrics.includes("transCount")) {
      result["交易笔数"] = items.length;
    }
    if (metrics.includes("avgAmount")) {
      const total = items.reduce((s, r) => s + r.incomeAmount + r.expenseAmount, 0);
      result["平均交易金额"] = Math.round(total / items.length);
    }

    return result;
  });
}
