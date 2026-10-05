import { and, eq, gte, isNull, lt, desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { calendarConnected, upsertEvent } from "./google";
import { getSettings } from "./settings";
import { budgetStatus } from "./stats";
import { currentMonth, formatBRL, localDay, monthLabel } from "./format";

const t = schema.transactions;

/** Só notifica transações recentes — evita inundar o calendário com o histórico na 1ª sincronização. */
const LOOKBACK_DAYS = 3;
const MAX_EVENTS_PER_RUN = 60;

const COLOR = { income: "10", expense: "11", transfer: "8" } as const;

type Row = {
  tx: typeof t.$inferSelect;
  cat: typeof schema.categories.$inferSelect | null;
  acc: typeof schema.accounts.$inferSelect;
};

function kindOf(r: Row): keyof typeof COLOR {
  if (r.cat?.kind === "transfer") return "transfer";
  return r.tx.amount > 0 ? "income" : "expense";
}

function line(r: Row) {
  const sign = r.tx.amount > 0 ? "+" : "−";
  return `${sign}${formatBRL(Math.abs(r.tx.amount))}`;
}

export async function notifyTransactions(): Promise<{ created: number; errors: string[] }> {
  const s = await getSettings();
  if (s.calendarMode === "off" || !(await calendarConnected())) return { created: 0, errors: [] };

  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
  // Antigas: marca como notificadas sem criar evento.
  await db
    .update(t)
    .set({ calendarNotifiedAt: new Date() })
    .where(and(isNull(t.calendarNotifiedAt), lt(t.date, cutoff)));

  const pending: Row[] = await db
    .select({ tx: t, cat: schema.categories, acc: schema.accounts })
    .from(t)
    .innerJoin(schema.accounts, eq(t.accountId, schema.accounts.id))
    .leftJoin(schema.categories, eq(t.categoryId, schema.categories.id))
    .where(and(isNull(t.calendarNotifiedAt), gte(t.date, cutoff)))
    .orderBy(desc(t.date))
    .limit(MAX_EVENTS_PER_RUN);

  let created = 0;
  const errors: string[] = [];
  const done: string[] = [];

  if (s.calendarMode === "each") {
    for (const r of pending) {
      if (Math.abs(r.tx.amount) < s.calendarMinAmount) {
        done.push(r.tx.id);
        continue;
      }
      const k = kindOf(r);
      const icon = k === "income" ? "🟢" : k === "expense" ? "🔴" : "🔁";
      try {
        await upsertEvent(`tx:${r.tx.id}`, {
          summary: `${icon} ${line(r)} · ${r.tx.description}`,
          description: [
            `Conta: ${r.acc.institution ?? ""} ${r.acc.name}`.trim(),
            `Categoria: ${r.cat ? `${r.cat.icon} ${r.cat.name}` : "Sem categoria"}`,
            r.acc.type === "BANK" ? `Saldo atual da conta: ${formatBRL(r.acc.balance)}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          colorId: COLOR[k],
          date: localDay(r.tx.date),
        });
        created++;
        done.push(r.tx.id);
      } catch (e) {
        errors.push((e as Error).message);
        break; // provavelmente problema de credencial; tenta de novo na próxima sync
      }
    }
  } else {
    // Modo resumo diário: 1 evento por dia, atualizado a cada sync.
    const days = [...new Set(pending.map((r) => localDay(r.tx.date)))];
    for (const day of days) {
      const start = new Date(`${day}T00:00:00-03:00`);
      const end = new Date(start.getTime() + 86_400_000);
      const all: Row[] = await db
        .select({ tx: t, cat: schema.categories, acc: schema.accounts })
        .from(t)
        .innerJoin(schema.accounts, eq(t.accountId, schema.accounts.id))
        .leftJoin(schema.categories, eq(t.categoryId, schema.categories.id))
        .where(and(gte(t.date, start), lt(t.date, end)))
        .orderBy(t.date);
      const inc = all.filter((r) => kindOf(r) === "income").reduce((a, r) => a + r.tx.amount, 0);
      const exp = all.filter((r) => kindOf(r) === "expense").reduce((a, r) => a - r.tx.amount, 0);
      try {
        await upsertEvent(`day:${day}`, {
          summary: `💰 +${formatBRL(inc)} / −${formatBRL(exp)}`,
          description: all
            .map((r) => `${line(r)}  ${r.tx.description}  (${r.cat?.name ?? "Sem categoria"} · ${r.acc.institution ?? r.acc.name})`)
            .join("\n"),
          colorId: inc >= exp ? COLOR.income : COLOR.expense,
          date: day,
        });
        created++;
        done.push(...pending.filter((r) => localDay(r.tx.date) === day).map((r) => r.tx.id));
      } catch (e) {
        errors.push((e as Error).message);
        break;
      }
    }
  }

  for (const id of done) await db.update(t).set({ calendarNotifiedAt: new Date() }).where(eq(t.id, id));
  return { created, errors };
}

/** Verifica orçamentos do mês atual e registra/dispara alertas ao cruzar os limites (ex: 80% e 100%). */
export async function checkBudgets(): Promise<{ alerts: number; errors: string[] }> {
  const month = currentMonth();
  const s = await getSettings();
  const status = await budgetStatus(month);
  const connected = s.calendarBudgetAlerts && (await calendarConnected());
  let alerts = 0;
  const errors: string[] = [];

  for (const b of status) {
    for (const th of [...s.budgetAlertThresholds].sort((a, z) => a - z)) {
      if (b.pct < th) continue;
      const inserted = await db
        .insert(schema.budgetAlerts)
        .values({ budgetId: b.id, month, threshold: th, spent: b.spent, limit: b.limit })
        .onConflictDoNothing()
        .returning({ id: schema.budgetAlerts.id });
      if (!inserted.length) continue;
      alerts++;
      if (!connected) continue;
      const over = th >= 100;
      try {
        const start = new Date(Date.now() + 2 * 60_000);
        await upsertEvent(`budget:${b.id}:${month}:${th}`, {
          summary: `${over ? "🚨" : "⚠️"} Orçamento ${b.name}: ${Math.round(b.pct)}% usado`,
          description: `${monthLabel(month)}\nGasto: ${formatBRL(b.spent)} de ${formatBRL(b.limit)}\n${
            over ? `Passou ${formatBRL(b.spent - b.limit)} do limite.` : `Restam ${formatBRL(b.limit - b.spent)}.`
          }`,
          colorId: over ? "11" : "5",
          start,
          popupMinutes: 0,
        });
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
  }
  return { alerts, errors };
}
