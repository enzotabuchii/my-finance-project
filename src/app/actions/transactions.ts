"use server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateTransactionCategoryAction(transactionId: string, categoryId: number | null) {
  await db.update(schema.transactions)
    .set({ 
      categoryId, 
      categoryLocked: true // User manually chose it, don't auto-override
    })
    .where(eq(schema.transactions.id, transactionId));
    
  revalidatePath("/transactions");
  revalidatePath("/");
}
