"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Lock, Loader2, ArrowRight } from "lucide-react";

export function LoginForm({ nextUrl }: { nextUrl?: string }) {
  const [state, action, isPending] = useActionState(loginAction, null);

  return (
    <form className="mt-7 space-y-4" action={action}>
      <input type="hidden" name="next" value={nextUrl ?? "/"} />

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-semibold text-slate-700 mb-1.5"
        >
          Senha de Acesso
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Lock className="h-4 w-4" />
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
            placeholder="••••••••••••"
          />
        </div>
      </div>

      {state?.error && (
        <div className="text-xs font-medium text-rose-700 bg-rose-50/80 p-3 rounded-xl border border-rose-200">
          {state.error}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-150"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Entrando...</span>
            </>
          ) : (
            <>
              <span>Entrar no Painel</span>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

