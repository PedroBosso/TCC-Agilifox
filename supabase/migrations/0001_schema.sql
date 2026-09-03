-- =========================================================
-- TCC-Agilifox — Schema do banco de dados (Supabase/Postgres)
--
-- Ordem de execução: 0001 (este) -> 0002_rls.sql -> 0003_storage.sql -> 0004_seed.sql
-- Rode cada arquivo no SQL Editor do Supabase, nessa ordem, uma única vez.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- PERFIS (estende auth.users — 1 linha por usuário autenticado)
-- ---------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role text not null default 'morador' check (role in ('morador','sindico','porteiro')),
  apto text,
  bloco text,
  cpf text,
  data_nascimento date,
  telefone text,
  foto_url text,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria automaticamente um profile ao registrar um usuário em auth.users.
-- Passe { data: { nome, role, apto } } em supabase.auth.signUp() para preencher
-- esses campos; sem eles, o profile nasce com role "morador" e nome derivado do e-mail.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, role, apto)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'morador'),
    new.raw_user_meta_data->>'apto'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------
-- VISITANTES / CONTROLE DE ACESSO
-- ---------------------------------------------------------
create table public.visitantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  apartamento text not null,
  morador_id uuid references public.profiles(id) on delete set null,
  foto_url text,
  documento text,
  criado_por uuid references public.profiles(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table public.autorizacoes_visita (
  id uuid primary key default gen_random_uuid(),
  visitante_id uuid references public.visitantes(id) on delete set null,
  nome_visitante text not null,
  morador_id uuid not null references public.profiles(id) on delete cascade,
  apartamento text not null,
  detalhe text,
  status text not null default 'agendado' check (status in ('ativo','agendado','expirado','cancelado')),
  data_inicio timestamptz,
  data_fim timestamptz,
  recorrente boolean not null default false,
  criado_em timestamptz not null default now()
);

create table public.registros_acesso (
  id uuid primary key default gen_random_uuid(),
  tipo_pessoa text not null check (tipo_pessoa in ('morador','visitante','entregador')),
  nome text not null,
  apartamento text,
  direcao text not null check (direcao in ('entrada','saida')),
  status text not null default 'aguardando' check (status in ('liberado','aguardando')),
  visitante_id uuid references public.visitantes(id) on delete set null,
  liberado_por uuid references public.profiles(id) on delete set null,
  registrado_em timestamptz not null default now()
);

-- ---------------------------------------------------------
-- ENCOMENDAS
-- ---------------------------------------------------------
create table public.encomendas (
  id uuid primary key default gen_random_uuid(),
  morador_id uuid references public.profiles(id) on delete set null,
  apartamento text not null,
  morador_nome text,
  remetente text,
  transportadora text,
  codigo_rastreio text,
  codigo_entrega text,
  observacao text,
  imagem_url text,
  status text not null default 'na_portaria' check (status in ('aguardando','na_portaria','retirada')),
  data_prevista date,
  data_chegada timestamptz not null default now(),
  data_retirada timestamptz,
  registrado_por uuid references public.profiles(id) on delete set null
);

-- ---------------------------------------------------------
-- OCORRÊNCIAS / ACHADOS E PERDIDOS / COMUNICADOS
-- ---------------------------------------------------------
create table public.ocorrencias (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references public.profiles(id) on delete set null,
  origem text not null check (origem in ('morador','porteiro')),
  titulo text not null,
  descricao text not null,
  categoria text not null,
  local text,
  gravidade text check (gravidade in ('normal','atencao','urgente')),
  status text not null default 'aberta' check (status in ('aberta','andamento','resolvida')),
  encaminhada_sindico boolean not null default false,
  criado_em timestamptz not null default now()
);

create table public.achados_perdidos (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references public.profiles(id) on delete set null,
  tipo text not null check (tipo in ('perdido','achado')),
  categoria text not null,
  titulo text not null,
  descricao text not null,
  local text,
  contato text not null,
  status text not null default 'ativo' check (status in ('ativo','resolvido')),
  imagem_url text,
  criado_em timestamptz not null default now()
);

create table public.comunicados (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references public.profiles(id) on delete set null,
  titulo text not null,
  conteudo text not null,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------
-- AMBIENTES / RESERVAS
-- ---------------------------------------------------------
create table public.ambientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  capacidade int,
  taxa numeric(10,2),
  regras text,
  cor text,
  ativo boolean not null default true
);

create table public.reservas_ambiente (
  id uuid primary key default gen_random_uuid(),
  ambiente_id uuid not null references public.ambientes(id) on delete cascade,
  morador_id uuid not null references public.profiles(id) on delete cascade,
  data date not null,
  horario text not null check (horario in ('manha','tarde','noite')),
  status text not null default 'pendente' check (status in ('pendente','confirmada','recusada','cancelada')),
  observacao text,
  motivo_recusa text,
  criado_em timestamptz not null default now()
);

-- impede duas reservas ativas no mesmo ambiente/data/horário
create unique index reservas_ambiente_slot_ocupado
  on public.reservas_ambiente (ambiente_id, data, horario)
  where status in ('pendente','confirmada');

-- ---------------------------------------------------------
-- ASSEMBLEIAS
-- ---------------------------------------------------------
create table public.assembleias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null check (tipo in ('ordinaria','extraordinaria')),
  data_hora timestamptz not null,
  duracao_minutos int,
  link_reuniao text,
  status text not null default 'agendada' check (status in ('agendada','cancelada')),
  encerrada_manualmente boolean not null default false,
  criado_por uuid references public.profiles(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table public.assembleia_pauta (
  id uuid primary key default gen_random_uuid(),
  assembleia_id uuid not null references public.assembleias(id) on delete cascade,
  item text not null,
  ordem int not null default 0
);

create table public.assembleia_documentos (
  id uuid primary key default gen_random_uuid(),
  assembleia_id uuid not null references public.assembleias(id) on delete cascade,
  nome text not null,
  arquivo_url text not null,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------
-- ENQUETES
-- ---------------------------------------------------------
create table public.enquetes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  data_fim timestamptz not null,
  anonima boolean not null default true,
  encerrada_manualmente boolean not null default false,
  criado_por uuid references public.profiles(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table public.opcoes_enquete (
  id uuid primary key default gen_random_uuid(),
  enquete_id uuid not null references public.enquetes(id) on delete cascade,
  texto text not null,
  ordem int not null default 0,
  votos int not null default 0
);

create table public.votos_enquete (
  id uuid primary key default gen_random_uuid(),
  enquete_id uuid not null references public.enquetes(id) on delete cascade,
  opcao_id uuid not null references public.opcoes_enquete(id) on delete cascade,
  morador_id uuid not null references public.profiles(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (enquete_id, morador_id)
);

-- mantém opcoes_enquete.votos como contador (moradores enxergam o resultado
-- agregado sem precisar de acesso de leitura aos votos individuais de terceiros)
-- security definer: quem vota não tem permissão de UPDATE em opcoes_enquete
-- (só o síndico tem, via RLS), então o contador precisa rodar com privilégio elevado
create or replace function public.incrementar_voto_enquete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.opcoes_enquete set votos = votos + 1 where id = new.opcao_id;
  return new;
end;
$$;

create trigger trg_votos_enquete_incrementa
  after insert on public.votos_enquete
  for each row execute function public.incrementar_voto_enquete();

-- ---------------------------------------------------------
-- FINANCEIRO (lançamentos do condomínio + faturas por morador)
-- ---------------------------------------------------------
create table public.categorias_financeiras (
  id text primary key,
  nome text not null,
  tipo text not null check (tipo in ('receita','despesa')),
  cor text,
  orcamento_mensal numeric(10,2)
);

create table public.lancamentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('receita','despesa')),
  categoria_id text references public.categorias_financeiras(id),
  descricao text not null,
  valor numeric(10,2) not null,
  data date not null,
  comprovante_url text,
  criado_por uuid references public.profiles(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table public.faturas (
  id uuid primary key default gen_random_uuid(),
  morador_id uuid not null references public.profiles(id) on delete cascade,
  referencia text not null,
  descricao text,
  valor numeric(10,2) not null,
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente','pago')),
  forma_pagamento text check (forma_pagamento in ('pix','boleto')),
  data_pagamento timestamptz,
  codigo_pix text,
  linha_digitavel text,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------
-- VAGAS / VEÍCULOS
-- ---------------------------------------------------------
create table public.vagas (
  id uuid primary key default gen_random_uuid(),
  morador_id uuid not null references public.profiles(id) on delete cascade,
  numero text not null,
  localizacao text,
  disponivel_aluguel boolean not null default false,
  valor_mensal numeric(10,2),
  descricao text
);

create table public.veiculos (
  id uuid primary key default gen_random_uuid(),
  morador_id uuid not null references public.profiles(id) on delete cascade,
  placa text not null,
  modelo text,
  cor text,
  tipo text not null default 'carro' check (tipo in ('carro','moto')),
  vaga_id uuid references public.vagas(id) on delete set null,
  na_garagem boolean not null default false,
  ultima_movimentacao timestamptz
);

create table public.alugueis_vaga (
  id uuid primary key default gen_random_uuid(),
  vaga_id uuid not null references public.vagas(id) on delete cascade,
  locatario_id uuid not null references public.profiles(id) on delete cascade,
  data_inicio date not null default current_date,
  data_fim date,
  ativo boolean not null default true
);

create table public.movimentacoes_veiculo (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida')),
  registrado_em timestamptz not null default now(),
  registrado_por uuid references public.profiles(id) on delete set null
);

-- ---------------------------------------------------------
-- PETS
-- ---------------------------------------------------------
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  morador_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  especie text not null check (especie in ('cachorro','gato','outro')),
  raca text,
  cor text not null,
  porte text check (porte in ('pequeno','medio','grande')),
  sexo text check (sexo in ('macho','femea')),
  idade text,
  castrado boolean,
  vacinacao_em_dia boolean,
  caracteristicas text,
  criado_em timestamptz not null default now()
);

create table public.pet_observacoes (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  autor_id uuid references public.profiles(id) on delete set null,
  texto text not null,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------
-- PÂNICO / CÂMERAS
-- ---------------------------------------------------------
create table public.alertas_panico (
  id uuid primary key default gen_random_uuid(),
  morador_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'ativo' check (status in ('ativo','atendido','cancelado')),
  detalhes_morador text,
  visualizado_portaria_em timestamptz,
  atendido_em timestamptz,
  atendido_por uuid references public.profiles(id) on delete set null,
  observacao_atendimento text,
  criado_em timestamptz not null default now()
);

create table public.cameras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  area text check (area in ('entrada','garagem','areas_comuns','seguranca')),
  url_stream text,
  ativa boolean not null default true,
  online boolean not null default false
);
