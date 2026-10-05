import { db, schema } from "@/db";
import { formatBRL, currentMonth } from "@/lib/format";
import { budgetStatus } from "@/lib/stats";
import { revalidatePath } from "next/cache";

export async function addBudgetAction(formData: FormData) {
  "use server";
  const categoryId = formData.get("categoryId") as string;
  const amountStr = formData.get("amount") as string;
  const amount = parseFloat(amountStr.replace(",", "."));
  
  if (isNaN(amount) || amount <= 0) return;
  
  await db.insert(schema.budgets).values({
    categoryId: categoryId ? parseInt(categoryId, 10) : null,
    amount
  });
  
  revalidatePath("/budgets");
  revalidatePath("/");
}

export async function deleteBudgetAction(budgetId: number) {
  "use server";
  await db.delete(schema.budgets).where(schema.budgets.id.equals(budgetId));
  revalidatePath("/budgets");
  revalidatePath("/");
}

export default async function BudgetsPage() {
  const month = currentMonth();
  const budgets = await budgetStatus(month);
  const categories = await db.query.categories.findMany();

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Orçamentos</h1>
          <p className="mt-2 text-sm text-gray-700">
            Acompanhe o limite de gastos por categoria para o mês atual ({month}).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-4">
        {budgets.map((b) => {
          const isOver = b.pct >= 100;
          return (
            <div key={b.id} className="overflow-hidden rounded-lg bg-white shadow flex flex-col">
              <div className="px-4 py-5 sm:p-6 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{b.icon}</span>
                    <h3 className="text-lg font-medium text-gray-900">{b.name}</h3>
                  </div>
                  <form action={async () => {
                    "use server";
                    await deleteBudgetAction(b.id);
                  }}>
                    <button type="submit" className="text-red-500 hover:text-red-700 text-sm">Remover</button>
                  </form>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Gasto: {formatBRL(b.spent)}</span>
                    <span className="text-gray-900 font-medium">{formatBRL(b.limit)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${isOver ? "bg-red-600" : "bg-blue-600"}`} 
                      style={{ width: `${Math.min(b.pct, 100)}%` }}
                    ></div>
                  </div>
                  <p className={`mt-2 text-sm ${isOver ? "text-red-600 font-medium" : "text-gray-500"}`}>
                    {b.pct.toFixed(1)}% do limite
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white shadow sm:rounded-lg mt-8 max-w-xl">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Adicionar Orçamento</h3>
          <form action={addBudgetAction} className="mt-5 sm:flex sm:items-center gap-4">
            <div className="w-full sm:max-w-xs mb-4 sm:mb-0">
              <label htmlFor="categoryId" className="sr-only">Categoria</label>
              <select
                id="categoryId"
                name="categoryId"
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
              >
                <option value="">Geral (Todos os gastos)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:max-w-xs mb-4 sm:mb-0 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="number"
                name="amount"
                id="amount"
                step="0.01"
                required
                className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="0.00"
              />
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:w-auto"
            >
              Adicionar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
