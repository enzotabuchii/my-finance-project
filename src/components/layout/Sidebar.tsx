"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Settings,
  LogOut,
  Menu,
  X,
  UploadCloud,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { logoutAction } from "@/app/actions/auth";

const navigation = [
  { name: "Painel", href: "/", icon: LayoutDashboard },
  { name: "Transações", href: "/transactions", icon: ArrowLeftRight },
  { name: "Importar Extrato", href: "/import", icon: UploadCloud },
  { name: "Orçamentos", href: "/budgets", icon: PieChart },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Topbar */}
      <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 shadow-xs backdrop-blur-md sm:px-6 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs shadow-blue-500/20">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900">
              Minhas Finanças
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Gestão Financeira
            </span>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition focus:outline-none"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-0 flex">
            <div className="relative mr-14 flex w-full max-w-xs flex-1">
              <div className="absolute right-0 top-0 -mr-12 pt-4">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/80 text-white hover:bg-slate-800 transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Fechar menu</span>
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="flex grow flex-col justify-between overflow-y-auto bg-white px-5 py-6 shadow-2xl">
                <div className="space-y-6">
                  {/* Brand */}
                  <div className="flex items-center gap-3 px-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900 leading-tight">
                        Minhas Finanças
                      </div>
                      <span className="text-xs text-slate-500">Painel Pessoal</span>
                    </div>
                  </div>

                  {/* Navigation */}
                  <nav className="flex flex-1 flex-col">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                      Menu
                    </div>
                    <ul role="list" className="space-y-1">
                      {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              className={cn(
                                isActive
                                  ? "bg-blue-50 text-blue-700 font-semibold"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium",
                                "group flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm transition"
                              )}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <item.icon
                                className={cn(
                                  isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600",
                                  "h-5 w-5 shrink-0 transition"
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                </div>

                {/* Footer */}
                <div className="pt-6 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/60 border border-emerald-100 text-emerald-700 text-xs font-medium">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Ambiente Seguro</span>
                  </div>
                  <button
                    onClick={() => logoutAction()}
                    className="group flex w-full items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition"
                  >
                    <LogOut
                      className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-rose-600 transition"
                      aria-hidden="true"
                    />
                    Sair da conta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col justify-between overflow-y-auto border-r border-slate-200/80 bg-white/95 px-5 py-6 backdrop-blur-md">
          <div className="space-y-7">
            {/* Brand */}
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-slate-900 leading-tight">
                  Minhas Finanças
                </span>
                <span className="text-xs font-medium text-slate-400">
                  Gestão Financeira
                </span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-1 flex-col">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2.5">
                Menu Principal
              </div>
              <ul role="list" className="space-y-1.5">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          isActive
                            ? "bg-blue-50/90 text-blue-700 font-semibold shadow-xs ring-1 ring-blue-500/10"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium",
                          "group relative flex items-center gap-x-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-150"
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-600" />
                        )}
                        <item.icon
                          className={cn(
                            isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600",
                            "h-5 w-5 shrink-0 transition"
                          )}
                          aria-hidden="true"
                        />
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Bottom Card & Logout */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-slate-50/80 p-3 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700 leading-tight">
                    Sistema Ativo
                  </span>
                  <span className="text-[11px] text-slate-400">Banco de dados conectado</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => logoutAction()}
              className="group flex w-full items-center gap-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition duration-150"
            >
              <LogOut
                className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-rose-600 transition"
                aria-hidden="true"
              />
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

