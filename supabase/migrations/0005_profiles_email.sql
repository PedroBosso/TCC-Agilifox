-- =========================================================
-- TCC-Agilifox — Adiciona e-mail em profiles
--
-- Necessário porque o cliente Supabase (chave anon) não consegue ler
-- auth.users de outras pessoas — só os próprios dados. Telas como a de
-- gestão de moradores (síndico) precisam ver o e-mail de terceiros, então
-- guardamos uma cópia em profiles, preenchida automaticamente no cadastro.
--
-- Rode depois de 0001_schema.sql (pode rodar mesmo se 0001-0004 já
-- tiverem sido executados antes desta migration existir).
-- =========================================================

alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, role, apto, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'morador'),
    new.raw_user_meta_data->>'apto',
    new.email
  );
  return new;
end;
$$;

-- preenche o e-mail de usuários criados antes desta migration
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;
