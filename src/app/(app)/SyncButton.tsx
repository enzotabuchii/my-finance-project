"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { syncNowAction } from "../actions/sync";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          const res = await syncNowAction();
          if (res.errors.length) {
            alert("Atenção: " + res.errors.join("\n"));
          } else {
            alert(`Sincronizado! ${res.newTransactions} novas transações.`);
          }
          router.refresh();
        });
      }}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
    >
      <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Sincronizando..." : "Sincronizar"}
    </button>
  );
}
