import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { formatBRL } from "@/lib/format";
import { CategorySelect } from "./CategorySelect";
import { ensureSeeded } from "@/lib/categorize";

export default async function TransactionsPage() {
  await ensureSeeded();
  const txs = await db.query.transactions.findMany({
    orderBy: [desc(schema.transactions.date)],
    with: {
      account: true,
      category: true,
    }
  });

  const categories = await db.query.categories.findMany();

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Transações</h1>
          <p className="mt-2 text-sm text-gray-700">
            Lista de todas as transações sincronizadas de todas as suas contas.
          </p>
        </div>
      </div>
      
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Data
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Descrição
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Conta
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Valor
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Categoria
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {txs.map((tx) => (
                    <tr key={tx.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
                        {new Date(tx.date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {tx.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {tx.account?.name}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-4 text-sm font-medium ${tx.amount > 0 ? "text-green-600" : "text-gray-900"}`}>
                        {tx.amount > 0 ? "+" : ""}{formatBRL(tx.amount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 w-48">
                        <CategorySelect 
                          transactionId={tx.id} 
                          currentCategoryId={tx.categoryId} 
                          categories={categories} 
                        />
                      </td>
                    </tr>
                  ))}
                  {txs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                        Nenhuma transação encontrada. Conecte um banco em Configurações.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
