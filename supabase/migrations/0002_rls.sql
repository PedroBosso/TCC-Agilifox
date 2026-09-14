-- =========================================================
-- TCC-Agilifox — Row Level Security (RLS)
--
-- Sem essas políticas, com RLS habilitado (obrigatório no Supabase para
-- dados sensíveis), NINGUÉM consegue ler/escrever nas tabelas pelo app
-- (só pelo SQL Editor, que usa a chave de serviço). Rode depois de 0001_schema.sql.
-- =========================================================

-- ---------------------------------------------------------
-- Funções auxiliares de papel (role) do usuário logado
-- ---------------------------------------------------------
create or replace function public.my_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_sindico()
returns boolean language sql stable
as $$ select public.my_role() = 'sindico' $$;

create or replace function public.is_porteiro()
returns boolean language sql stable
as $$ select public.my_role() = 'porteiro' $$;

create or replace function public.is_staff()
returns boolean language sql stable
as $$ select public.my_role() in ('sindico', 'porteiro') $$;

-- ---------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: leitura para autenticados"
  on public.profiles for select to authenticated using (true);

create policy "profiles: o próprio usuário edita seu perfil"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: síndico gerencia todos os perfis"
  on public.profiles for all to authenticated
  using (public.is_sindico())
  with check (public.is_sindico());

-- ---------------------------------------------------------
-- VISITANTES / ACESSO
-- ---------------------------------------------------------
alter table public.visitantes enable row level security;

create policy "visitantes: dono ou staff vê"
  on public.visitantes for select to authenticated
  using (morador_id = auth.uid() or public.is_staff());

create policy "visitantes: morador ou staff cadastra"
  on public.visitantes for insert to authenticated
  with check (morador_id = auth.uid() or public.is_staff());

create policy "visitantes: dono ou staff atualiza"
  on public.visitantes for update to authenticated
  using (morador_id = auth.uid() or public.is_staff())
  with check (morador_id = auth.uid() or public.is_staff());

create policy "visitantes: dono ou staff exclui"
  on public.visitantes for delete to authenticated
  using (morador_id = auth.uid() or public.is_staff());

alter table public.autorizacoes_visita enable row level security;

create policy "autorizacoes: morador ou staff vê"
  on public.autorizacoes_visita for select to authenticated
  using (morador_id = auth.uid() or public.is_staff());

create policy "autorizacoes: morador cria a própria"
  on public.autorizacoes_visita for insert to authenticated
  with check (morador_id = auth.uid());

create policy "autorizacoes: morador ou staff atualiza"
  on public.autorizacoes_visita for update to authenticated
  using (morador_id = auth.uid() or public.is_staff())
  with check (morador_id = auth.uid() or public.is_staff());

alter table public.registros_acesso enable row level security;

create policy "registros_acesso: staff gerencia"
  on public.registros_acesso for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------
-- ENCOMENDAS
-- ---------------------------------------------------------
alter table public.encomendas enable row level security;

create policy "encomendas: morador ou staff vê"
  on public.encomendas for select to authenticated
  using (morador_id = auth.uid() or public.is_staff());

create policy "encomendas: morador registra a própria a caminho, staff registra qualquer"
  on public.encomendas for insert to authenticated
  with check (morador_id = auth.uid() or public.is_staff());

create policy "encomendas: dono edita código de entrega, staff atualiza status"
  on public.encomendas for update to authenticated
  using (morador_id = auth.uid() or public.is_staff())
  with check (morador_id = auth.uid() or public.is_staff());

-- ---------------------------------------------------------
-- OCORRÊNCIAS / ACHADOS E PERDIDOS / COMUNICADOS
-- ---------------------------------------------------------
alter table public.ocorrencias enable row level security;

create policy "ocorrencias: autor ou staff vê"
  on public.ocorrencias for select to authenticated
  using (autor_id = auth.uid() or public.is_staff());

create policy "ocorrencias: usuário autenticado registra a própria"
  on public.ocorrencias for insert to authenticated
  with check (autor_id = auth.uid());

create policy "ocorrencias: síndico atualiza status"
  on public.ocorrencias for update to authenticated
  using (public.is_sindico())
  with check (public.is_sindico());

alter table public.achados_perdidos enable row level security;

create policy "achados: leitura para autenticados"
  on public.achados_perdidos for select to authenticated using (true);

create policy "achados: autor cria o próprio"
  on public.achados_perdidos for insert to authenticated
  with check (autor_id = auth.uid());

create policy "achados: autor ou staff atualiza"
  on public.achados_perdidos for update to authenticated
  using (autor_id = auth.uid() or public.is_staff())
  with check (autor_id = auth.uid() or public.is_staff());

alter table public.comunicados enable row level security;

create policy "comunicados: leitura para autenticados"
  on public.comunicados for select to authenticated using (true);

create policy "comunicados: escrita restrita ao síndico"
  on public.comunicados for all to authenticated
  using (public.is_sindico())
  with check (public.is_sindico());

-- ---------------------------------------------------------
-- AMBIENTES / RESERVAS
-- ---------------------------------------------------------
alter table public.ambientes enable row level security;

create policy "ambientes: leitura para autenticados"
  on public.ambientes for select to authenticated using (true);

create policy "ambientes: escrita restrita ao síndico"
  on public.ambientes for all to authenticated
  using (public.is_sindico())
  with check (public.is_sindico());

alter table public.reservas_ambiente enable row level security;

create policy "reservas: morador vê as próprias, síndico e porteiro veem todas"
  on public.reservas_ambiente for select to authenticated
  using (morador_id = auth.uid() or public.is_staff());

create policy "reservas: morador cria a própria"
  on public.reservas_ambiente for insert to authenticated
  with check (morador_id = auth.uid());

create policy "reservas: morador cancela a própria, síndico aprova/recusa"
  on public.reservas_ambiente for update to authenticated
  using (morador_id = auth.uid() or public.is_sindico())
  with check (morador_id = auth.uid() or public.is_sindico());

-- ---------------------------------------------------------
-- ASSEMBLEIAS
-- ---------------------------------------------------------
alter table public.assembleias enable row level security;

create policy "assembleias: leitura para autenticados"
  on public.assembleias for select to authenticated using (true);

create policy "assembleias: escrita restrita ao síndico"
  on public.assembleias for all to authenticated
  using (public.is_sindico())
  with check (public.is_sindico());

alter table public.assembleia_pauta enable row level security;

create policy "assembleia_pauta: leitura para autenticados"
  on public.assembleia_pauta for select to authenticated using (true);

create policy "assembleia_pauta: escrita restrita ao síndico"
  on public.assembleia_pauta for all to authenticated
  using (public.is_sindico())
  with check (public.is_sindico());

alter table public.assembleia_documentos enable row level security;

create policy "assembleia_documentos: leitura para autenticados"
  on public.assembleia_documentos for select to authenticated using (true);

create policy "assembleia_documentos: escrita restrita ao síndico"
  on public.assembleia_documentos for all to authenticated
  using (public.is_sindico())
  with check (public.is_sindico());

-- ---------------------------------------------------------
-- ENQUETES
-- ---------------------------------------------------------
alter table public.enquetes enable row level security;

create policy "enquetes: leitura para autenticados"
  on public.enquetes for select to authenticated using (true);

create policy "enquetes: escrita restrita ao síndico"
  on public.enquetes for all to authenticated
  using (public.is_sindico())
  with check (public.is_sindico());

alter table public.opcoes_enquete enable row level security;

create policy "opcoes_enquete: leitura para autenticados"
  on public.opcoes_enquete for select to authenticated using (true);

create policy "opcoes_enquete: escrita restrita ao síndico"
  on public.opcoes_enquete for all to authenticated
  using (public.is_sindico())
  with check (public.is_sindico());

alter table public.votos_enquete enable row level security;

create policy "votos: morador vê o próprio, síndico vê todos"
  on public.votos_enquete for select to authenticated
  using (morador_id = auth.uid() or public.is_sindico());

create policy "votos: morador vota uma única vez"
  on public.votos_enquete for insert to authenticated
  with check (morador_id = auth.uid());

-- ---------------------------------------------------------
-- FINANCEIRO
-- ---------------------------------------------------------
alter table public.categorias_financeiras enable row level security;

create policy "categorias_financeiras: leitura para autenticados"
  on public.categorias_financeiras for select to authenticated using (true);

create policy "categorias_financeiras: escrita restrita ao síndico"
  on public.categorias_financeiras for all to authenticated
  using (public.is_sindico())
  with check (public.is_sindico());

alter table public.lancamentos_financeiros enable row level security;

create policy "lancamentos: leitura para autenticados"
  on public.lancamentos_financeiros for select to authenticated using (true);

create policy "lancamentos: escrita restrita ao síndico"
  on public.lancamentos_financeiros for all to authenticated
  using (public.is_sindico())
  with check (public.is_sindico());

alter table public.faturas enable row level security;

create policy "faturas: morador vê as próprias, síndico vê todas"
  on public.faturas for select to authenticated
  using (morador_id = auth.uid() or public.is_sindico());

create policy "faturas: síndico cria"
  on public.faturas for insert to authenticated
  with check (public.is_sindico());

create policy "faturas: morador confirma pagamento, síndico gerencia"
  on public.faturas for update to authenticated
  using (morador_id = auth.uid() or public.is_sindico())
  with check (morador_id = auth.uid() or public.is_sindico());

-- ---------------------------------------------------------
-- VAGAS / VEÍCULOS
-- ---------------------------------------------------------
alter table public.vagas enable row level security;

create policy "vagas: leitura para autenticados"
  on public.vagas for select to authenticated using (true);

create policy "vagas: dono gerencia a própria"
  on public.vagas for insert to authenticated with check (morador_id = auth.uid());

create policy "vagas: dono atualiza a própria"
  on public.vagas for update to authenticated
  using (morador_id = auth.uid()) with check (morador_id = auth.uid());

create policy "vagas: dono exclui a própria"
  on public.vagas for delete to authenticated using (morador_id = auth.uid());

alter table public.veiculos enable row level security;

create policy "veiculos: dono ou staff vê"
  on public.veiculos for select to authenticated
  using (morador_id = auth.uid() or public.is_staff());

create policy "veiculos: morador cadastra o próprio"
  on public.veiculos for insert to authenticated
  with check (morador_id = auth.uid());

create policy "veiculos: morador edita, staff registra movimentação"
  on public.veiculos for update to authenticated
  using (morador_id = auth.uid() or public.is_staff())
  with check (morador_id = auth.uid() or public.is_staff());

create policy "veiculos: morador exclui o próprio"
  on public.veiculos for delete to authenticated using (morador_id = auth.uid());

alter table public.alugueis_vaga enable row level security;

create policy "alugueis: dono da vaga ou locatário vê"
  on public.alugueis_vaga for select to authenticated
  using (
    locatario_id = auth.uid()
    or exists (select 1 from public.vagas v where v.id = vaga_id and v.morador_id = auth.uid())
  );

create policy "alugueis: morador aluga vaga disponível"
  on public.alugueis_vaga for insert to authenticated
  with check (locatario_id = auth.uid());

create policy "alugueis: locatário ou dono da vaga encerra"
  on public.alugueis_vaga for update to authenticated
  using (
    locatario_id = auth.uid()
    or exists (select 1 from public.vagas v where v.id = vaga_id and v.morador_id = auth.uid())
  )
  with check (
    locatario_id = auth.uid()
    or exists (select 1 from public.vagas v where v.id = vaga_id and v.morador_id = auth.uid())
  );

alter table public.movimentacoes_veiculo enable row level security;

create policy "movimentacoes: dono do veículo ou staff vê"
  on public.movimentacoes_veiculo for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.veiculos v where v.id = veiculo_id and v.morador_id = auth.uid())
  );

create policy "movimentacoes: staff registra"
  on public.movimentacoes_veiculo for insert to authenticated
  with check (public.is_staff());

-- ---------------------------------------------------------
-- PETS
-- ---------------------------------------------------------
alter table public.pets enable row level security;

create policy "pets: dono ou staff vê"
  on public.pets for select to authenticated
  using (morador_id = auth.uid() or public.is_staff());

create policy "pets: morador cadastra o próprio"
  on public.pets for insert to authenticated with check (morador_id = auth.uid());

create policy "pets: morador atualiza o próprio"
  on public.pets for update to authenticated
  using (morador_id = auth.uid()) with check (morador_id = auth.uid());

create policy "pets: morador ou síndico exclui"
  on public.pets for delete to authenticated
  using (morador_id = auth.uid() or public.is_sindico());

alter table public.pet_observacoes enable row level security;

create policy "pet_observacoes: dono do pet ou staff vê"
  on public.pet_observacoes for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.pets p where p.id = pet_id and p.morador_id = auth.uid())
  );

create policy "pet_observacoes: síndico registra"
  on public.pet_observacoes for insert to authenticated
  with check (public.is_sindico());

-- ---------------------------------------------------------
-- PÂNICO / CÂMERAS
-- ---------------------------------------------------------
alter table public.alertas_panico enable row level security;

create policy "panico: morador ou staff vê"
  on public.alertas_panico for select to authenticated
  using (morador_id = auth.uid() or public.is_staff());

create policy "panico: morador aciona o próprio alerta"
  on public.alertas_panico for insert to authenticated
  with check (morador_id = auth.uid());

create policy "panico: morador ou staff atualiza"
  on public.alertas_panico for update to authenticated
  using (morador_id = auth.uid() or public.is_staff())
  with check (morador_id = auth.uid() or public.is_staff());

alter table public.cameras enable row level security;

create policy "cameras: leitura para staff"
  on public.cameras for select to authenticated using (public.is_staff());

create policy "cameras: escrita restrita ao síndico"
  on public.cameras for all to authenticated
  using (public.is_sindico())
  with check (public.is_sindico());
