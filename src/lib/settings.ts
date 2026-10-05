import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/** Configurações persistidas em tabela key/value (JSON). */
export type CalendarMode = "each" | "daily" | "off";

export interface AppSettings {
  pluggyItemIds: string[];
  googleRefreshToken: string | null;
  googleCalendarId: string | null;
  googleEmail: string | null;
  calendarMode: CalendarMode;
  calendarMinAmount: number;
  calendarBudgetAlerts: boolean;
  budgetAlertThresholds: number[];
}

const DEFAULTS: AppSettings = {
  pluggyItemIds: [],
  googleRefreshToken: null,
  googleCalendarId: null,
  googleEmail: null,
  calendarMode: "each",
  calendarMinAmount: 0,
  calendarBudgetAlerts: true,
  budgetAlertThresholds: [80, 100],
};

export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, key) });
  return (row?.value as AppSettings[K] | undefined) ?? DEFAULTS[key];
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(schema.settings);
  const out = { ...DEFAULTS } as Record<string, unknown>;
  for (const r of rows) if (r.key in DEFAULTS) out[r.key] = r.value;
  return out as unknown as AppSettings;
}

export async function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  await db
    .insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } });
}

/** IDs de items vindos do banco + variável de ambiente PLUGGY_ITEM_IDS (separados por vírgula). */
export async function getItemIds(): Promise<string[]> {
  const fromEnv = (process.env.PLUGGY_ITEM_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const fromDb = await getSetting("pluggyItemIds");
  return [...new Set([...fromEnv, ...fromDb])];
}
