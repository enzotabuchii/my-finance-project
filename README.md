# Minhas Finanças (Open Finance)

Uma plataforma open-source e 100% gratuita para controle financeiro pessoal, integrada com Open Finance através da [Pluggy](https://pluggy.ai).

## 🚀 Como fazer o deploy grátis na Vercel

1. **Crie uma conta na [Vercel](https://vercel.com/)** e faça login com seu GitHub.
2. Faça um fork ou push deste repositório para o seu GitHub.
3. Na Vercel, crie um novo projeto importando o seu repositório.
4. **Banco de dados gratuito**: 
   - Vá na aba "Storage" da Vercel.
   - Crie um banco **Postgres** (Vercel Postgres - gratuito).
   - Vincule-o ao seu projeto. A Vercel vai preencher automaticamente o `DATABASE_URL` nas suas variáveis de ambiente.
5. **Chaves da Pluggy**:
   - Crie uma conta de desenvolvedor no [Meu Pluggy (Uso Pessoal)](https://dashboard.pluggy.ai). É 100% gratuito para uso próprio.
   - Gere o `Client ID` e `Client Secret`.
6. Configure as seguintes **Environment Variables** (Variáveis de Ambiente) na Vercel:
   - `PLUGGY_CLIENT_ID`: (seu client id)
   - `PLUGGY_CLIENT_SECRET`: (seu client secret)
   - `SESSION_SECRET`: Uma senha/texto longo e aleatório (ex: `minha_senha_super_secreta_finance_123`)
   - `APP_PASSWORD`: A senha que você usará para acessar o sistema.
7. Após o deploy, vá no terminal da Vercel (ou rode localmente com o `DATABASE_URL` de produção) e execute o comando:
   `npm run db:push`
   Isso vai criar as tabelas no seu banco de dados Postgres recém-criado.
8. **Pronto!** Acesse a URL do seu projeto, entre com a senha que configurou em `APP_PASSWORD`, vá em **Configurações** e conecte seus bancos (Inter, PicPay, etc.).

## Funcionalidades

- **Automação via Open Finance**: Conecte seus bancos com segurança sem digitar senhas no app.
- **Categorização Automática**: Regras embutidas que identificam gastos (ex: iFood, Uber).
- **Orçamentos**: Defina limites mensais para cada categoria de gasto.
- **Gráficos e Saldo**: Acompanhe entradas, saídas e a evolução por categoria.

## Rodando localmente (Dev)

Crie um arquivo `.env` na raiz:

```env
DATABASE_URL="postgres://user:pass@localhost:5432/finance"
PLUGGY_CLIENT_ID="seu-id"
PLUGGY_CLIENT_SECRET="sua-secret"
SESSION_SECRET="sua-senha-super-secreta-com-mais-de-16-chars"
APP_PASSWORD="sua-senha-de-acesso"
```

1. `npm install`
2. `npm run db:push`
3. `npm run dev`
