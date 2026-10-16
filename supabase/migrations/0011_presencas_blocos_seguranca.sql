-- 1) Blocos oficiais do condominio. O cadastro e a edicao de moradores passam
-- a escolher o bloco desta lista em vez de digitar, para que "Bloco A",
-- "bloco a" e "A" nao virem predios diferentes no chat.

create table public.blocos (
  nome text primary key,
  criado_em timestamptz not null default now()
);

create unique index blocos_nome_sem_maiusculas on public.blocos (lower(nome));

insert into public.blocos (nome)
select bloco from public.profiles where bloco is not null
union
select bloco from public.mensagens_predio
on conflict do nothing;

alter table public.profiles
  add constraint profiles_bloco_fkey
  foreign key (bloco) references public.blocos (nome)
  on update cascade on delete restrict;

alter table public.mensagens_predio
  add constraint mensagens_predio_bloco_fkey
  foreign key (bloco) references public.blocos (nome)
  on update cascade on delete restrict;

-- Padroniza o bloco cadastrado como "B" para "Bloco B", no mesmo formato dos
-- demais. A troca se propaga sozinha para os perfis e as mensagens.
update public.blocos set nome = 'Bloco B'
where nome = 'B'
  and not exists (select 1 from public.blocos where lower(nome) = 'bloco b');

alter table public.blocos enable row level security;

create policy "blocos: leitura para autenticados"
  on public.blocos for select to authenticated using (true);

create policy "blocos: sindico cadastra"
  on public.blocos for insert to authenticated
  with check (public.is_sindico());

create policy "blocos: sindico remove bloco sem uso"
  on public.blocos for delete to authenticated
  using (public.is_sindico());


-- 2) Lista de presenca das assembleias. Cada registro guarda quem entrou e
-- quando, com nome, apartamento e bloco copiados no momento da entrada, para
-- o historico continuar valido mesmo que o cadastro mude depois. O horario e
-- definido pelo banco, nao pelo celular, e os registros nao podem ser
-- alterados nem apagados pelo app.

create table public.assembleia_presencas (
  id uuid primary key default gen_random_uuid(),
  assembleia_id uuid not null references public.assembleias(id) on delete restrict,
  morador_id uuid references public.profiles(id) on delete set null,
  nome text not null,
  apto text,
  bloco text,
  entrou_em timestamptz not null default now(),
  unique (assembleia_id, morador_id)
);

create index assembleia_presencas_assembleia_idx
  on public.assembleia_presencas (assembleia_id, entrou_em);

create or replace function public.preencher_presenca_assembleia()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_nome text;
  v_apto text;
  v_bloco text;
begin
  select p.nome, p.apto, p.bloco
    into v_nome, v_apto, v_bloco
    from public.profiles p
   where p.id = new.morador_id;

  new.nome := coalesce(v_nome, 'Usuário');
  new.apto := v_apto;
  new.bloco := v_bloco;
  new.entrou_em := now();
  return new;
end;
$$;

create trigger trg_preencher_presenca
  before insert on public.assembleia_presencas
  for each row execute function public.preencher_presenca_assembleia();

alter table public.assembleia_presencas enable row level security;

-- So aceita a presenca durante a janela da reuniao (com folga para diferenca
-- de relogio), impedindo registrar presenca depois que ela ja aconteceu.
create policy "presencas: morador registra a propria durante a reuniao"
  on public.assembleia_presencas for insert to authenticated
  with check (
    morador_id = auth.uid()
    and exists (
      select 1 from public.assembleias a
      where a.id = assembleia_presencas.assembleia_id
        and a.status = 'agendada'
        and not a.encerrada_manualmente
        and now() between a.data_hora - interval '20 minutes'
                      and a.data_hora
                          + make_interval(mins => coalesce(a.duracao_minutos, 0))
                          + interval '30 minutes'
    )
  );

create policy "presencas: sindico ve todas, morador ve as proprias"
  on public.assembleia_presencas for select to authenticated
  using (morador_id = auth.uid() or public.is_sindico());


-- 3) Correcao de seguranca. Antes, qualquer usuario conseguia alterar o
-- proprio perfil inteiro pela API, inclusive o papel (virando sindico) e o
-- bloco (entrando no chat de outro predio). Agora, fora o sindico, cada um so
-- altera o proprio telefone e a propria foto.

create or replace function public.proteger_campos_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Manutencao direta no banco (SQL Editor, cascatas) nao passa por esta trava.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if public.is_sindico() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.nome is distinct from old.nome
     or new.apto is distinct from old.apto
     or new.bloco is distinct from old.bloco
     or new.cpf is distinct from old.cpf
     or new.data_nascimento is distinct from old.data_nascimento
     or new.status is distinct from old.status
     or new.email is distinct from old.email then
    raise exception 'Somente o síndico pode alterar esses dados do perfil.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger trg_proteger_campos_perfil
  before update on public.profiles
  for each row execute function public.proteger_campos_perfil();

-- O papel enviado pelo app no cadastro deixa de ser aceito: toda conta nova
-- nasce como morador. Sindico e porteiro sao promovidos direto no banco.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, role, apto, bloco, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    'morador',
    new.raw_user_meta_data->>'apto',
    new.raw_user_meta_data->>'bloco',
    new.email
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
