import { revalidatePath } from "next/cache";
import { setSetting, getSettings } from "@/lib/settings";
import { runSync } from "@/lib/sync";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function addPluggyItemAction(itemId: string) {
  const current = await getSettings();
  const ids = new Set(current.pluggyItemIds || []);
  ids.add(itemId);
  await setSetting("pluggyItemIds", Array.from(ids));
  
  // Sync it right away
  await runSync("manual", itemId);
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function removePluggyItemAction(itemId: string) {
  const current = await getSettings();
  const ids = new Set(current.pluggyItemIds || []);
  ids.delete(itemId);
  await setSetting("pluggyItemIds", Array.from(ids));
  
  // Clean up db
  await db.delete(schema.items).where(eq(schema.items.id, itemId));
  revalidatePath("/settings");
  revalidatePath("/");
}
