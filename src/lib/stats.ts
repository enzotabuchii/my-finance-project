import { and, eq, gte, lt, sql, asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { monthRange, shiftMonth } from "./format";

const t = schema.transactions;
const c = schema.categories;

/**
 * Classificação efetiva de uma transação:
 *  - categoria "transfer" => ignorada nos totais
 *  - categoria income/expense => conforme a categoria (estornos abatem o gasto)
 *  - sem categoria => pelo sinal do valor
 */
const effKind = sql<string>`coalesce(${c.kind}, case when ${t.amount} > 0 then 'income' else 'expense' end)`;

export async function monthTotals(month: string) {
  const { start, end } = monthRange(month);
  const [row] = await db
    .select({
      income: sql<number>`coalesce(sum(case when ${effKind} = 'income' then ${t.amount} end), 0)::float`,
      expense: sql<number>`coalesce(-sum(case when ${effKind} = 'expense' then ${t.amount} end), 0)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(t)
    .leftJoin(c, eq(t.categoryId, c.id))
    .where(and(gte(t.date, start), lt(t.date, end)));
  return { income: row.income, expense: row.expense, net: row.income - row.expense, count: row.count };
}

export async function history(month: string, months = 6) {
  const first = shiftMonth(month, -(months - 1));
  const { start } = monthRange(first);
  const { end } = monthRange(month);
  const rows = await db
    .select({
      month: sql<string>`to_char(${t.date} at time zone 'America/Sao_Paulo', 'YYYY-MM')`,
      income: sql<number>`coalesce(sum(case when ${effKind} = 'income' then ${t.amount} end), 0)::float`,
      expense: sql<number>`coalesce(-sum(case when ${effKind} = 'expense' then ${t.amount} end), 0)::float`,
    })
    .from(t)
    .leftJoin(c, eq(t.categoryId, c.id))
    .where(and(gte(t.date, start), lt(t.date, end)))
    .groupBy(sql`1`);
  const map = new Map(rows.map((r) => [r.month, r]));
  return Array.from({ length: months }, (_, i) => {
    const m = shiftMonth(first, i);
    return { month: m, income: map.get(m)?.income ?? 0, expense: map.get(m)?.expense ?? 0 };
  });
}

export async function spendingByCategory(month: string) {
  const { start, end } = monthRange(month);
  const rows = await db
    .select({
      categoryId: c.id,
      name: sql<string>`coalesce(${c.name}, 'Sem categoria')`,
      icon: sql<string>`coalesce(${c.icon}, '❔')`,
      color: sql<string>`coalesce(${c.color}, '#475569')`,
      total: sql<number>`(-sum(${t.amount}))::float`,
    })
    .from(t)
    .leftJoin(c, eq(t.categoryId, c.id))
    .where(and(gte(t.date, start), lt(t.date, end), sql`${effKind} = 'expense'`))
    .groupBy(c.id, c.name, c.icon, c.color);
  return rows.filter((r) => r.total > 0.009).sort((a, b) => b.total - a.total);
}

export interface BudgetStatus {
  id: number;
  categoryId: number | null;
  name: string;
  icon: string;
  color: string;
  limit: number;
  spent: number;
  pct: number;
}

export async function budgetStatus(month: string): Promise<BudgetStatus[]> {
  const [budgets, byCat, totals] = await Promise.all([
    db
      .select({ b: schema.budgets, cat: c })
      .from(schema.budgets)
      .leftJoin(c, eq(schema.budgets.categoryId, c.id))
      .orderBy(asc(schema.budgets.id)),
    spendingByCategory(month),
    monthTotals(month),
  ]);
  const spentMap = new Map(byCat.map((r) => [r.categoryId, r.total]));
  return budgets
    .map(({ b, cat }) => {
      const spent = b.categoryId == null ? totals.expense : spentMap.get(b.categoryId) ?? 0;
      return {
        id: b.id,
        categoryId: b.categoryId,
        name: cat?.name ?? "Orçamento geral",
        icon: cat?.icon ?? "🎯",
        color: cat?.color ?? "#38bdf8",
        limit: b.amount,
        spent,
        pct: b.amount > 0 ? (spent / b.amount) * 100 : 0,
      };
    })
    .sort((a, b) => (a.categoryId === null ? -1 : b.categoryId === null ? 1 : b.pct - a.pct));
}
