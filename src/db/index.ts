import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __pg: ReturnType<typeof postgres> | undefined;
}

function client() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada.");
  // prepare:false => compatível com poolers (Neon/Supabase em modo transaction).
  return postgres(url, { prepare: false, max: 5 });
}

const sql = globalThis.__pg ?? client();
if (process.env.NODE_ENV !== "production") globalThis.__pg = sql;

export const db = drizzle(sql, { schema });
export { schema };
