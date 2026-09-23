# Checklist para o dia da apresentação

O que falta no repositório (porque não vai para o GitHub) e o que conferir
antes de apresentar.

---

## O mais importante: acordar o Supabase

**Projetos no plano gratuito do Supabase pausam automaticamente após cerca de
uma semana sem uso.** Se você não mexer no banco entre hoje e a apresentação,
ele vai estar dormindo — e o aplicativo simplesmente não conecta.

**Faça isso na véspera E no dia:**

1. Acesse [supabase.com](https://supabase.com) e abra o projeto
2. Se aparecer aviso de projeto pausado, clique em **Restore** / **Unpause**
3. Aguarde ficar ativo (1–2 minutos)
4. Abra o aplicativo e faça login para confirmar que responde

Nenhum dado é perdido quando pausa — mas religar leva alguns minutos, tempo
que você não tem na hora da banca.

---

## Se for apresentar pelo APK instalado

**Não precisa de nada do repositório.** O APK é autossuficiente: já tem as
credenciais do Supabase embutidas e não depende do computador.

Só precisa de:
- Supabase ativo (ver acima)
- Internet no celular

APK atual:
https://expo.dev/artifacts/eas/b0zIBccPsu6TIIwek7wavFnNivKPwcsfvDZ6wuKZ4Zw.apk

> Dica: baixe e instale o APK com antecedência, e deixe salvo também num
> pendrive ou no Drive. Não conte com o Wi-Fi da instituição para baixar
> na hora.

---

## Se for rodar pelo código (Expo Go ou computador)

Ao clonar o repositório numa máquina nova, falta apenas **um arquivo**: o `.env`.

### 1. Criar o arquivo `.env` na raiz do projeto

```
EXPO_PUBLIC_SUPABASE_URL=https://ieofiwikgaknpshhlfyg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_liSPiqOZhBo1_GQR4TMDUQ_YbwREOot
```

Sem ele, o app trava logo na abertura com erro de configuração do Supabase.
O modelo está em `.env.example`.

### 2. Instalar as dependências

```bash
npm install
npx expo start -c
```

Isso recria a pasta `node_modules/`, que também não vai para o GitHub (são
milhares de arquivos, reinstalados a partir do `package.json`).

### 3. Requisito da máquina

Node.js **20.19.4+**, **22.13+**, **24.3+** ou **25+**. Versões mais antigas
não rodam o Expo SDK 56.

---

## Resumo do que o GitHub não leva

| Item | Precisa recriar? | Como |
|---|---|---|
| `.env` | **Sim** | Copiar o conteúdo acima |
| `node_modules/` | Não (automático) | `npm install` |
| `.expo/` | Não | Gerado ao rodar |
| `expo-env.d.ts` | Não | Gerado ao rodar |
| `/android`, `/ios` | Não | Não usamos (compilação é na nuvem) |

Ou seja: **só o `.env` exige ação manual.** O resto se resolve com
`npm install`.

---

## Contas de teste

| Papel | E-mail | Senha |
|---|---|---|
| Síndico | `sindico@condominio.com` | `sindico123` |
| Porteiro | `porteiro@condominio.com` | `porteiro123` |
| Morador | `morador@condominio.com` | `morador123` |

O morador de teste está no **Apto 101, Bloco A**.

> Para demonstrar o chat em tempo real com dois aparelhos, você precisa de um
> segundo morador **no mesmo bloco** (Bloco A). Crie pela tela "Cadastrar
> morador", logado como síndico — e faça isso antes da apresentação, não na
> hora.

---

## Ensaio recomendado na véspera

1. Acordar o Supabase
2. Abrir o app e logar com os três papéis
3. Testar o roteiro que você vai mostrar (chat, encomendas, ocorrências)
4. Conferir se o celular tem bateria e internet
