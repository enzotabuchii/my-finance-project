"use server";

import { db, schema } from "@/db";
import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { parseOFX, parseCSV, ParsedStatement } from "@/lib/parsers";
import { ensureSeeded, loadCategorizer } from "@/lib/categorize";

export interface AccountOption {
  id: string;
  name: string;
  institution: string | null;
  type: string;
  balance: number;
}

export interface PreviewTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  isDuplicate: boolean;
  categoryId: number | null;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
}

export interface PreviewResult {
  accountId: string;
  accountName: string;
  totalParsed: number;
  newCount: number;
  duplicateCount: number;
  transactions: PreviewTransaction[];
}

/**
 * Garante a existência do item 'manual' para associar contas criadas manualmente.
 */
async function ensureManualItem() {
  await db
    .insert(schema.items)
    .values({
      id: "manual",
      institution: "Contas Manuais / Extratos",
      status: "UPDATED",
    })
    .onConflictDoNothing();
}

/**
 * Retorna todas as contas disponíveis no sistema (tanto conectadas quanto manuais).
 */
export async function getAccountsAction(): Promise<AccountOption[]> {
  const accs = await db.query.accounts.findMany({
    orderBy: [schema.accounts.name],
  });
  return accs.map((a) => ({
    id: a.id,
    name: a.name,
    institution: a.institution,
    type: a.type,
    balance: Number(a.balance),
  }));
}

/**
 * Cria uma nova conta bancária ou carteira manual.
 */
export async function createAccountAction(formData: FormData) {
  await ensureManualItem();

  const name = (formData.get("name") as string)?.trim();
  const institution = (formData.get("institution") as string)?.trim() || name;
  const type = (formData.get("type") as string) || "BANK";
  const balanceRaw = (formData.get("balance") as string) || "0";
  const balance = parseFloat(balanceRaw.replace(",", ".")) || 0;

  if (!name) {
    throw new Error("O nome da conta é obrigatório.");
  }

  const id = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await db.insert(schema.accounts).values({
    id,
    itemId: "manual",
    name,
    institution,
    type,
    balance,
  });

  revalidatePath("/import");
  revalidatePath("/transactions");
  revalidatePath("/");
  return { id, name };
}

/**
 * Faz o parse do arquivo (OFX ou CSV) e cruza com o banco de dados para
 * apontar duplicadas e sugerir categorias automaticamente.
 */
export async function previewStatementAction(
  accountId: string,
  fileContent: string,
  fileName: string
): Promise<PreviewResult> {
  await ensureSeeded();

  const account = await db.query.accounts.findFirst({
    where: eq(schema.accounts.id, accountId),
  });

  if (!account) {
    throw new Error("Conta bancária não encontrada.");
  }

  const isOfx = fileName.toLowerCase().endsWith(".ofx") || fileContent.includes("<OFX>");
  let parsed: ParsedStatement;

  if (isOfx) {
    parsed = parseOFX(fileContent, accountId);
  } else {
    parsed = parseCSV(fileContent, accountId);
  }

  if (!parsed.transactions.length) {
    throw new Error(
      "Nenhuma transação identificada no arquivo. Verifique se o formato é OFX ou CSV válido."
    );
  }

  // Verifica no banco quais transações já existem (evita duplicatas)
  const ids = parsed.transactions.map((t) => t.id);
  const existingSet = new Set<string>();

  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const existingRows = await db
      .select({ id: schema.transactions.id })
      .from(schema.transactions)
      .where(inArray(schema.transactions.id, chunk));
    existingRows.forEach((r) => existingSet.add(r.id));
  }

  // Categorização automática inteligente
  const categorizer = await loadCategorizer();
  const allCategories = await db.query.categories.findMany();
  const catMap = new Map(allCategories.map((c) => [c.id, c]));

  let newCount = 0;
  let duplicateCount = 0;

  const transactions: PreviewTransaction[] = parsed.transactions.map((tx) => {
    const isDuplicate = existingSet.has(tx.id);
    if (isDuplicate) duplicateCount++;
    else newCount++;

    const catId = categorizer.categorize(tx.description, null, tx.amount);
    const cat = catId ? catMap.get(catId) : null;

    return {
      id: tx.id,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      isDuplicate,
      categoryId: catId,
      categoryName: cat?.name,
      categoryIcon: cat?.icon,
      categoryColor: cat?.color,
    };
  });

  return {
    accountId,
    accountName: `${account.name}${account.institution ? ` (${account.institution})` : ""}`,
    totalParsed: transactions.length,
    newCount,
    duplicateCount,
    transactions,
  };
}

/**
 * Salva as transações selecionadas no banco de dados.
 */
export async function importTransactionsAction(params: {
  accountId: string;
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    categoryId: number | null;
  }>;
}) {
  const { accountId, transactions } = params;

  if (!transactions.length) {
    return { count: 0, message: "Nenhuma transação para importar." };
  }

  const rows = transactions.map((tx) => ({
    id: tx.id,
    accountId,
    date: new Date(tx.date),
    description: tx.description,
    amount: tx.amount,
    status: "POSTED",
    pluggyCategory: null,
    categoryId: tx.categoryId,
    categoryLocked: false,
  }));

  let insertedCount = 0;

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const res = await db
      .insert(schema.transactions)
      .values(chunk)
      .onConflictDoNothing()
      .returning({ id: schema.transactions.id });
    insertedCount += res.length;
  }

  // Atualiza o saldo da conta somando as movimentações importadas
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  await db
    .update(schema.accounts)
    .set({
      balance: sql`${schema.accounts.balance} + ${totalAmount}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.accounts.id, accountId));

  revalidatePath("/transactions");
  revalidatePath("/");
  revalidatePath("/budgets");
  revalidatePath("/import");

  return {
    count: insertedCount,
    message: `${insertedCount} transações importadas com sucesso!`,
  };
}
