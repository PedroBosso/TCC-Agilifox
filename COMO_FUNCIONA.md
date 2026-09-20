# Como o TCC-Agilifox funciona

Guia do projeto em linguagem simples: o que cada parte faz, como as telas
conversam com o banco de dados e por que as coisas foram feitas assim.

---

## 1. O que é o aplicativo

Um app de gestão de condomínio. Três tipos de usuário usam o mesmo aplicativo,
mas cada um enxerga um conjunto diferente de telas:

| Papel | Quem é | O que faz |
|---|---|---|
| **Morador** | Quem mora no prédio | Acompanha encomendas, reserva ambientes, abre ocorrências, paga taxas, conversa no chat |
| **Síndico** | Administrador do condomínio | Gerencia tudo: moradores, finanças, comunicados, ocorrências, assembleias, enquetes |
| **Porteiro** | Funcionário da portaria | Registra encomendas, controla entradas/saídas, consulta veículos e pets, recebe alertas de pânico |

Quando alguém faz login, o app descobre o papel da pessoa e manda ela para a
tela inicial correspondente.

---

## 2. As peças do projeto

```
TCC-Agilifox/
├── src/
│   ├── app/            → todas as telas do aplicativo (45 arquivos)
│   ├── components/     → pedaços de tela reutilizáveis
│   ├── lib/supabase.ts → a "ponte" que conecta o app ao banco de dados
│   └── theme/          → cores e tamanhos padronizados
├── supabase/migrations/→ os comandos SQL que criam o banco (10 arquivos)
├── assets/images/      → ícones e imagens
├── app.json            → configurações do app (nome, ícone, plugins)
└── .env                → endereço e chave do seu banco (não vai para o GitHub)
```

### Tecnologias usadas

- **React Native + Expo** — permite escrever o app uma vez e rodar em Android e iOS
- **Expo Router** — o sistema de navegação. Cada arquivo dentro de `src/app/`
  vira automaticamente uma tela navegável. `inicio.tsx` vira a rota `/inicio`
- **TypeScript** — JavaScript com verificação de tipos, que avisa erros antes de rodar
- **Supabase** — o backend completo: banco de dados, login e armazenamento de arquivos

---

## 3. Como o app conversa com o banco

Não existe servidor próprio no meio do caminho. O aplicativo fala **direto**
com o Supabase. Isso funciona assim:

```
   App no celular  ←────→  Supabase (banco + login + arquivos)
```

O arquivo `src/lib/supabase.ts` cria esse canal de comunicação uma única vez,
lendo o endereço e a chave do arquivo `.env`. Todas as telas importam esse
mesmo canal:

```tsx
import { supabase } from '../lib/supabase';
```

### O padrão que se repete em toda tela

Praticamente toda tela segue a mesma receita:

```tsx
// 1. Um lugar para guardar os dados que vieram do banco
const [dados, setDados] = useState([]);

// 2. Quando a tela abre, busca os dados
useEffect(() => { carregar(); }, []);

async function carregar() {
  // 3. Descobre quem está logado
  const { data: { user } } = await supabase.auth.getUser();

  // 4. Pede os dados ao banco
  const { data } = await supabase
    .from('nome_da_tabela')
    .select('*')
    .eq('morador_id', user.id);

  // 5. Guarda para a tela exibir
  setDados(data);
}
```

Para **criar** algo usa-se `.insert(...)`, para **alterar** `.update(...)` e
para **apagar** `.delete()`.

---

## 4. A parte mais importante: segurança (RLS)

Esta é a ideia central do projeto e vale entender bem.

Como o app fala direto com o banco, a chave de acesso fica dentro do celular
de cada usuário. Alguém mal-intencionado poderia pegar essa chave e tentar
pedir dados que não são dele. **Esconder o botão na tela não protege nada.**

A proteção de verdade está no banco, através do **RLS (Row Level Security)**,
ou "segurança em nível de linha". São regras escritas em SQL que dizem, para
cada tabela, quem pode ver e alterar cada linha.

Exemplo real do projeto — a tabela de mensagens do chat:

```sql
create policy "le morador do bloco ou sindico"
  on public.mensagens_predio for select to authenticated
  using (
    bloco = (select p.bloco from public.profiles p where p.id = auth.uid())
    or public.is_sindico()
  );
```

Traduzindo: *"você só consegue ler mensagens do seu próprio bloco — a menos
que você seja o síndico, que lê todos."*

Isso foi testado na prática: um morador do Bloco A tentando escrever no Bloco
Teste recebe **erro 403** do banco, mesmo chamando a API diretamente, sem
passar pelo app.

### As funções auxiliares

Para não repetir a mesma verificação em dezenas de regras, existem atalhos:

- `is_sindico()` — a pessoa logada é síndico?
- `is_porteiro()` — é porteiro?
- `is_staff()` — é síndico **ou** porteiro?

---

## 5. Como funciona o login

1. A pessoa digita e-mail e senha em `login.tsx`
2. O app chama `supabase.auth.signInWithPassword(...)`
3. Se as credenciais estiverem erradas, o banco recusa e a tela mostra o motivo
4. Dando certo, o app consulta a tabela `profiles` para descobrir o papel
5. Conforme o papel, navega para `inicio`, `inicioSindico` ou `inicioPorteiro`

**Não existe autocadastro.** Quem cria as contas dos moradores é o síndico, pela
tela `cadastrarMorador.tsx`. Isso faz sentido num condomínio: ninguém deveria
conseguir se cadastrar sozinho e virar morador do prédio.

### Um detalhe interessante

Quando o síndico cria a conta de um morador, o app usa um canal Supabase
**temporário e separado** em vez do principal. Sem isso, o Supabase trocaria a
sessão ativa: o síndico seria deslogado e entraria como o morador que acabou
de criar.

### A tabela de perfis

A tabela `profiles` guarda nome, papel, apartamento, bloco e telefone. Ela é
preenchida **automaticamente** por um gatilho (*trigger*) no banco: sempre que
uma conta nova é criada, o banco cria o perfil junto, sem o app precisar pedir.

---

## 6. As funcionalidades, uma por uma

### Comunicados
O síndico publica avisos; todos leem. Só o síndico vê o botão de publicar —
e a regra no banco garante que apenas ele consiga, mesmo por fora do app.

### Encomendas
O porteiro registra pacotes que chegam. O morador acompanha e pode avisar
antecipadamente que uma encomenda está a caminho, informando um **código de
entrega** que aparece na tela da portaria — uma proteção contra alguém retirar
o pacote de outra pessoa.

### Ocorrências
Duas entradas para a mesma tabela:
- **Morador** relata um problema e acompanha o andamento
- **Porteiro** registra fatos do plantão (o "livro de ocorrências", que não
  pode ser editado depois — garante a integridade do histórico)
- **Síndico** vê todas e muda o status: Aberta → Em andamento → Resolvida

### Reservas de ambiente
O morador escolhe ambiente, data e turno (manhã/tarde/noite). O síndico aprova
ou recusa. O porteiro vê as reservas do dia na portaria.

Um detalhe do banco: existe um índice único que **impede duas reservas** no
mesmo ambiente, data e horário. Mesmo que duas pessoas tentem no mesmo
segundo, o banco aceita só uma.

### Chat do prédio
Conversa em grupo entre moradores do mesmo bloco, com mensagens aparecendo
**em tempo real** (sem precisar atualizar a tela). O síndico escolhe qual bloco
quer acompanhar e participa de qualquer um.

### Mensagens diretas
Conversa privada entre um morador e o síndico ou a portaria. Como pode haver
vários porteiros, não é uma conversa pessoa-a-pessoa: é uma "caixa" por assunto,
onde qualquer porteiro de plantão pode responder.

### Botão de pânico
O morador segura o botão por 3 segundos (evita acionamento acidental) e a
portaria recebe o alerta. A portaria marca quando visualizou e quando atendeu.

### Outras
Achados e perdidos, pets, veículos e vagas (incluindo aluguel de vaga entre
moradores), assembleias online, enquetes com votação, financeiro (prestação de
contas e faturas), câmeras e controle de acesso.

---

## 7. O banco de dados

São **29 tabelas**. As principais:

| Tabela | Guarda |
|---|---|
| `profiles` | Nome, papel, apartamento e bloco de cada usuário |
| `comunicados` | Avisos publicados pelo síndico |
| `encomendas` | Pacotes, com status e código de entrega |
| `ocorrencias` | Problemas relatados por moradores e portaria |
| `ambientes` / `reservas_ambiente` | Espaços comuns e suas reservas |
| `mensagens_predio` | Chat em grupo por bloco |
| `mensagens_diretas` | Conversas com síndico/portaria |
| `veiculos` / `vagas` | Carros e vagas de garagem |
| `alertas_panico` | Acionamentos do botão de emergência |
| `faturas` / `lancamentos_financeiros` | Cobranças e contas do condomínio |

### Os arquivos de migração

A pasta `supabase/migrations/` tem os comandos SQL numerados, que devem ser
executados **em ordem**:

- **0001** — cria todas as tabelas
- **0002** — liga a segurança (RLS) e escreve as permissões
- **0003** — cria os espaços de armazenamento de arquivos (fotos, documentos)
- **0004** — dados iniciais opcionais (categorias financeiras, ambientes)
- **0005 a 0010** — ajustes feitos depois: e-mail no perfil, correções de
  segurança apontadas pelo Supabase, chat do prédio, mensagens diretas e a
  liberação do síndico no chat

O passo a passo para rodar tudo isso está em
[SUPABASE_SETUP.md](SUPABASE_SETUP.md).

---

## 8. Contas de teste

| Papel | E-mail | Senha |
|---|---|---|
| Síndico | `sindico@condominio.com` | `sindico123` |
| Porteiro | `porteiro@condominio.com` | `porteiro123` |
| Morador | `morador@condominio.com` | `morador123` |

O morador de teste está no Apto 101, Bloco A.

---

## 9. Como rodar o projeto

```bash
npm install          # instala as dependências (só na primeira vez)
npx expo start -c    # inicia o app; o -c limpa o cache
```

Depois é só ler o QR code com o app **Expo Go** no celular.

> **Atenção:** o projeto está no Expo SDK 56 de propósito. O SDK 57 chegou a
> ser instalado, mas o Expo Go ainda não dá suporte a ele nas lojas de
> aplicativos, o que impedia testar no celular.

---

## 10. Pontos que valem ser mencionados na apresentação

1. **A segurança está no banco, não na tela.** Esconder um botão é aparência;
   as regras de RLS é que realmente impedem acessos indevidos — e isso foi
   testado chamando a API por fora do app.

2. **Tempo real de verdade.** O chat usa a funcionalidade de *Realtime* do
   Supabase: quando alguém envia uma mensagem, ela aparece na tela das outras
   pessoas na hora, sem recarregar.

3. **Contas criadas pelo administrador.** Não há autocadastro, o que reflete
   como um condomínio funciona de verdade.

4. **Custo zero.** Todo o projeto roda dentro do plano gratuito do Supabase.

5. **Limitações conhecidas e assumidas:**
   - O reconhecimento facial de visitantes depende de um serviço externo que
     não faz parte deste projeto
   - As câmeras mostram um espaço reservado no lugar do vídeo, pois não há
     equipamento real conectado
   - Excluir um morador desativa a conta em vez de apagá-la, porque apagar um
     usuário exigiria uma chave secreta que nunca deve ficar dentro do app
