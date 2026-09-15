-- =========================================================
-- TCC-Agilifox — Correções do Security Advisor (linter) do Supabase
--
-- Resolve os avisos (WARN): search_path mutável em funções, funções
-- SECURITY DEFINER chamáveis diretamente via API sem necessidade, e
-- buckets públicos com política que também permite listar todos os
-- arquivos. Nenhuma dessas correções muda o comportamento do app.
--
-- Rode depois de 0001-0005 (pode rodar em um projeto que já está em uso).
-- =========================================================

-- 1) search_path fixo nas funções que ainda não tinham (evita que alguém
-- manipule o search_path da sessão para essas funções resolverem nomes de
-- tabela para um schema diferente do esperado).
alter function public.is_staff() set search_path = '';
alter function public.is_sindico() set search_path = '';
alter function public.is_porteiro() set search_path = '';
alter function public.set_updated_at() set search_path = '';

-- 2) handle_new_user() e incrementar_voto_enquete() só devem rodar como
-- gatilho — um gatilho dispara independente de EXECUTE concedido à role,
-- então revogar aqui NÃO quebra os triggers já criados (on_auth_user_created,
-- trg_votos_enquete_incrementa); só impede que qualquer usuário chame essas
-- funções diretamente via /rest/v1/rpc/<nome>.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.incrementar_voto_enquete() from public, anon, authenticated;

-- my_role() precisa continuar chamável pela role "authenticated" — é dela
-- que is_sindico()/is_porteiro()/is_staff() dependem dentro das políticas de
-- RLS — mas não precisa ser chamável por "anon" (usuário não logado).
revoke execute on function public.my_role() from anon;

-- 3) "avatars" e "achados-perdidos" já são buckets públicos (public: true em
-- storage.buckets), então a URL pública já funciona sem depender de RLS. A
-- política de SELECT abaixo só servia para permitir LISTAR todos os
-- arquivos via API autenticada — removê-la não afeta getPublicUrl(), só
-- impede enumerar todos os arquivos do bucket.
drop policy if exists "avatars: leitura pública" on storage.objects;
drop policy if exists "achados-bucket: leitura pública" on storage.objects;
