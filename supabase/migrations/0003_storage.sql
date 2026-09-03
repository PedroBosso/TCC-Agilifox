-- =========================================================
-- TCC-Agilifox — Storage (buckets de arquivos)
--
-- Rode depois de 0001_schema.sql e 0002_rls.sql.
-- =========================================================

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('visitantes', 'visitantes', false),
  ('achados-perdidos', 'achados-perdidos', true),
  ('comprovantes', 'comprovantes', false),
  ('assembleias', 'assembleias', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------
-- avatars: público para leitura (é usado direto como <Image uri=.../>);
-- cada usuário só grava dentro da própria pasta "<uid>/...", que é o
-- padrão já usado em telaconfig.tsx (`${perfil.id}/${Date.now()}.ext`).
-- ---------------------------------------------------------
create policy "avatars: leitura pública"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: usuário grava na própria pasta"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: usuário atualiza a própria pasta"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: usuário remove da própria pasta"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------
-- visitantes: fotos usadas no reconhecimento facial — só síndico/porteiro
-- ---------------------------------------------------------
create policy "visitantes-bucket: staff gerencia"
  on storage.objects for all to authenticated
  using (bucket_id = 'visitantes' and public.is_staff())
  with check (bucket_id = 'visitantes' and public.is_staff());

-- ---------------------------------------------------------
-- achados-perdidos: mural público (leitura), qualquer morador autenticado publica
-- ---------------------------------------------------------
create policy "achados-bucket: leitura pública"
  on storage.objects for select
  using (bucket_id = 'achados-perdidos');

create policy "achados-bucket: autenticado envia foto"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'achados-perdidos');

-- ---------------------------------------------------------
-- comprovantes: anexos de lançamentos financeiros — só síndico
-- ---------------------------------------------------------
create policy "comprovantes-bucket: síndico gerencia"
  on storage.objects for all to authenticated
  using (bucket_id = 'comprovantes' and public.is_sindico())
  with check (bucket_id = 'comprovantes' and public.is_sindico());

-- ---------------------------------------------------------
-- assembleias: atas/documentos — leitura para todos os moradores autenticados,
-- upload só pelo síndico
-- ---------------------------------------------------------
create policy "assembleias-bucket: leitura para autenticados"
  on storage.objects for select to authenticated
  using (bucket_id = 'assembleias');

create policy "assembleias-bucket: síndico envia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'assembleias' and public.is_sindico());
