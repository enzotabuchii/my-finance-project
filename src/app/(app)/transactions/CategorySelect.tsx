"use client";

import { useTransition } from "react";
import { updateTransactionCategoryAction } from "@/app/actions/transactions";
import type { Category } from "@/db/schema";
import { Loader2 } from "lucide-react";

export function CategorySelect({
  transactionId,
  currentCategoryId,
  categories,
}: {
  transactionId: string;
  currentCategoryId: number | null;
  categories: Category[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative inline-flex items-center w-full max-w-[190px]">
      <select
        disabled={isPending}
        value={currentCategoryId ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          const numVal = val ? parseInt(val, 10) : null;
          startTransition(async () => {
            await updateTransactionCategoryAction(transactionId, numVal);
          });
        }}
        className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-2.5 pr-7 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-white focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-2xs disabled:opacity-50 cursor-pointer"
      >
        <option value="">Sem categoria</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon} {c.name}
          </option>
        ))}
      </select>
      {isPending && (
        <div className="pointer-events-none absolute right-2 flex items-center">
          <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
        </div>
      )}
    </div>
  );
}

