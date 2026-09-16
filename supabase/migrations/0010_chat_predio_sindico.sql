-- O sindico nao mora em nenhum bloco (profiles.bloco fica nulo), entao as
-- politicas antigas o excluiam do chat. Aqui ele passa a ler e escrever em
-- qualquer bloco, enquanto o morador continua restrito ao bloco dele.

drop policy if exists "mensagens_predio: le quem mora no mesmo predio" on public.mensagens_predio;
drop policy if exists "mensagens_predio: envia quem mora no mesmo predio" on public.mensagens_predio;

create policy "mensagens_predio: le morador do bloco ou sindico"
  on public.mensagens_predio for select to authenticated
  using (
    bloco = (select p.bloco from public.profiles p where p.id = auth.uid())
    or public.is_sindico()
  );

create policy "mensagens_predio: envia morador do bloco ou sindico"
  on public.mensagens_predio for insert to authenticated
  with check (
    autor_id = auth.uid()
    and (
      bloco = (select p.bloco from public.profiles p where p.id = auth.uid())
      or public.is_sindico()
    )
  );
