-- Cobrancas do sindico para os moradores (tabela faturas).
-- Rode depois de 0011_presencas_blocos_seguranca.sql.
--
-- O morador ve as proprias contas e so pode confirmar o pagamento de uma conta
-- pendente. Ele nao consegue mudar valor, assunto nem vencimento, e a data da
-- confirmacao e definida pelo banco, nao pelo celular.

create or replace function public.proteger_fatura()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Manutencao direta no banco e acoes do sindico nao passam por esta trava.
  if current_user not in ('authenticated', 'anon') or public.is_sindico() then
    return new;
  end if;

  -- Para os demais, a unica alteracao aceita e pendente para pago, sem mexer no resto.
  if old.status <> 'pendente'
     or new.status <> 'pago'
     or (to_jsonb(new) - 'status' - 'data_pagamento') <> (to_jsonb(old) - 'status' - 'data_pagamento') then
    raise exception 'O morador só pode confirmar o pagamento de uma conta pendente.'
      using errcode = '42501';
  end if;

  new.data_pagamento := now();
  return new;
end;
$$;

drop trigger if exists trg_proteger_fatura on public.faturas;

create trigger trg_proteger_fatura
  before update on public.faturas
  for each row execute function public.proteger_fatura();

-- O sindico pode apagar uma conta lancada por engano, mas so enquanto ninguem pagou.
drop policy if exists "faturas: síndico apaga contas pendentes" on public.faturas;

create policy "faturas: síndico apaga contas pendentes"
  on public.faturas for delete to authenticated
  using (public.is_sindico() and status = 'pendente');
