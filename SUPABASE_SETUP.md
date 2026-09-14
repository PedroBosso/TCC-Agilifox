# Configurando o Supabase (plano gratuito)

Este guia configura o backend do TCC-Agilifox usando **apenas o plano Free** do
Supabase — não é necessário cartão de crédito nem qualquer pagamento.

O schema completo (27 tabelas cobrindo todas as telas do app: perfis,
visitantes, encomendas, ocorrências, achados e perdidos, comunicados,
ambientes/reservas, assembleias, enquetes, financeiro, vagas/veículos, pets,
pânico e câmeras) está em [`supabase/migrations/`](supabase/migrations/), em
4 arquivos numerados que devem ser executados **nessa ordem**.

## 1. Criar a conta e o projeto

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
   (pode entrar com GitHub).
2. Clique em **New Project**.
3. Preencha:
   - **Name**: `tcc-agilifox` (ou o nome que preferir)
   - **Database Password**: gere uma senha forte e **salve em local seguro**
     (você vai precisar dela só se for usar a CLI/conexão direta ao Postgres —
     não é a mesma coisa que a chave da API).
   - **Region**: escolha a mais próxima de você (ex.: `South America (São Paulo)`).
   - **Pricing Plan**: deixe em **Free** (já vem selecionado por padrão).
4. Clique em **Create new project** e aguarde 1–2 minutos enquanto o
   Supabase provisiona o banco.

> **Plano gratuito — o que você ganha e os limites:**
> - 500 MB de banco de dados, 1 GB de armazenamento de arquivos (Storage), 5 GB de tráfego/mês
> - Até 50.000 usuários autenticados/mês
> - 2 projetos gratuitos ativos por organização
> - **Projetos pausam automaticamente após ~1 semana sem uso** — se isso
>   acontecer, basta abrir o projeto no painel e clicar em "Restore"/"Unpause"
>   (os dados não são perdidos, só fica temporariamente indisponível)
> - Nada disso exige inserir cartão de crédito

## 2. Rodar o schema (SQL Editor)

No painel do projeto, abra **SQL Editor** (ícone no menu lateral) →
**New query**. Para cada arquivo abaixo, **nesta ordem**: abra o arquivo no
seu editor, copie todo o conteúdo, cole no SQL Editor do Supabase e clique em
**Run**. Espere terminar antes de ir para o próximo.

1. [`supabase/migrations/0001_schema.sql`](supabase/migrations/0001_schema.sql) — cria todas as tabelas, o
   perfil automático ao cadastrar usuário, etc.
2. [`supabase/migrations/0002_rls.sql`](supabase/migrations/0002_rls.sql) — ativa Row Level Security e as
   permissões por papel (morador / síndico / porteiro). **Não pule esta
   etapa** — sem ela, ninguém consegue ler ou gravar dados pelo app.
3. [`supabase/migrations/0003_storage.sql`](supabase/migrations/0003_storage.sql) — cria os buckets de
   arquivos (fotos de perfil, visitantes, achados e perdidos, comprovantes,
   documentos de assembleia) e suas permissões.
4. [`supabase/migrations/0004_seed.sql`](supabase/migrations/0004_seed.sql) — dados iniciais opcionais
   (categorias financeiras e alguns ambientes padrão), só para as telas não
   nascerem vazias. Rode só uma vez — não tem proteção contra duplicidade.
5. [`supabase/migrations/0005_profiles_email.sql`](supabase/migrations/0005_profiles_email.sql) — adiciona
   coluna de e-mail em `profiles` (necessária para a tela de gestão de
   moradores do síndico conseguir mostrar o e-mail de terceiros).

Se algum arquivo falhar no meio, corrija o erro reportado antes de continuar
(normalmente indica que um passo anterior não rodou por completo).

## 3. Pegar a URL e a chave pública do projeto

1. No painel, vá em **Project Settings** (ícone de engrenagem) → **Data API**.
2. Copie o **Project URL** (algo como `https://xxxxxxxxxxxx.supabase.co`).
3. Em **Project Settings → API Keys**, copie a chave **`anon` `public`**
   (não a `service_role` — essa é secreta e nunca deve ir para o app).

## 4. Configurar o app

Na raiz do repositório, crie um arquivo `.env` (ele já está no `.gitignore`,
então não será commitado) com base no [`.env.example`](.env.example):

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

Reinicie o Expo (`npx expo start -c` para limpar cache) depois de criar ou
alterar o `.env`.

## 5. Autenticação por e-mail (opcional, útil para testar mais rápido)

Por padrão, o Supabase exige que o usuário confirme o e-mail antes de logar.
Durante o desenvolvimento isso pode atrapalhar. Para desativar
temporariamente:

1. **Authentication → Sign In / Providers → Email**.
2. Desmarque **Confirm email**.
3. Salve.

Lembre-se de reativar antes de qualquer uso "real" com usuários de verdade.

## 6. Conferir se subiu tudo certo

- **Table Editor**: deve mostrar as 27 tabelas (profiles, visitantes,
  encomendas, ocorrencias, ambientes, assembleias, enquetes, pets, etc.).
- **Authentication → Policies** ou **Table Editor → [tabela] → RLS**: cada
  tabela deve aparecer com "RLS enabled" e algumas políticas listadas.
- **Storage**: deve mostrar os 5 buckets (`avatars`, `visitantes`,
  `achados-perdidos`, `comprovantes`, `assembleias`).

## 7. O que ainda falta (fora do escopo deste guia)

Este trabalho cobriu o **banco de dados** (schema + segurança + storage). O
app React Native ainda tem pontas soltas que não foram mexidas aqui:

- `src/app/login.tsx` e `src/app/cadastro.tsx` usam autenticação **mockada**
  (e-mails fixos no código), não chamam `supabase.auth` de verdade ainda.
- A maioria das telas (encomendas, ocorrências, achados e perdidos,
  ambientes, assembleias, enquetes, financeiro, veículos, pets, pânico,
  câmeras...) ainda usa **arrays de dados fictícios** (`useState` com mock),
  não consulta as tabelas reais. `src/app/inicio.tsx` e
  `src/app/telaconfig.tsx` são as únicas telas hoje integradas de verdade
  com o Supabase.

O banco já está pronto para receber essas integrações — é só trocar os
`useState` mockados por chamadas `supabase.from('tabela').select()/insert()/update()`
seguindo os nomes de coluna definidos em `supabase/migrations/0001_schema.sql`.

## Referência rápida: tipos gerados (opcional)

Se quiser tipos TypeScript gerados automaticamente a partir do schema (evita
digitar `select('nome, apto, foto_url')` sem checagem de tipos):

```
npx supabase login
npx supabase gen types typescript --project-id SEU_PROJECT_REF > src/lib/database.types.ts
```

O `SEU_PROJECT_REF` é o trecho antes de `.supabase.co` na Project URL (ex.:
`xxxxxxxxxxxx`).
