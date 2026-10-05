import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/** Conexões do Pluggy (um "item" = uma instituição conectada, ex: Inter, PicPay). */
export const items = pgTable("items", {
  id: text("id").primaryKey(),
  institution: text("institution"),
  status: text("status"),
  error: text("error"),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  itemId: text("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  institution: text("institution"),
  name: text("name").notNull(),
  type: text("type").notNull(), // BANK | CREDIT
  subtype: text("subtype"),
  number: text("number"),
  balance: numeric("balance", { precision: 14, scale: 2, mode: "number" }).notNull().default(0),
  creditLimit: numeric("credit_limit", { precision: 14, scale: 2, mode: "number" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * kind:
 *  - expense: gasto
 *  - income: receita
 *  - transfer: movimentação entre contas próprias / pagamento de fatura (ignorado nos totais)
 */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull().default("📦"),
  color: text("color").notNull().default("#64748b"),
  kind: text("kind").notNull().default("expense"),
});

/** Regras de categorização: se a descrição contém `pattern`, aplica a categoria. */
export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  pattern: text("pattern").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    date: timestamp("date", { withTimezone: true }).notNull(),
    description: text("description").notNull(),
    /** Valor com sinal: negativo = saiu dinheiro, positivo = entrou. */
    amount: numeric("amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
    status: text("status"),
    pluggyCategory: text("pluggy_category"),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    /** true quando o usuário escolheu a categoria manualmente (regras não sobrescrevem). */
    categoryLocked: boolean("category_locked").notNull().default(false),
    calendarNotifiedAt: timestamp("calendar_notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("transactions_date_idx").on(t.date), index("transactions_account_idx").on(t.accountId)],
);

/** Orçamento mensal por categoria. categoryId null = orçamento geral (todos os gastos). */
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Registro de alertas já disparados (evita alertas repetidos no mesmo mês). */
export const budgetAlerts = pgTable(
  "budget_alerts",
  {
    id: serial("id").primaryKey(),
    budgetId: integer("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    month: text("month").notNull(), // YYYY-MM
    threshold: integer("threshold").notNull(), // 80 | 100
    spent: numeric("spent", { precision: 14, scale: 2, mode: "number" }).notNull(),
    limit: numeric("limit", { precision: 14, scale: 2, mode: "number" }).notNull(),
    dismissed: boolean("dismissed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("budget_alerts_unique").on(t.budgetId, t.month, t.threshold)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const syncRuns = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  trigger: text("trigger").notNull(), // manual | cron | webhook
  status: text("status").notNull(), // running | ok | error
  message: text("message"),
  newTransactions: integer("new_transactions").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Rule = typeof rules.$inferSelect;

import { relations } from "drizzle-orm";

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  item: one(items, {
    fields: [accounts.itemId],
    references: [items.id],
  }),
  transactions: many(transactions),
}));

export const itemsRelations = relations(items, ({ many }) => ({
  accounts: many(accounts),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  rules: many(rules),
  budgets: many(budgets),
}));

export const rulesRelations = relations(rules, ({ one }) => ({
  category: one(categories, {
    fields: [rules.categoryId],
    references: [categories.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
  alerts: many(budgetAlerts),
}));
