import { currentMonth, formatBRL } from "@/lib/format";
import { monthTotals, spendingByCategory } from "@/lib/stats";
import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import Link from "next/link";
import {
  UploadCloud,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  Clock,
  PieChart,
  Calendar,
  Sparkles,
} from "lucide-react";
import { SpendChart } from "./SpendChart";

export default async function DashboardPage() {
  const month = currentMonth();
  const totals = await monthTotals(month);
  const byCategory = await spendingByCategory(month);

  const recentTxs = await db.query.transactions.findMany({
    orderBy: [desc(schema.transactions.date)],
    limit: 5,
    with: {
      account: true,
      category: true,
    },
  });

  // Format month for display (e.g. Outubro 2026)
  const [yearStr, monthStr] = month.split("-");
  const monthDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
  const formattedMonth = monthDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Calendar className="h-3.5 w-3.5" />
            <span className="capitalize">{formattedMonth}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Visão Geral
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe suas finanças, receitas, despesas e fluxo de caixa.
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

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Receitas */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Receitas
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 font-mono tabular-nums">
              {formatBRL(totals.income)}
            </span>
            <p className="mt-1.5 text-xs text-slate-400">
              Total de entradas computadas no mês
            </p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80" />
        </div>

        {/* Despesas */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Despesas
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-rose-600 font-mono tabular-nums">
              {formatBRL(totals.expense)}
            </span>
            <p className="mt-1.5 text-xs text-slate-400">
              Total de saídas registradas no mês
            </p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-rose-500 to-red-400 opacity-80" />
        </div>

        {/* Saldo do Mês */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Saldo do Mês
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold tracking-tight font-mono tabular-nums ${
                totals.net >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {totals.net > 0 ? "+" : ""}
              {formatBRL(totals.net)}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                totals.net >= 0
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-rose-50 text-rose-700 border border-rose-200/60"
              }`}
            >
              {totals.net >= 0 ? "Superávit" : "Déficit"}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Diferença líquida (Receitas - Despesas)
          </p>
          <div
            className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${
              totals.net >= 0
                ? "from-emerald-500 to-blue-500"
                : "from-rose-500 to-orange-400"
            } opacity-80`}
          />
        </div>
      </div>

      {/* Main Content: Category Breakdown + Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gastos por Categoria */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <PieChart className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    Gastos por Categoria
                  </h2>
                  <p className="text-xs text-slate-400">
                    Distribuição percentual das despesas no mês
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
                {formattedMonth}
              </span>
            </div>
            <div className="pt-4">
              <SpendChart data={byCategory} />
            </div>
          </div>
        </div>

        {/* Transações Recentes */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    Transações Recentes
                  </h2>
                  <p className="text-xs text-slate-400">
                    Últimas movimentações registradas
                  </p>
                </div>
              </div>
              <Link
                href="/transactions"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                Ver todas
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <ul role="list" className="divide-y divide-slate-100">
              {recentTxs.map((tx) => {
                const isIncome = tx.amount > 0;
                return (
                  <li
                    key={tx.id}
                    className="p-4 sm:px-6 hover:bg-slate-50/70 transition flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-lg border border-slate-200/60 shadow-xs">
                        {tx.category?.icon ?? "📦"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {tx.account?.name && (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                              {tx.account.name}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {new Date(tx.date).toLocaleDateString("pt-BR", {
                              timeZone: "America/Sao_Paulo",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-bold font-mono tabular-nums ${
                          isIncome ? "text-emerald-600" : "text-slate-900"
                        }`}
                      >
                        {isIncome ? "+" : ""}
                        {formatBRL(tx.amount)}
                      </p>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {tx.category?.name ?? "Sem categoria"}
                      </p>
                    </div>
                  </li>
                );
              })}

              {recentTxs.length === 0 && (
                <li className="py-12 px-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    Nenhuma transação encontrada
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Importe seu primeiro extrato para ver as movimentações aqui.
                  </p>
                  <div className="mt-4">
                    <Link
                      href="/import"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      Importar Agora
                    </Link>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

