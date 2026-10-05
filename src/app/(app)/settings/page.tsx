import { db, schema } from "@/db";
import { deleteAccountAction, reapplyCategorizationAction } from "@/app/actions/settings";
import { formatBRL } from "@/lib/format";
import { Trash2, Building2, CreditCard, Sparkles, Plus, Wallet, Shield } from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
  const accounts = await db.query.accounts.findMany();

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie suas contas bancárias, cartões vinculados e preferências do sistema.
        </p>
      </div>

      {/* Seção 1: Contas Bancárias */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Contas e Carteiras Cadastradas
                </h3>
                <p className="text-xs text-slate-400">
                  Instituições e cartões vinculados às suas transações
                </p>
              </div>
            </div>

            <div>
              <Link
                href="/import"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Conta / Importar</span>
              </Link>
            </div>
          </div>

          <div className="mt-4">
            {accounts.length > 0 ? (
              <ul role="list" className="divide-y divide-slate-100">
                {accounts.map((acc) => (
                  <li
                    key={acc.id}
                    className="flex items-center justify-between gap-x-4 py-4 px-3 rounded-xl hover:bg-slate-50/70 transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          acc.type === "CREDIT"
                            ? "bg-purple-50 text-purple-600 border-purple-100"
                            : "bg-blue-50 text-blue-600 border-blue-100"
                        }`}
                      >
                        {acc.type === "CREDIT" ? (
                          <CreditCard className="h-5 w-5" />
                        ) : (
                          <Building2 className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {acc.name}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              acc.type === "CREDIT"
                                ? "bg-purple-50 text-purple-700 border border-purple-200/60"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {acc.type === "CREDIT" ? "Cartão de Crédito" : "Conta Corrente"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-x-3 text-xs text-slate-400">
                          {acc.institution && (
                            <span>
                              Instituição: <strong className="text-slate-600">{acc.institution}</strong>
                            </span>
                          )}
                          <span>
                            Saldo:{" "}
                            <strong className="text-slate-800 font-mono">
                              {formatBRL(Number(acc.balance))}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <form
                        action={async () => {
                          "use server";
                          await deleteAccountAction(acc.id);
                        }}
                      >
                        <button
                          type="submit"
                          title="Excluir conta"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10 px-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                  <Wallet className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Nenhuma conta cadastrada ainda
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Cadastre sua primeira conta ao importar um extrato bancário.
                </p>
                <div className="mt-4">
                  <Link
                    href="/import"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <span>Importar primeiro extrato</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seção 2: Categorização Automática */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Regras de Categorização Inteligente
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-lg">
                Reaplique as regras automáticas de inteligência em todas as transações que ainda não foram travadas manualmente por você.
              </p>
            </div>
          </div>

          <div className="sm:shrink-0">
            <form
              action={async () => {
                "use server";
                await reapplyCategorizationAction();
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Reaplicar Regras</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

