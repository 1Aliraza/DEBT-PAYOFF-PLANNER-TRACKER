export type DebtType =
  | "creditCard"
  | "medical"
  | "personalLoan"
  | "studentLoan"
  | "taxDebt"
  | "auto"
  | "businessDebt"
  | "other";

export interface Debt {
  id: string;
  name: string;
  balance: number;
  apr: number;
  minimumPayment: number;
  debtType: DebtType;
  isSecured: boolean;
  dueDate: number;
  dateAdded: string;
  order?: number;
}

export interface DebtMonthSnapshot {
  debtId: string;
  balance: number;
  payment: number;
  principal: number;
  interest: number;
}

export interface MonthlySnapshot {
  month: number;
  date: Date;
  totalBalance: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  debtBreakdown: DebtMonthSnapshot[];
  paidOffDebts: string[];
}

export interface StrategyResult {
  snapshots: MonthlySnapshot[];
  totalInterestPaid: number;
  totalMonths: number;
  payoffDate: Date;
  totalPaid: number;
}

export type Strategy = "snowball" | "avalanche" | "custom";

export function isSecuredByType(type: DebtType): boolean {
  return type === "auto";
}

function calculateMonthlyInterest(balance: number, apr: number): number {
  return balance * (apr / 100 / 12);
}

export function runStrategy(
  debts: Debt[],
  extraPayment: number,
  strategy: Strategy,
  customOrder?: string[]
): StrategyResult {
  if (debts.length === 0) {
    return {
      snapshots: [],
      totalInterestPaid: 0,
      totalMonths: 0,
      payoffDate: new Date(),
      totalPaid: 0,
    };
  }

  let sortedDebts: Debt[];
  if (strategy === "snowball") {
    sortedDebts = [...debts].sort((a, b) => a.balance - b.balance);
  } else if (strategy === "avalanche") {
    sortedDebts = [...debts].sort((a, b) => b.apr - a.apr);
  } else {
    if (customOrder && customOrder.length > 0) {
      sortedDebts = customOrder
        .map((id) => debts.find((d) => d.id === id))
        .filter(Boolean) as Debt[];
      const remaining = debts.filter((d) => !customOrder.includes(d.id));
      sortedDebts = [...sortedDebts, ...remaining];
    } else {
      sortedDebts = [...debts];
    }
  }

  const balances = new Map<string, number>();
  sortedDebts.forEach((d) => balances.set(d.id, d.balance));

  const snapshots: MonthlySnapshot[] = [];
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  let month = 0;
  const MAX_MONTHS = 600;
  const startDate = new Date();

  while (month < MAX_MONTHS) {
    const allPaid = [...balances.values()].every((b) => b <= 0);
    if (allPaid) break;

    month++;
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + month);

    let remainingExtra = extraPayment;
    const breakdown: DebtMonthSnapshot[] = [];
    let monthInterest = 0;
    let monthPrincipal = 0;
    const paidOffThisMonth: string[] = [];

    const activeDebts = sortedDebts.filter(
      (d) => (balances.get(d.id) ?? 0) > 0
    );

    for (const debt of activeDebts) {
      const balance = balances.get(debt.id) ?? 0;
      if (balance <= 0) continue;

      const interest = calculateMonthlyInterest(balance, debt.apr);
      const minPay = Math.min(debt.minimumPayment, balance + interest);
      const principal = Math.max(0, minPay - interest);

      monthInterest += interest;
      monthPrincipal += principal;

      const newBalance = Math.max(0, balance - principal);
      balances.set(debt.id, newBalance);

      breakdown.push({
        debtId: debt.id,
        balance: newBalance,
        payment: minPay,
        principal,
        interest,
      });

      if (newBalance <= 0) paidOffThisMonth.push(debt.id);
    }

    for (const debt of activeDebts) {
      if (remainingExtra <= 0) break;
      const balance = balances.get(debt.id) ?? 0;
      if (balance <= 0) continue;

      const extraApplied = Math.min(remainingExtra, balance);
      const newBalance = balance - extraApplied;
      balances.set(debt.id, newBalance);
      remainingExtra -= extraApplied;
      monthPrincipal += extraApplied;

      const snapIdx = breakdown.findIndex((s) => s.debtId === debt.id);
      if (snapIdx >= 0) {
        breakdown[snapIdx].balance = newBalance;
        breakdown[snapIdx].payment += extraApplied;
        breakdown[snapIdx].principal += extraApplied;
      }

      if (newBalance <= 0 && !paidOffThisMonth.includes(debt.id)) {
        paidOffThisMonth.push(debt.id);
      }
    }

    totalInterestPaid += monthInterest;
    totalPrincipalPaid += monthPrincipal;

    const totalBalance = [...balances.values()].reduce(
      (sum, b) => sum + Math.max(0, b),
      0
    );

    snapshots.push({
      month,
      date,
      totalBalance,
      totalInterestPaid,
      totalPrincipalPaid,
      debtBreakdown: breakdown,
      paidOffDebts: paidOffThisMonth,
    });
  }

  const payoffDate = snapshots.length > 0
    ? snapshots[snapshots.length - 1].date
    : new Date();

  return {
    snapshots,
    totalInterestPaid,
    totalMonths: month,
    payoffDate,
    totalPaid: totalInterestPaid + debts.reduce((s, d) => s + d.balance, 0),
  };
}

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 10_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function monthsToText(months: number): string {
  if (months < 1) return "< 1 month";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}mo`;
  if (m === 0) return `${y}yr`;
  return `${y}yr ${m}mo`;
}

export function debtTypeLabel(type: DebtType): string {
  const labels: Record<DebtType, string> = {
    creditCard: "Credit Card",
    medical: "Medical",
    personalLoan: "Personal Loan",
    studentLoan: "Student Loan",
    taxDebt: "Tax Debt",
    auto: "Auto Loan",
    businessDebt: "Business Debt",
    other: "Other",
  };
  return labels[type] ?? "Other";
}

export function debtTypeIcon(type: DebtType): string {
  const icons: Record<DebtType, string> = {
    creditCard: "card",
    medical: "medkit",
    personalLoan: "cash",
    studentLoan: "school",
    taxDebt: "business",
    auto: "car",
    businessDebt: "briefcase",
    other: "ellipsis-horizontal-circle",
  };
  return icons[type] ?? "ellipsis-horizontal-circle";
}

export function estimatePayoffDate(
  debt: Debt
): Date {
  const date = new Date();
  if (debt.minimumPayment <= 0 || debt.balance <= 0) return date;

  let balance = debt.balance;
  let months = 0;
  const monthlyRate = debt.apr / 100 / 12;

  while (balance > 0 && months < 600) {
    const interest = balance * monthlyRate;
    const principalRaw = Math.max(0, debt.minimumPayment - interest);
    if (principalRaw <= 0) {
      months = 600;
      break;
    }
    // Hotfix: cap principal at remaining balance so last payment doesn't overpay
    const principal = Math.min(principalRaw, balance);
    balance -= principal;
    months++;
  }

  date.setMonth(date.getMonth() + months);
  return date;
}

export function approximateDebtRange(totalUnsecured: number): string {
  const low = Math.round(totalUnsecured * 0.4 / 1000) * 1000;
  const high = Math.round(totalUnsecured * 0.6 / 1000) * 1000;
  return `$${low.toLocaleString()} - $${high.toLocaleString()}`;
}
