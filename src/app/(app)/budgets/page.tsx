import { db, schema } from "@/db";
import { formatBRL, currentMonth } from "@/lib/format";
import { budgetStatus } from "@/lib/stats";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import {
  Trash2,
  Plus,
  PieChart,
  Calendar,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export async function addBudgetAction(formData: FormData) {
  "use server";
  const categoryId = formData.get("categoryId") as string;
  const amountStr = formData.get("amount") as string;
  const amount = parseFloat(amountStr.replace(",", "."));

  if (isNaN(amount) || amount <= 0) return;

  await db.insert(schema.budgets).values({
    categoryId: categoryId ? parseInt(categoryId, 10) : null,
    amount,
  });

  revalidatePath("/budgets");
  revalidatePath("/");
}

export async function deleteBudgetAction(budgetId: number) {
  "use server";
  await db.delete(schema.budgets).where(eq(schema.budgets.id, budgetId));
  revalidatePath("/budgets");
  revalidatePath("/");
}

export default async function BudgetsPage() {
  const month = currentMonth();
  const budgets = await budgetStatus(month);
  const categories = await db.query.categories.findMany();

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
            Orçamentos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe o limite e o percentual de gastos por categoria para o mês atual.
          </p>
        </div>
      </div>

      {/* Grid de Orçamentos */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {budgets.map((b) => {
          const isOver = b.pct >= 100;
          const isWarning = b.pct >= 80 && !isOver;
          const remaining = b.limit - b.spent;

          return (
            <div
              key={b.id}
              className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between p-5"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg border border-slate-200/50">
                      {b.icon}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{b.name}</h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold mt-0.5 ${
                          isOver
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : isWarning
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {isOver ? (
                          <>
                            <AlertCircle className="h-3 w-3" />
                            Excedido
                          </>
                        ) : isWarning ? (
                          <>
                            <AlertTriangle className="h-3 w-3" />
                            Atenção
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            No limite
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <form
                    action={async () => {
                      "use server";
                      await deleteBudgetAction(b.id);
                    }}
                  >
                    <button
                      type="submit"
                      title="Remover orçamento"
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>

                {/* Meter & Values */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-500 font-medium">
                      Gasto:{" "}
                      <strong className="text-slate-800 font-mono">
                        {formatBRL(b.spent)}
                      </strong>
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      Meta: {formatBRL(b.limit)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOver
                          ? "bg-rose-500"
                          : isWarning
                          ? "bg-amber-500"
                          : "bg-blue-600"
                      }`}
                      style={{ width: `${Math.min(b.pct, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span
                      className={`font-semibold font-mono ${
                        isOver
                          ? "text-rose-600"
                          : isWarning
                          ? "text-amber-600"
                          : "text-slate-600"
                      }`}
                    >
                      {b.pct.toFixed(1)}% utilizado
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isOver
                        ? `Excedeu ${formatBRL(Math.abs(remaining))}`
                        : `Restam ${formatBRL(remaining)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {budgets.length === 0 && (
          <div className="col-span-full rounded-2xl bg-white border border-dashed border-slate-200 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <PieChart className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Nenhum orçamento configurado ainda
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Defina limites de gastos para suas categorias abaixo para monitorar sua saúde financeira.
            </p>
          </div>
        )}
      </div>

      {/* Adicionar Orçamento Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs max-w-xl">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Plus className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Adicionar Orçamento
            </h3>
            <p className="text-xs text-slate-400">
              Defina um teto mensal para uma categoria específica ou geral
            </p>
          </div>
        </div>

        <form action={addBudgetAction} className="mt-5 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
          <div className="w-full sm:flex-1">
            <label htmlFor="categoryId" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Categoria
            </label>
            <select
              id="categoryId"
              name="categoryId"
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-medium text-slate-700 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
            >
              <option value="">Geral (Todos os gastos)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:flex-1">
            <label htmlFor="amount" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Limite Mensal
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-slate-400 text-xs font-medium">R$</span>
              </div>
              <input
                type="number"
                name="amount"
                id="amount"
                step="0.01"
                required
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-medium text-slate-800 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="sm:self-end">
            <button
              type="submit"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Adicionar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

