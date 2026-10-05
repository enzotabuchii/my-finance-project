"use client";
import { runSync } from "@/lib/sync";

export async function syncNowAction() {
  const result = await runSync("manual");
  return result;
}
