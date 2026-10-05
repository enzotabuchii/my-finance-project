import { asc, desc, eq, and } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Category, Rule } from "@/db/schema";
import { normalize } from "./format";

type Kind = "expense" | "income" | "transfer";
interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  kind: Kind;
  /** Palavras-chave na descrição (viram regras editáveis). */
  patterns: string[];
  /** Palavras-chave na categoria devolvida pelo Pluggy (fallback). */
  pluggy: string[];
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Alimentação", icon: "🍔", color: "#f97316", kind: "expense", patterns: ["ifood", "rappi", "restaurante", "lanchonete", "padaria", "burger", "mcdonald", "bk ", "pizza", "starbucks", "cafe"], pluggy: ["eating out", "food delivery", "restaurant", "food"] },
  { name: "Mercado", icon: "🛒", color: "#22c55e", kind: "expense", patterns: ["supermercado", "mercado", "carrefour", "assai", "atacadao", "pao de acucar", "extra ", "dia ", "hortifruti", "sams club"], pluggy: ["groceries", "supermarket"] },
  { name: "Transporte", icon: "🚗", color: "#3b82f6", kind: "expense", patterns: ["uber", "99app", "99 ", "cabify", "posto", "shell", "ipiranga", "petrobras", "estacionamento", "sem parar", "conectcar", "metro", "bilhete unico", "veloe"], pluggy: ["taxi", "ride", "gas station", "fuel", "transport", "parking", "toll", "vehicle"] },
  { name: "Moradia", icon: "🏠", color: "#a855f7", kind: "expense", patterns: ["aluguel", "condominio", "enel", "cemig", "light ", "sabesp", "copasa", "comgas", "iptu"], pluggy: ["rent", "housing", "electricity", "water", "gas", "utilities"] },
  { name: "Contas & Assinaturas", icon: "📺", color: "#ec4899", kind: "expense", patterns: ["netflix", "spotify", "amazon prime", "disney", "hbo", "max.com", "youtube", "apple.com", "google one", "icloud", "claro", "vivo", "tim ", "oi ", "chatgpt", "openai"], pluggy: ["streaming", "subscription", "telecommunication", "internet", "mobile", "digital services"] },
  { name: "Saúde", icon: "💊", color: "#ef4444", kind: "expense", patterns: ["drogasil", "droga raia", "drogaria", "farmacia", "pague menos", "unimed", "hospital", "clinica", "laboratorio", "smart fit", "academia"], pluggy: ["pharmacy", "health", "hospital", "dentist", "gym", "wellness"] },
  { name: "Compras", icon: "🛍️", color: "#eab308", kind: "expense", patterns: ["mercadolivre", "mercado livre", "amazon", "shopee", "aliexpress", "magalu", "magazine luiza", "americanas", "shein", "renner", "c&a", "riachuelo", "kabum"], pluggy: ["shopping", "online shopping", "clothing", "electronics"] },
  { name: "Lazer", icon: "🎉", color: "#14b8a6", kind: "expense", patterns: ["cinema", "ingresso", "sympla", "steam", "playstation", "xbox", "nintendo", "bar ", "show"], pluggy: ["leisure", "entertainment", "games", "tickets", "bars"] },
  { name: "Educação", icon: "📚", color: "#6366f1", kind: "expense", patterns: ["udemy", "alura", "curso", "faculdade", "escola", "livraria"], pluggy: ["education", "school", "university", "books"] },
  { name: "Viagem", icon: "✈️", color: "#0ea5e9", kind: "expense", patterns: ["airbnb", "booking", "latam", "gol linhas", "azul linhas", "hotel", "decolar", "123milhas"], pluggy: ["travel", "airline", "hotel", "accommodation"] },
  { name: "Taxas & Impostos", icon: "🧾", color: "#78716c", kind: "expense", patterns: ["tarifa", "iof", "juros", "anuidade", "multa", "darf", "imposto"], pluggy: ["bank fees", "taxes", "interest", "fee"] },
  { name: "Salário", icon: "💰", color: "#16a34a", kind: "income", patterns: ["salario", "pagamento de salario", "folha", "proventos"], pluggy: ["salary", "payroll"] },
  { name: "Rendimentos", icon: "📈", color: "#059669", kind: "income", patterns: ["rendimento", "cashback", "dividendo"], pluggy: ["investment income", "interest earned", "dividends", "cashback"] },
  { name: "Investimentos", icon: "🏦", color: "#0d9488", kind: "transfer", patterns: ["aplicacao", "resgate", "cdb", "tesouro", "porquinho", "cofrinho", "meu porquinho"], pluggy: ["investments", "investment"] },
  { name: "Pagamento de fatura", icon: "💳", color: "#94a3b8", kind: "transfer", patterns: ["pagamento fatura", "pagamento de fatura", "pgto fatura", "fatura cartao", "pagamento recebido"], pluggy: ["credit card payment"] },
  { name: "Transferência entre contas", icon: "🔁", color: "#64748b", kind: "transfer", patterns: [], pluggy: ["same person transfer"] },
  { name: "Pix & Transferências", icon: "⚡", color: "#8b5cf6", kind: "expense", patterns: ["pix enviado", "transferencia enviada", "ted ", "doc "], pluggy: ["transfer"] },
  { name: "Outras receitas", icon: "➕", color: "#4ade80", kind: "income", patterns: ["pix recebido", "transferencia recebida"], pluggy: ["income"] },
  { name: "Outros", icon: "📦", color: "#64748b", kind: "expense", patterns: [], pluggy: [] },
];

/** Cria categorias e regras padrão se o banco estiver vazio. Idempotente. */
export async function ensureSeeded() {
  const existing = await db.select({ id: schema.categories.id }).from(schema.categories).limit(1);
  if (existing.length) return;
  for (const c of DEFAULT_CATEGORIES) {
    const [row] = await db
      .insert(schema.categories)
      .values({ name: c.name, icon: c.icon, color: c.color, kind: c.kind })
      .onConflictDoNothing()
      .returning();
    if (row && c.patterns.length) {
      await db.insert(schema.rules).values(c.patterns.map((pattern) => ({ pattern, categoryId: row.id, priority: 0 })));
    }
  }
}

export interface Categorizer {
  categorize(description: string, pluggyCategory: string | null, amount: number): number | null;
}

/** Carrega regras/categorias uma vez e devolve um categorizador síncrono. */
export async function loadCategorizer(): Promise<Categorizer> {
  const [cats, ruleRows] = await Promise.all([
    db.select().from(schema.categories).orderBy(asc(schema.categories.id)),
    db.select().from(schema.rules).orderBy(desc(schema.rules.priority), desc(schema.rules.id)),
  ]);
  return buildCategorizer(cats, ruleRows);
}

export function buildCategorizer(cats: Category[], ruleRows: Rule[]): Categorizer {
  const byName = new Map(cats.map((c) => [c.name, c]));
  const byId = new Map(cats.map((c) => [c.id, c]));
  const compiled = ruleRows.map((r) => ({ ...r, norm: normalize(r.pattern) })).filter((r) => r.norm);
  const pluggyMap = DEFAULT_CATEGORIES.flatMap((d) => d.pluggy.map((k) => ({ k, name: d.name })));
  const fallbackOut = byName.get("Outros")?.id ?? null;
  const fallbackIn = byName.get("Outras receitas")?.id ?? null;

  return {
    categorize(description, pluggyCategory, amount) {
      const desc = ` ${normalize(description)} `;
      for (const r of compiled) {
        if (!desc.includes(r.norm)) continue;
        const cat = byId.get(r.categoryId);
        // Não aplica categoria de receita a uma saída (e vice-versa), exceto transferências.
        if (cat && cat.kind !== "transfer" && (cat.kind === "income") !== amount > 0) continue;
        return r.categoryId;
      }
      if (pluggyCategory) {
        const pc = normalize(pluggyCategory);
        // Correspondência mais específica (chave mais longa) primeiro.
        const hit = pluggyMap
          .filter((m) => pc.includes(m.k))
          .sort((a, b) => b.k.length - a.k.length)
          .map((m) => byName.get(m.name))
          .find((c) => c && (c.kind === "transfer" || (c.kind === "income") === amount > 0));
        if (hit) return hit.id;
      }
      return amount > 0 ? fallbackIn : fallbackOut;
    },
  };
}

/** Reaplica regras em todas as transações não travadas manualmente. */
export async function reapplyRules(): Promise<number> {
  const categorizer = await loadCategorizer();
  const txs = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.categoryLocked, false));
  let changed = 0;
  for (const t of txs) {
    const cat = categorizer.categorize(t.description, t.pluggyCategory, t.amount);
    if (cat !== t.categoryId) {
      await db
        .update(schema.transactions)
        .set({ categoryId: cat })
        .where(and(eq(schema.transactions.id, t.id), eq(schema.transactions.categoryLocked, false)));
      changed++;
    }
  }
  return changed;
}
