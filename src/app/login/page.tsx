import { LoginForm } from "./form";
import { Wallet, ShieldCheck } from "lucide-react";

export default async function LoginPage(props: { searchParams: Promise<{ next?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/80 px-4 py-12 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-md">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
              <Wallet className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
              Minhas Finanças
            </h2>
            <p className="mt-1.5 text-xs text-slate-500">
              Digite sua chave de acesso para gerenciar suas contas e transações.
            </p>
          </div>

          <LoginForm nextUrl={searchParams.next} />

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Dados criptografados e armazenados com segurança</span>
          </div>
        </div>
      </div>
    </div>
  );
}

