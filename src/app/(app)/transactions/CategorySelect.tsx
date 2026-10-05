"use client";

import { useTransition } from "react";
import { updateTransactionCategoryAction } from "@/app/actions/transactions";
import type { Category } from "@/db/schema";

export function CategorySelect({ 
  transactionId, 
  currentCategoryId, 
  categories 
}: { 
  transactionId: string;
  currentCategoryId: number | null;
  categories: Category[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
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
      className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:opacity-50"
    >
      <option value="">Sem categoria</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.icon} {c.name}
        </option>
      ))}
    </select>
  );
}
