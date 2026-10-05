# Minhas Finanças

Uma plataforma moderna, open-source e 100% gratuita para controle financeiro pessoal, com suporte a **Importação de Extratos Bancários (OFX e CSV)** de qualquer banco.

---

## ✨ Funcionalidades

- **📥 Importação de Extratos (OFX e CSV)**:
  - Exporte o extrato do seu banco (**Banco Inter, PicPay, Nubank, Itaú, Bradesco, Santander**, etc.) e importe com 1 clique.
  - **Prevenção inteligente de duplicadas**: o sistema identifica transações já importadas e ignora repetições automaticamente.
  - Pré-visualização completa antes de salvar, com opção de selecionar transações individualmente.
- **🏦 Gerenciamento de Contas e Cartões**:
  - Crie contas bancárias personalizadas (Conta Corrente, Poupança, Cartão de Crédito).
  - Cálculo e atualização automática de saldos conforme você importa movimentações.
- **🏷️ Categorização Automática Inteligente**:
  - Regras embutidas que identificam gastos conhecidos (iFood, Uber, Supermercados, Netflix, farmácias, salários, etc.).
  - Classificação manual com bloqueio para evitar sobrescrita involuntária.
- **🎯 Orçamentos Mensais**:
  - Defina limites de gastos por categoria ou orçamento geral do mês.
  - Acompanhamento visual da porcentagem gasta em relação ao teto estabelecido.
- **📊 Painel & Gráficos**:
  - Resumo de receitas, despesas e saldo líquido do mês.
  - Gráfico de pizza interativo com a divisão de gastos por categoria.
  - Lista de transações recentes.

---

## 🛠️ Como Importar seus Extratos (100% Gratuito)

Você não precisa de planos pagos nem APIs de terceiros para gerenciar suas contas:

1. Acesse o aplicativo ou internet banking do seu banco (ex: Inter, PicPay, Nubank).
2. Vá em **Extrato** e clique em **Exportar** (escolha formato **OFX** ou **CSV**).
3. No sistema, clique em **"Importar Extrato"** no menu lateral.
4. Selecione ou cadastre sua conta de destino e arraste o arquivo.
5. Confira a prévia e clique em **Confirmar Importação**.

---

## 💻 Rodando Localmente

### Pré-requisitos
- Node.js 18+ ou 20+
- pnpm (recomendado) ou npm
- Banco de dados PostgreSQL (local via Docker ou nuvem gratuita como Neon, Supabase ou Vercel Postgres)

### 1. Instale as dependências:
```bash
pnpm install
```

### 2. Configure as variáveis de ambiente:
Crie um arquivo `.env` na raiz do projeto:

```env
# Conexão com o banco de dados PostgreSQL
DATABASE_URL="postgres://usuario:senha@localhost:5432/finance"

# Senha de proteção para login no painel
APP_PASSWORD="sua-senha-de-acesso"

# Chave secreta de sessão (mínimo 16 caracteres)
SESSION_SECRET="sua-chave-secreta-longa-e-segura"
```

### 3. Sincronize o esquema com o banco de dados:
```bash
pnpm db:push
```

### 4. Inicie o servidor de desenvolvimento:
```bash
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## 🚀 Como fazer o deploy grátis na Vercel

1. **Crie uma conta na [Vercel](https://vercel.com/)** e conecte seu GitHub.
2. Faça um fork ou push deste repositório para o seu GitHub.
3. Na Vercel, crie um novo projeto importando o seu repositório.
4. **Banco de Dados Gratuito**:
   - Vá na aba **Storage** da Vercel e adicione um banco **Postgres** (ou utilize um banco gratuito no [Neon](https://neon.tech) / [Supabase](https://supabase.com)).
   - Conecte ao projeto para preencher automaticamente a variável `DATABASE_URL`.
5. **Configuração de Variáveis de Ambiente**:
   - `APP_PASSWORD`: Sua senha de acesso ao sistema.
   - `SESSION_SECRET`: Uma string aleatória com mais de 16 caracteres.
6. **Migração do Banco**:
   - Execute `pnpm db:push` apontando para o `DATABASE_URL` de produção.
7. Acesse a URL gerada e comece a controlar suas finanças!

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack, Server Actions)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
- **ORM & Banco**: [Drizzle ORM](https://orm.drizzle.team/) + [PostgreSQL](https://www.postgresql.org/)
- **Gráficos**: [Recharts](https://recharts.org/)
- **Ícones**: [Lucide Icons](https://lucide.dev/)
- **Processamento de Extratos**: Parsers nativos para OFX (SGML/XML) e CSV
