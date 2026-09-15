create table public.mensagens_diretas (
  id uuid primary key default gen_random_uuid(),
  morador_id uuid not null references public.profiles(id) on delete cascade,
  destino text not null check (destino in ('sindico', 'portaria')),
  autor_id uuid not null references public.profiles(id) on delete cascade,
  texto text not null,
  criado_em timestamptz not null default now()
);

create index mensagens_diretas_thread_idx on public.mensagens_diretas (morador_id, destino, criado_em);

alter table public.mensagens_diretas enable row level security;

create policy "mensagens_diretas: participantes veem"
  on public.mensagens_diretas for select to authenticated
  using (
    morador_id = auth.uid()
    or (destino = 'sindico' and public.is_sindico())
    or (destino = 'portaria' and public.is_porteiro())
  );

create policy "mensagens_diretas: participantes enviam"
  on public.mensagens_diretas for insert to authenticated
  with check (
    autor_id = auth.uid()
    and (
      (morador_id = auth.uid() and destino in ('sindico', 'portaria'))
      or (destino = 'sindico' and public.is_sindico())
      or (destino = 'portaria' and public.is_porteiro())
    )
  );

alter publication supabase_realtime add table public.mensagens_diretas;
