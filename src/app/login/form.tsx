"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm({ nextUrl }: { nextUrl?: string }) {
  const [state, action, isPending] = useActionState(loginAction, null);

  return (
    <form className="mt-8 space-y-6" action={action}>
      <input type="hidden" name="next" value={nextUrl ?? "/"} />
      <div className="-space-y-px rounded-md shadow-sm">
        <div>
          <label htmlFor="password" className="sr-only">
            Senha de Acesso
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            placeholder="Senha de Acesso"
          />
        </div>
      </div>

      {state?.error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {state.error}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </form>
  );
}
