import { PluggyClient } from "pluggy-sdk";
import type { Account as PluggyAccount, Transaction as PluggyTransaction } from "pluggy-sdk";
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { ensureSeeded, loadCategorizer } from "./categorize";
import { getItemIds } from "./settings";
import { checkBudgets, notifyTransactions } from "./notify";
import { localDay } from "./format";

export function pluggyConfigured() {
  return !!(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);
}

export function pluggy() {
  if (!pluggyConfigured()) throw new Error("PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET não configurados.");
  return new PluggyClient({
    clientId: process.env.PLUGGY_CLIENT_ID!,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET!,
  });
}

/** Histórico buscado na primeira sincronização (Open Finance costuma liberar até 12 meses). */
const FIRST_SYNC_DAYS = 365;
/** Nas próximas, revisita alguns dias para pegar transações pendentes que foram efetivadas. */
const OVERLAP_DAYS = 10;

/**
 * Normaliza o sinal: negativo = saída, positivo = entrada.
 * Em cartão de crédito o Pluggy devolve compras positivas e pagamentos negativos.
 */
function signedAmount(tx: PluggyTransaction, acc: PluggyAccount): number {
  const v = Math.abs(tx.amount);
  if (acc.type === "CREDIT") return tx.amount > 0 ? -v : v;
  return tx.type === "DEBIT" ? -v : v;
}

export interface SyncResult {
  newTransactions: number;
  updatedTransactions: number;
  accounts: number;
  calendarEvents: number;
  budgetAlerts: number;
  errors: string[];
}

export async function runSync(trigger: "manual" | "cron" | "webhook", onlyItemId?: string): Promise<SyncResult> {
  await ensureSeeded();
  const [run] = await db.insert(schema.syncRuns).values({ trigger, status: "running" }).returning();
  const result: SyncResult = { newTransactions: 0, updatedTransactions: 0, accounts: 0, calendarEvents: 0, budgetAlerts: 0, errors: [] };

  try {
    const client = pluggy();
    const categorizer = await loadCategorizer();
    let itemIds = await getItemIds();
    if (onlyItemId) itemIds = itemIds.filter((id) => id === onlyItemId);
    if (!itemIds.length) throw new Error("Nenhuma conexão (item) do Pluggy cadastrada. Adicione em Configurações.");

    for (const itemId of itemIds) {
      try {
        const item = await client.fetchItem(itemId);
        const existing = await db.query.items.findFirst({ where: eq(schema.items.id, itemId) });
        const institution = item.connector?.name ?? null;
        await db
          .insert(schema.items)
          .values({
            id: itemId,
            institution,
            status: item.status,
            error: item.error?.message ?? null,
            lastUpdatedAt: item.lastUpdatedAt ? new Date(item.lastUpdatedAt) : null,
          })
          .onConflictDoUpdate({
            target: schema.items.id,
            set: {
              institution,
              status: item.status,
              error: item.error?.message ?? null,
              lastUpdatedAt: item.lastUpdatedAt ? new Date(item.lastUpdatedAt) : null,
            },
          });

        const since = existing?.lastSyncedAt
          ? new Date(existing.lastSyncedAt.getTime() - OVERLAP_DAYS * 86_400_000)
          : new Date(Date.now() - FIRST_SYNC_DAYS * 86_400_000);

        const { results: accs } = await client.fetchAccounts(itemId);
        for (const acc of accs) {
          result.accounts++;
          const accRow = {
            id: acc.id,
            itemId,
            institution,
            name: acc.marketingName ?? acc.name,
            type: acc.type,
            subtype: acc.subtype ?? null,
            number: acc.number ?? null,
            balance: acc.balance ?? 0,
            creditLimit: acc.creditData?.creditLimit ?? null,
            updatedAt: new Date(),
          };
          await db.insert(schema.accounts).values(accRow).onConflictDoUpdate({ target: schema.accounts.id, set: accRow });

          const txs = await client.fetchAllTransactions(acc.id, { dateFrom: localDay(since) });
          if (!txs.length) continue;

          const ids = txs.map((x) => x.id);
          const known = new Set<string>();
          for (let i = 0; i < ids.length; i += 500) {
            const rows = await db
              .select({ id: schema.transactions.id })
              .from(schema.transactions)
              .where(inArray(schema.transactions.id, ids.slice(i, i + 500)));
            rows.forEach((r) => known.add(r.id));
          }

          const rows = txs.map((tx) => {
            const amount = signedAmount(tx, acc);
            const description = tx.merchant?.businessName || tx.merchant?.name || tx.description;
            return {
              id: tx.id,
              accountId: acc.id,
              date: new Date(tx.date),
              description,
              amount,
              status: tx.status ?? "POSTED",
              pluggyCategory: tx.category ?? null,
              categoryId: categorizer.categorize(`${description} ${tx.description}`, tx.category ?? null, amount),
            };
          });

          for (let i = 0; i < rows.length; i += 200) {
            await db
              .insert(schema.transactions)
              .values(rows.slice(i, i + 200))
              .onConflictDoUpdate({
                target: schema.transactions.id,
                set: {
                  date: sql`excluded.date`,
                  description: sql`excluded.description`,
                  amount: sql`excluded.amount`,
                  status: sql`excluded.status`,
                  pluggyCategory: sql`excluded.pluggy_category`,
                  // Respeita escolha manual do usuário.
                  categoryId: sql`case when ${schema.transactions.categoryLocked} then ${schema.transactions.categoryId} else excluded.category_id end`,
                },
              });
          }
          const fresh = rows.filter((r) => !known.has(r.id)).length;
          result.newTransactions += fresh;
          result.updatedTransactions += rows.length - fresh;
        }

        await db.update(schema.items).set({ lastSyncedAt: new Date() }).where(eq(schema.items.id, itemId));
      } catch (e) {
        result.errors.push(`Item ${itemId}: ${(e as Error).message}`);
      }
    }

    const cal = await notifyTransactions().catch((e) => ({ created: 0, errors: [(e as Error).message] }));
    result.calendarEvents = cal.created;
    result.errors.push(...cal.errors.map((m) => `Calendar: ${m}`));

    const bud = await checkBudgets().catch((e) => ({ alerts: 0, errors: [(e as Error).message] }));
    result.budgetAlerts = bud.alerts;
    result.errors.push(...bud.errors.map((m) => `Orçamento: ${m}`));
  } catch (e) {
    result.errors.push((e as Error).message);
  }

  await db
    .update(schema.syncRuns)
    .set({
      status: result.errors.length ? (result.accounts ? "partial" : "error") : "ok",
      message: result.errors.join(" | ") || null,
      newTransactions: result.newTransactions,
      finishedAt: new Date(),
    })
    .where(eq(schema.syncRuns.id, run.id));

  return result;
}
