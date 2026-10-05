import { db, schema } from "@/db";
import { PluggyConnectButton } from "./PluggyConnectButton";
import { removePluggyItemAction } from "@/app/actions/settings";
import { Trash2 } from "lucide-react";

export default async function SettingsPage() {
  const items = await db.query.items.findMany();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">Gerencie suas conexões bancárias e preferências.</p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold leading-6 text-gray-900">Conexões Bancárias (Open Finance)</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Conecte suas contas do Inter, PicPay ou outros bancos para sincronizar transações automaticamente.</p>
              </div>
            </div>
            <div className="mt-5 sm:ml-6 sm:mt-0 sm:flex sm:shrink-0 sm:items-center">
              <PluggyConnectButton />
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            {items.length > 0 ? (
              <ul role="list" className="divide-y divide-gray-100">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-x-6 py-4">
                    <div className="min-w-0">
                      <div className="flex items-start gap-x-3">
                        <p className="text-sm font-semibold leading-6 text-gray-900">{item.institution ?? "Instituição"}</p>
                        <p className={`rounded-md whitespace-nowrap mt-0.5 px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          item.status === "UPDATED" ? "bg-green-50 text-green-700 ring-green-600/20" : "bg-yellow-50 text-yellow-800 ring-yellow-600/20"
                        }`}>
                          {item.status}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                        <p>Última sincronização: {item.lastSyncedAt ? item.lastSyncedAt.toLocaleString("pt-BR") : "Nunca"}</p>
                        {item.error && (
                          <p className="text-red-600 truncate">Erro: {item.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-x-4">
                      <form action={async () => {
                        "use server";
                        await removePluggyItemAction(item.id);
                      }}>
                        <button type="submit" className="text-red-600 hover:text-red-500 p-2">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Nenhuma conexão adicionada ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
