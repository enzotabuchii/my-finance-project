/** Utilitários de formatação e datas. Fuso fixo de Brasília (UTC-3, sem horário de verão desde 2019). */
export const TZ = "America/Sao_Paulo";
const OFFSET = "-03:00";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBRL = (v: number) => brl.format(v);

export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" }) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, ...opts }).format(new Date(d));
}

/** YYYY-MM-DD no fuso de Brasília. */
export function localDay(d: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(d),
  );
}

/** YYYY-MM do mês corrente (ou da data informada) no fuso de Brasília. */
export function currentMonth(d: Date = new Date()): string {
  return localDay(d).slice(0, 7);
}

export function isValidMonth(m: string | undefined | null): m is string {
  return !!m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Intervalo [início, fim) do mês em instantes UTC. */
export function monthRange(month: string): { start: Date; end: Date } {
  return {
    start: new Date(`${month}-01T00:00:00${OFFSET}`),
    end: new Date(`${shiftMonth(month, 1)}-01T00:00:00${OFFSET}`),
  };
}

export function monthLabel(month: string, style: "long" | "short" = "long") {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: style, year: style === "long" ? "numeric" : "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
}

/** Minúsculas, sem acentos e espaços normalizados — usado para casar regras. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
