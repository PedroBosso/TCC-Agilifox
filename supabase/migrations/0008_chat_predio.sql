create table public.mensagens_predio (
  id uuid primary key default gen_random_uuid(),
  bloco text not null,
  autor_id uuid not null references public.profiles(id) on delete cascade,
  texto text not null,
  criado_em timestamptz not null default now()
);

create index mensagens_predio_bloco_idx on public.mensagens_predio (bloco, criado_em);

alter table public.mensagens_predio enable row level security;

create policy "mensagens_predio: le quem mora no mesmo predio"
  on public.mensagens_predio for select to authenticated
  using (bloco = (select p.bloco from public.profiles p where p.id = auth.uid()));

create policy "mensagens_predio: envia quem mora no mesmo predio"
  on public.mensagens_predio for insert to authenticated
  with check (
    autor_id = auth.uid()
    and bloco = (select p.bloco from public.profiles p where p.id = auth.uid())
  );

alter publication supabase_realtime add table public.mensagens_predio;
