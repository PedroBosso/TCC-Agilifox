# Reconhecimento facial de visitantes: passo a passo

Este guia mostra como ligar o reconhecimento facial no Agilifox. O app já tem
as telas prontas (`src/app/cadastro.tsx` tira a foto do visitante e
`src/app/reconhecimento.tsx` abre a câmera para reconhecer), mas elas ainda
apontam para um servidor de exemplo que não existe.

## Antes de começar: o Google não reconhece rostos

As APIs de imagem do Google **detectam** rostos, mas não dizem **de quem** é o
rosto:

- **Cloud Vision API**: encontra rostos na foto, aponta olhos e boca e estima
  expressões. A própria documentação avisa que o reconhecimento de pessoas
  específicas não é suportado.
- **ML Kit**: faz a mesma detecção dentro do celular, e a documentação também
  avisa que ele não reconhece pessoas.

Para o Agilifox, o que precisamos é comparar o rosto que está na portaria com
os rostos já cadastrados. Isso se chama **busca facial**, e a API recomendada
para isso é o **Amazon Rekognition**, da AWS. É ela que este guia usa.

| Item | Como fica |
|---|---|
| Custo | Cerca de US$ 1 a cada mil fotos analisadas. Um TCC usa poucas centenas, então fica em centavos. Confira a página de preços da AWS antes |
| Cartão | A AWS pede cartão de crédito no cadastro. Contas novas costumam receber créditos ou uma faixa gratuita |
| Onde roda | Nos servidores da AWS. O app funciona em qualquer Wi-Fi, inclusive no dia da apresentação |

**Se você não puder usar cartão:** o CompreFace é um servidor de reconhecimento
facial gratuito e de código aberto, que roda no seu computador com Docker. Ele
funciona, mas o computador precisa ficar ligado e acessível pelo celular
durante a apresentação, o que é mais arriscado.

## Como vai funcionar

1. **Primeira visita:** o porteiro lê o QR code do visitante e, com a
   autorização do visitante, tira uma foto do rosto dele. O rosto é guardado
   na AWS, ligado ao cadastro do visitante no Supabase.
2. **Próximas visitas:** o porteiro aponta a câmera para o rosto. A AWS
   responde quem é, o app mostra o nome e o apartamento, e o porteiro libera.
3. **A chave da AWS nunca fica no app.** Ela fica guardada no Supabase, dentro
   de uma Edge Function (um pequeno código que roda no servidor do Supabase).
   O app chama a função, e só a função conversa com a AWS.

```
App do porteiro  --foto-->  Edge Function no Supabase  --foto-->  Amazon Rekognition
                                     |
                                     +--> tabela visitantes (nome e apartamento)
```

## Passo 1: criar a conta na AWS

1. Acesse aws.amazon.com e clique em **Criar uma conta da AWS**.
2. Preencha os dados e o cartão.
3. No console, abra **Billing and Cost Management**, depois **Budgets**, e
   crie um orçamento de US$ 1 com alerta por e-mail. Assim você é avisado se
   algum gasto aparecer.
4. No canto superior direito do console, escolha a região
   **US East (N. Virginia) us-east-1**. Use sempre essa região neste guia.

## Passo 2: criar um usuário só para o app

Nunca use a conta principal no app. Crie um usuário que só pode usar o
reconhecimento facial.

1. No console da AWS, abra **IAM**, depois **Users** e **Create user**.
2. Nome: `agilifox-rekognition`. Não marque acesso ao console.
3. Em permissões, escolha **Attach policies directly** e depois
   **Create policy**. Na aba **JSON**, cole:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:IndexFaces",
        "rekognition:SearchFacesByImage",
        "rekognition:DeleteFaces"
      ],
      "Resource": "arn:aws:rekognition:us-east-1:*:collection/agilifox-visitantes"
    }
  ]
}
```

4. Salve a política com o nome `AgilifoxRekognition`, volte à criação do
   usuário, marque essa política e conclua.
5. Abra o usuário criado, vá em **Security credentials** e clique em
   **Create access key**. Escolha **Application running outside AWS**.
6. Copie o **Access key ID** e o **Secret access key**. A chave secreta só
   aparece uma vez. Não coloque essas chaves no `.env` nem no código do app.

## Passo 3: criar a coleção de rostos

A coleção é a "pasta" da AWS onde ficam os rostos cadastrados.

1. No topo do console da AWS, clique no ícone **CloudShell** (um terminal que
   abre no navegador).
2. Rode:

```
aws rekognition create-collection --collection-id agilifox-visitantes --region us-east-1
```

3. A resposta deve ter `"StatusCode": 200`.

## Passo 4: preparar o banco

No Supabase, abra o **SQL Editor** e rode:

```sql
alter table public.visitantes add column if not exists face_id text;
alter table public.visitantes add column if not exists consentimento_em timestamptz;
```

- `face_id` guarda o código do rosto na AWS, para poder apagá-lo depois.
- `consentimento_em` guarda quando o visitante autorizou o uso da foto.

## Passo 5: guardar as chaves no Supabase

1. No painel do Supabase, abra **Edge Functions** e depois **Secrets**.
2. Crie três segredos:

| Nome | Valor |
|---|---|
| `AWS_ACCESS_KEY_ID` | o Access key ID do passo 2 |
| `AWS_SECRET_ACCESS_KEY` | o Secret access key do passo 2 |
| `AWS_REGION` | `us-east-1` |

## Passo 6: criar a Edge Function

1. No Supabase, abra **Edge Functions** e clique em **Deploy a new function**,
   opção **Via Editor**.
2. Nome da função: `reconhecimento-facial`.
3. Apague o código de exemplo, cole o código abaixo e clique em **Deploy**.

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AwsClient } from 'npm:aws4fetch@1';

const REGIAO = Deno.env.get('AWS_REGION') ?? 'us-east-1';
const COLECAO = 'agilifox-visitantes';
const SEMELHANCA_MINIMA = 90;

const aws = new AwsClient({
  accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
  secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
  region: REGIAO,
  service: 'rekognition',
});

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function responder(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// Chama uma operação do Rekognition, assinando o pedido com a chave da AWS.
async function rekognition(operacao: string, corpo: unknown) {
  const resposta = await aws.fetch(`https://rekognition.${REGIAO}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `RekognitionService.${operacao}`,
    },
    body: JSON.stringify(corpo),
  });
  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(String(dados.__type ?? 'ErroDesconhecido').split('#').pop());
  }
  return dados;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Usa o login de quem chamou, então as regras de RLS do banco continuam valendo.
  const cabecalhoLogin = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('CHAVE_PUBLICA') ?? '',
    { global: { headers: { Authorization: cabecalhoLogin } } }
  );

  const token = cabecalhoLogin.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return responder({ erro: 'Faça login novamente.' }, 401);

  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (perfil?.role !== 'porteiro' && perfil?.role !== 'sindico') {
    return responder({ erro: 'Apenas a portaria e o síndico usam o reconhecimento facial.' }, 403);
  }

  try {
    const { acao, visitanteId, fotoBase64 } = await req.json();

    if (acao === 'cadastrar') {
      if (!fotoBase64 || !visitanteId) return responder({ erro: 'Foto ou visitante não enviados.' }, 400);
      const resultado = await rekognition('IndexFaces', {
        CollectionId: COLECAO,
        Image: { Bytes: fotoBase64 },
        ExternalImageId: visitanteId,
        MaxFaces: 1,
        QualityFilter: 'AUTO',
      });
      const rosto = resultado.FaceRecords?.[0]?.Face;
      if (!rosto) {
        return responder({ erro: 'Nenhum rosto nítido na foto. Tire outra, de frente e com boa luz.' });
      }
      const { error } = await supabase.from('visitantes').update({ face_id: rosto.FaceId }).eq('id', visitanteId);
      if (error) return responder({ erro: 'Rosto guardado na AWS, mas não foi possível salvar no banco.' });
      return responder({ sucesso: true });
    }

    if (acao === 'reconhecer') {
      if (!fotoBase64) return responder({ erro: 'Foto não enviada.' }, 400);
      const resultado = await rekognition('SearchFacesByImage', {
        CollectionId: COLECAO,
        Image: { Bytes: fotoBase64 },
        FaceMatchThreshold: SEMELHANCA_MINIMA,
        MaxFaces: 1,
      });
      const melhor = resultado.FaceMatches?.[0];
      if (!melhor) return responder({ encontrado: false, mensagem: 'Este rosto não está cadastrado.' });

      const { data: visitante } = await supabase
        .from('visitantes')
        .select('id, nome, apartamento')
        .eq('id', melhor.Face.ExternalImageId)
        .maybeSingle();
      if (!visitante) return responder({ encontrado: false, mensagem: 'O visitante foi removido do sistema.' });

      return responder({ encontrado: true, visitante, confianca: melhor.Similarity / 100 });
    }

    if (acao === 'remover') {
      const { data: visitante } = await supabase.from('visitantes').select('face_id').eq('id', visitanteId).maybeSingle();
      if (visitante?.face_id) {
        await rekognition('DeleteFaces', { CollectionId: COLECAO, FaceIds: [visitante.face_id] });
      }
      return responder({ sucesso: true });
    }

    return responder({ erro: 'Ação inválida.' }, 400);
  } catch (erro) {
    const tipo = erro instanceof Error ? erro.message : String(erro);
    if (tipo === 'InvalidParameterException') {
      return responder({ encontrado: false, erro: 'Nenhum rosto encontrado na foto.', mensagem: 'Nenhum rosto encontrado na foto.' });
    }
    return responder({ erro: `Falha no reconhecimento (${tipo}).` }, 500);
  }
});
```

4. Nas configurações da função existe a opção de verificar o JWT (o login).
   Pode deixar ligada. Se a função responder 401 mesmo com o usuário logado,
   desligue essa opção: o código acima já confere quem chamou e o papel dele.

## Passo 7: ligar as telas do app

### 7.1 Botões na tela de Acessos do porteiro

Em `src/app/acesso.tsx`, logo abaixo do botão "Ler QR code do visitante",
adicione:

```tsx
<Pressable style={styles.btnLerQr} onPress={() => router.push('./reconhecimento')}>
  <Ionicons name="scan-outline" size={22} color="#ffffff" />
  <Text style={styles.btnLerQrText}>Reconhecer rosto do visitante</Text>
</Pressable>

<Pressable style={styles.btnLerQr} onPress={() => router.push('./cadastro')}>
  <Ionicons name="person-add-outline" size={22} color="#ffffff" />
  <Text style={styles.btnLerQrText}>Cadastrar rosto do visitante</Text>
</Pressable>
```

### 7.2 Cadastro do rosto com consentimento (`src/app/cadastro.tsx`)

1. Crie o estado do consentimento junto dos outros `useState`:

```tsx
const [consentiu, setConsentiu] = useState(false);
```

2. No formulário, antes do botão "Tirar foto do rosto", adicione a caixa de
   consentimento (importe `Ionicons` de `@expo/vector-icons`):

```tsx
<Pressable onPress={() => setConsentiu((v) => !v)} style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
  <Ionicons name={consentiu ? 'checkbox' : 'square-outline'} size={22} color="#e49c15" />
  <Text style={{ flex: 1, color: '#555' }}>
    O visitante autorizou o uso da foto do rosto para liberar a entrada no condomínio.
    A foto é processada pela Amazon (AWS), fora do Brasil, e pode ser apagada a pedido.
  </Text>
</Pressable>
```

3. No começo da função `abrirCamera`, bloqueie sem consentimento:

```tsx
if (!consentiu) {
  Alert.alert('Atenção', 'Marque a autorização do visitante antes de tirar a foto.');
  return;
}
```

4. Na função `salvar`, apague a linha do `getPublicUrl` (o bucket de fotos é
   privado, então esse endereço público não abre) e troque o `insert` em
   `visitantes`, até a linha `if (erroInsert) throw erroInsert;`, por este
   trecho. Ele guarda o caminho da foto, a data do consentimento e já cadastra
   o rosto na AWS:

```tsx
const { data: novoVisitante, error: erroInsert } = await supabase
  .from('visitantes')
  .insert({
    nome: nome.trim(),
    apartamento: apartamento.trim(),
    foto_url: caminho,
    criado_por: user.id,
    morador_id: null,
    consentimento_em: new Date().toISOString(),
  })
  .select('id')
  .single();

if (erroInsert) throw erroInsert;

const { data: resposta, error: erroRosto } = await supabase.functions.invoke('reconhecimento-facial', {
  body: { acao: 'cadastrar', visitanteId: novoVisitante.id, fotoBase64 },
});

if (erroRosto) throw erroRosto;
if (resposta?.erro) throw new Error(resposta.erro);
```

5. Em `CAMERA_CONFIG`, troque `QUALITY: 0.7` por `QUALITY: 0.5`. A AWS aceita
   fotos de até 5 MB, e a qualidade menor evita passar desse limite.

### 7.3 Reconhecimento (`src/app/reconhecimento.tsx`)

1. Troque o import do `faceService` por estes dois, mantendo só o tipo do
   resultado:

```tsx
import { ReconhecimentoResult } from '../../services/faceServices';
import { supabase } from '../lib/supabase';
```

2. Na função `reconhecer`, troque a linha que chama `faceService.reconhecerRosto`
   e a linha `setResultado(res)` por:

```tsx
const { data, error } = await supabase.functions.invoke('reconhecimento-facial', {
  body: { acao: 'reconhecer', fotoBase64: photo.base64 },
});
if (error) throw error;
setResultado(data);
```

3. Troque `quality: 0.7` por `quality: 0.5` na chamada `takePictureAsync`.

A tela de resultado já mostra nome, apartamento e o percentual de confiança,
porque a função devolve os dados no mesmo formato que a tela espera.

### 7.4 Liberar a entrada depois de reconhecer

Ainda em `reconhecimento.tsx`, crie esta função e um botão "Liberar entrada"
na tela de resultado, visível quando `resultado.encontrado` for verdadeiro:

```tsx
async function liberarEntrada() {
  if (!resultado?.visitante) return;
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('registros_acesso').insert({
    tipo_pessoa: 'visitante',
    nome: resultado.visitante.nome,
    apartamento: resultado.visitante.apartamento,
    direcao: 'entrada',
    status: 'liberado',
    liberado_por: user?.id,
    visitante_id: resultado.visitante.id,
  });
  if (error) {
    Alert.alert('Erro', 'Não foi possível registrar a entrada.');
    return;
  }
  Alert.alert('Entrada liberada', `${resultado.visitante.nome} pode entrar.`, [
    { text: 'OK', onPress: () => router.back() },
  ]);
}
```

## Passo 8: testar

1. Entre no app como porteiro e cadastre o seu próprio rosto como visitante.
2. Volte em Acessos e use "Reconhecer rosto do visitante" apontando para você.
   O app deve mostrar o seu nome.
3. Teste com outra pessoa que não foi cadastrada. O app deve dizer que o rosto
   não está cadastrado.
4. Confira em Acessos se a entrada liberada apareceu no histórico.

## LGPD: cuidados obrigatórios

- A foto do rosto usada para identificar uma pessoa é **dado biométrico**, que
  a LGPD trata como dado pessoal sensível (art. 5º, II).
- Para usar esse dado, é preciso o consentimento específico e destacado do
  visitante (art. 11, I). Por isso o guia pede a caixa de consentimento e
  guarda a data em `consentimento_em`.
- Use a foto só para liberar a entrada. Quando o visitante não precisar mais
  do cadastro, apague o rosto na AWS com a ação `remover` da função e apague a
  foto do Storage.
- O texto do consentimento deve avisar que a foto é processada pela Amazon,
  fora do Brasil.

## Problemas comuns

O código deste guia segue a documentação da AWS e do Supabase, mas não foi
executado contra uma conta real da AWS. Se algum passo falhar, a mensagem de
erro costuma indicar a causa:

| Erro | Causa provável |
|---|---|
| `401` ao chamar a função | Usuário deslogado, ou a verificação de JWT da função está recusando o login. Veja o item 4 do passo 6 |
| `supabaseKey is required` nos logs da função | O projeto não fornece `SUPABASE_ANON_KEY`. Crie o segredo `CHAVE_PUBLICA` com a mesma chave publishable do `.env` |
| `ResourceNotFoundException` | A coleção não foi criada, ou foi criada em outra região. Refaça o passo 3 em us-east-1 |
| `AccessDeniedException` ou `UnrecognizedClientException` | Chave da AWS errada nos segredos, ou a política do passo 2 não foi ligada ao usuário |
| "Nenhum rosto encontrado na foto" | Rosto de lado, escuro ou muito longe. Tire a foto de frente e com luz |
| `ImageTooLargeException` | Foto acima de 5 MB. Reduza a qualidade, como no passo 7 |

Os logs de cada chamada aparecem no Supabase, em **Edge Functions**, na função
`reconhecimento-facial`, aba **Logs**.
