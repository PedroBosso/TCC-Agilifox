-- =========================================================
-- TCC-Agilifox — Dados iniciais (opcional)
--
-- Rode por último, uma única vez (não tem proteção contra duplicidade em
-- "ambientes" — rodar de novo criará ambientes repetidos).
-- =========================================================

insert into public.categorias_financeiras (id, nome, tipo, cor, orcamento_mensal) values
  ('manutencao', 'Manutenção', 'despesa', '#e49c15', 3000),
  ('agua_luz', 'Água e Energia', 'despesa', '#e8a815', 2500),
  ('salarios', 'Salários e Encargos', 'despesa', '#c0392b', 8000),
  ('seguranca', 'Segurança', 'despesa', '#8b3329', 4000),
  ('limpeza', 'Limpeza', 'despesa', '#27ae60', 1500),
  ('administrativo', 'Administrativo', 'despesa', '#7f8c8d', 1000),
  ('taxa_condominial', 'Taxa Condominial', 'receita', '#2ecc71', null),
  ('aluguel_espacos', 'Aluguel de Espaços', 'receita', '#16a085', null),
  ('multas', 'Multas', 'receita', '#e67e22', null),
  ('outras_receitas', 'Outras Receitas', 'receita', '#95a5a6', null)
on conflict (id) do nothing;

insert into public.ambientes (nome, capacidade, taxa, regras, cor, ativo) values
  ('Salão de Festas', 60, 150.00, 'Reserva com até 30 dias de antecedência. Devolver limpo.', '#e49c42', true),
  ('Churrasqueira', 20, 50.00, 'Uso permitido até às 22h.', '#e8a815', true),
  ('Quadra Esportiva', 10, null, 'Uso gratuito, respeitar o horário reservado.', '#e8a842', true),
  ('Academia', 15, null, 'Uso individual, respeitar limite de horário.', '#e49c15', true);
