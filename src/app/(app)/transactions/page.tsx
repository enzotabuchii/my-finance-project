import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { formatBRL } from "@/lib/format";
import { CategorySelect } from "./CategorySelect";
import { ensureSeeded } from "@/lib/categorize";
import Link from "next/link";
import { UploadCloud, ArrowLeftRight, Landmark, Calendar } from "lucide-react";

export default async function TransactionsPage() {
  await ensureSeeded();
  const txs = await db.query.transactions.findMany({
    orderBy: [desc(schema.transactions.date)],
    with: {
      account: true,
      category: true,
    },
  });

  const categories = await db.query.categories.findMany();

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Transações
            </h1>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60">
              {txs.length} {txs.length === 1 ? "registro" : "registros"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Lista completa de transações sincronizadas e importadas de todas as suas contas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/import"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 hover:shadow-md transition-all duration-150"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Importar Extrato</span>
          </Link>
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50/90 text-slate-500 border-b border-slate-200/70">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-6 pr-3 text-xs font-semibold uppercase tracking-wider text-slate-600"
                >
                  Data
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600"
                >
                  Descrição
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600"
                >
                  Conta
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600 text-right"
                >
                  Valor
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600 w-52"
                >
                  Categoria
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {txs.map((tx) => {
                const isIncome = tx.amount > 0;
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/80 transition duration-150 group"
                  >
                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {new Date(tx.date).toLocaleDateString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm border border-slate-200/50 shrink-0"
                          title={tx.category?.name ?? "Sem categoria"}
                        >
                          {tx.category?.icon ?? "📦"}
                        </span>
                        <span className="truncate max-w-xs sm:max-w-md font-medium text-slate-800">
                          {tx.description}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                      {tx.account?.name ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          <Landmark className="h-3.5 w-3.5 text-slate-400" />
                          {tx.account.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Desconhecida</span>
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-4 text-sm font-bold font-mono tabular-nums text-right ${
                        isIncome ? "text-emerald-600" : "text-slate-900"
                      }`}
                    >
                      {isIncome ? "+" : ""}
                      {formatBRL(tx.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                      <CategorySelect
                        transactionId={tx.id}
                        currentCategoryId={tx.categoryId}
                        categories={categories}
                      />
                    </td>
                  </tr>
                );
              })}
              {txs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                      <ArrowLeftRight className="h-6 w-6" />
                    </div>
                    <p className="text-base font-semibold text-slate-800">
                      Nenhuma transação encontrada
                    </p>
                    <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                      Importe seu extrato em arquivo OFX ou CSV para registrar suas movimentações.
                    </p>
                    <div className="mt-5">
                      <Link
                        href="/import"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 transition"
                      >
                        <UploadCloud className="h-4 w-4" />
                        Importar Primeiro Extrato
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

