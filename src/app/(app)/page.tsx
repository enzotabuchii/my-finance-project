import { currentMonth, formatBRL } from "@/lib/format";
import { monthTotals, spendingByCategory } from "@/lib/stats";
import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { SyncButton } from "./SyncButton";
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
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Visão Geral</h1>
        <SyncButton />
      </div>

      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Receitas</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-green-600">
            {formatBRL(totals.income)}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Despesas</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-red-600">
            {formatBRL(totals.expense)}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Saldo do Mês</dt>
          <dd className={`mt-1 text-3xl font-semibold tracking-tight ${totals.net >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatBRL(totals.net)}
          </dd>
        </div>
      </dl>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Gastos por Categoria</h2>
          <SpendChart data={byCategory} />
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Transações Recentes</h2>
            <a href="/transactions" className="text-sm text-blue-600 hover:text-blue-500">Ver todas</a>
          </div>
          <ul role="list" className="divide-y divide-gray-200">
            {recentTxs.map((tx) => (
              <li key={tx.id} className="p-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" title={tx.category?.name ?? "Sem categoria"}>
                      {tx.category?.icon ?? "❔"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                      <p className="text-sm text-gray-500">{tx.account?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.amount > 0 ? "text-green-600" : "text-gray-900"}`}>
                      {tx.amount > 0 ? "+" : ""}{formatBRL(tx.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </p>
                  </div>
                </div>
              </li>
            ))}
            {recentTxs.length === 0 && (
              <li className="p-6 text-center text-sm text-gray-500">Nenhuma transação encontrada.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
