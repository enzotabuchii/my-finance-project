"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { reapplyRules } from "@/lib/categorize";

/**
 * Exclui uma conta bancária e todas as suas transações vinculadas.
 */
export async function deleteAccountAction(accountId: string) {
  await db.delete(schema.accounts).where(eq(schema.accounts.id, accountId));
  revalidatePath("/settings");
  revalidatePath("/import");
  revalidatePath("/transactions");
  revalidatePath("/");
}

/**
 * Reaplica as regras automáticas de categorização nas transações existentes.
 */
export async function reapplyCategorizationAction() {
  const changed = await reapplyRules();
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/");
  return { changed };
}
