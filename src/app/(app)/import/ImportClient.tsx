"use client";

import { useState, useTransition, ChangeEvent, DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileCheck2,
  AlertCircle,
  Plus,
  CheckCircle2,
  ArrowRight,
  Filter,
  Check,
  Building2,
  CreditCard,
  Wallet,
} from "lucide-react";
import {
  AccountOption,
  PreviewResult,
  createAccountAction,
  previewStatementAction,
  importTransactionsAction,
} from "@/app/actions/import";
import { formatBRL } from "@/lib/format";

interface Props {
  initialAccounts: AccountOption[];
}

export function ImportClient({ initialAccounts }: Props) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountOption[]>(initialAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    initialAccounts[0]?.id || ""
  );

  // Modal / Form para nova conta
  const [showNewAccountModal, setShowNewAccountModal] = useState(
    initialAccounts.length === 0
  );
  const [newAccName, setNewAccName] = useState("");
  const [newAccInstitution, setNewAccInstitution] = useState("");
  const [newAccType, setNewAccType] = useState<"BANK" | "CREDIT">("BANK");
  const [newAccBalance, setNewAccBalance] = useState("0");
  const [isCreatingAccount, startCreatingAccount] = useTransition();

  // Upload & Preview
  const [fileName, setFileName] = useState<string>("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [isLoading, startLoading] = useTransition();
  const [isImporting, startImporting] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ count: number; message: string } | null>(
    null
  );

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    startCreatingAccount(async () => {
      try {
        const formData = new FormData();
        formData.set("name", newAccName.trim());
        formData.set("institution", newAccInstitution.trim() || newAccName.trim());
        formData.set("type", newAccType);
        formData.set("balance", newAccBalance.trim() || "0");

        const created = await createAccountAction(formData);
        const newAcc: AccountOption = {
          id: created.id,
          name: created.name,
          institution: newAccInstitution.trim() || newAccName.trim(),
          type: newAccType,
          balance: parseFloat(newAccBalance.replace(",", ".")) || 0,
        };

        setAccounts((prev) => [...prev, newAcc]);
        setSelectedAccountId(created.id);
        setShowNewAccountModal(false);
        setNewAccName("");
        setNewAccInstitution("");
        setNewAccBalance("0");
      } catch (err: any) {
        setErrorMessage(err.message || "Erro ao criar conta.");
      }
    });
  };

  const processFile = (file: File) => {
    if (!selectedAccountId) {
      setErrorMessage("Por favor, selecione ou crie uma conta bancária antes de enviar o arquivo.");
      return;
    }

    setErrorMessage(null);
    setSuccessInfo(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) {
        setErrorMessage("Não foi possível ler o conteúdo do arquivo.");
        return;
      }

      startLoading(async () => {
        try {
          const res = await previewStatementAction(selectedAccountId, content, file.name);
          setPreview(res);

          // Seleciona automaticamente apenas as que NÃO são duplicadas
          const newIds = new Set(
            res.transactions.filter((tx) => !tx.isDuplicate).map((tx) => tx.id)
          );
          setSelectedTxIds(newIds);
        } catch (err: any) {
          setErrorMessage(err.message || "Falha ao processar o extrato.");
          setPreview(null);
        }
      });
    };

    reader.onerror = () => {
      setErrorMessage("Erro ao ler o arquivo selecionado.");
    };

    // Lê como texto
    reader.readAsText(file, "ISO-8859-1");
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const toggleSelectAllNew = () => {
    if (!preview) return;
    const newTxIds = preview.transactions.filter((t) => !t.isDuplicate).map((t) => t.id);
    const allSelected = newTxIds.every((id) => selectedTxIds.has(id));

    if (allSelected) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(newTxIds));
    }
  };

  const toggleSelectTx = (id: string) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmImport = () => {
    if (!preview || selectedTxIds.size === 0) return;

    startImporting(async () => {
      try {
        const txsToImport = preview.transactions
          .filter((tx) => selectedTxIds.has(tx.id))
          .map((tx) => ({
            id: tx.id,
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            categoryId: tx.categoryId,
          }));

        const res = await importTransactionsAction({
          accountId: preview.accountId,
          transactions: txsToImport,
        });

        setSuccessInfo(res);
        setPreview(null);
        setFileName("");
      } catch (err: any) {
        setErrorMessage(err.message || "Erro ao salvar transações.");
      }
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Importar Extrato Bancário
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Faça o upload de extratos nos formatos <strong className="text-slate-700">.OFX</strong> ou <strong className="text-slate-700">.CSV</strong> do Banco Inter, PicPay, Nubank, Itaú, Bradesco ou qualquer banco.
        </p>
      </div>

      {/* Erros e Sucessos */}
      {errorMessage && (
        <div className="rounded-2xl bg-rose-50/80 p-4 border border-rose-200 flex items-start gap-3 text-rose-800">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{errorMessage}</div>
        </div>
      )}

      {successInfo && (
        <div className="rounded-2xl bg-emerald-50/80 p-6 border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-900">
                {successInfo.message}
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Todas as novas transações já foram categorizadas e computadas no seu painel.
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <Link
              href="/transactions"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition"
            >
              <span>Ver Transações</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={() => setSuccessInfo(null)}
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs border border-slate-200 hover:bg-slate-50 transition"
            >
              Importar Outro Arquivo
            </button>
          </div>
        </div>
      )}

      {/* 1. Seleção / Criação de Conta */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-900">
              Conta de Destino
            </label>
            <p className="text-xs text-slate-400 mt-0.5">
              Selecione em qual conta as transações desse extrato serão registradas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {accounts.length > 0 && (
              <select
                value={selectedAccountId}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                  setPreview(null);
                }}
                className="block w-full sm:w-72 rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-3 pr-8 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-2xs cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution || acc.name}) - {formatBRL(acc.balance)}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setShowNewAccountModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nova Conta</span>
            </button>
          </div>
        </div>

        {/* Modal / Card para criar conta rápida */}
        {showNewAccountModal && (
          <form
            onSubmit={handleCreateAccount}
            className="mt-6 border-t border-slate-100 pt-5 bg-slate-50/60 -mx-6 -mb-6 p-6 rounded-b-2xl"
          >
            <h4 className="text-xs font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Building2 className="h-4 w-4 text-blue-600" />
              Cadastrar Nova Conta Bancária
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Conta (ex: Inter)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Banco Inter"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instituição (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Inter, PicPay, etc."
                  value={newAccInstitution}
                  onChange={(e) => setNewAccInstitution(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo</label>
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as any)}
                  className="block w-full rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                >
                  <option value="BANK">Conta Corrente / Poupança</option>
                  <option value="CREDIT">Cartão de Crédito</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Saldo Inicial (R$)
                </label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              {accounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowNewAccountModal(false)}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isCreatingAccount}
                className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-50 transition"
              >
                {isCreatingAccount ? "Salvando..." : "Salvar Conta"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. Área de Upload (Drag and Drop) */}
      {!preview && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="relative block w-full rounded-2xl border-2 border-dashed border-slate-300/80 p-12 text-center hover:border-blue-500 hover:bg-blue-50/20 focus:outline-none transition-all duration-200 cursor-pointer bg-white shadow-xs group"
        >
          <input
            type="file"
            accept=".ofx,.csv,.txt"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isLoading || accounts.length === 0}
          />
          <div className="flex flex-col items-center">
            <div className="rounded-2xl bg-blue-50 p-4 text-blue-600 mb-4 group-hover:scale-105 group-hover:bg-blue-100 transition duration-200">
              <UploadCloud className="h-8 w-8" />
            </div>
            <span className="text-base font-bold text-slate-900">
              {isLoading ? "Processando arquivo..." : "Clique ou arraste seu arquivo de extrato aqui"}
            </span>
            <p className="mt-1 text-xs text-slate-500">
              Suporta arquivos <strong className="text-slate-700">.OFX</strong> (padrão bancário) e <strong className="text-slate-700">.CSV</strong>
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs">
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">Banco Inter</span>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">PicPay</span>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">Nubank</span>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">Itaú</span>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">Bradesco</span>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">Santander</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Pré-visualização das Transações */}
      {preview && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">{fileName}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Conta de destino: <strong className="text-slate-800">{preview.accountName}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Total: {preview.totalParsed}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                  ✨ Novas: {preview.newCount}
                </span>
                {preview.duplicateCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200/60">
                    ⚠️ Duplicadas ignoradas: {preview.duplicateCount}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={toggleSelectAllNew}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 text-left transition"
              >
                Alternar seleção de todas as novas ({selectedTxIds.size} selecionadas)
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setFileName("");
                  }}
                  className="rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting || selectedTxIds.size === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-50 transition"
                >
                  {isImporting ? (
                    "Importando..."
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Importar ({selectedTxIds.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Tabela de Transações */}
          <div className="overflow-x-auto max-h-[500px]">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200/70">
                <tr>
                  <th scope="col" className="px-4 py-3 w-10">
                    <span className="sr-only">Selecionar</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Data
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Descrição
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Categoria Sugerida
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 text-right">
                    Valor
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {preview.transactions.map((tx) => {
                  const isSelected = selectedTxIds.has(tx.id);
                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/70 transition ${
                        tx.isDuplicate ? "opacity-60 bg-slate-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTx(tx.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 font-medium">
                        {new Date(tx.date).toLocaleDateString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                        {tx.description}
                      </td>
                      <td className="px-4 py-3">
                        {tx.categoryName ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${tx.categoryColor || "#64748b"}15`,
                              color: tx.categoryColor || "#475569",
                            }}
                          >
                            <span>{tx.categoryIcon || "📦"}</span>
                            <span>{tx.categoryName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Sem categoria</span>
                        )}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-bold font-mono tabular-nums text-sm ${
                          tx.amount >= 0 ? "text-emerald-600" : "text-slate-900"
                        }`}
                      >
                        {formatBRL(tx.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        {tx.isDuplicate ? (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            Já importada
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Nova
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
