# Wordy Mini — React + Firebase

Mini projeto **independente** baseado nas regras de jogo do Wordy do Ignite (`PHFA17/Ignite`), sem modificar o código, o banco, os deploys ou as configurações do aplicativo principal.

## O que funciona

- React + Vite, com login/cadastro por e-mail e senha e acesso com Google (Firebase Authentication).
- Ao entrar, o usuário acessa diretamente o Wordy.
- Desafio diário por idioma (Inglês, Espanhol e Francês), alimentado pelo catálogo individual salvo no Firestore.
- Teclado de cinco letras embaralhadas, digitável por clique ou teclado físico, Backspace/Enter/Escape, letras reutilizáveis, acerto automático a partir da terceira letra, palavras que crescem a partir de outras (ex.: TEA → TEAR), acerto da senha, aviso de repetição e histórico.
- Aba **Palavras do dia** mostra quantas faltam e o tamanho de cada uma, sem revelar as respostas.
- Progresso por conta, idioma e data em **Cloud Firestore**, atualizado em tempo real e salvo com transações.
- Interface responsiva inspirada no Wordy original, simplificada para o mini projeto.

**Escopo:** o catálogo inicial contém **15 senhas por idioma** (45 no total), com suas palavras aceitas, e é salvo automaticamente em `users/{uid}/wordyCatalog/{courseId}` no primeiro login. Uma lista local de reserva só é usada caso o catálogo do Firestore ainda não esteja disponível. Não depende da API/MySQL, dos cursos da biblioteca nem do banco de usuários do Ignite principal. Portanto, não existe rotação administrativa global de palavras, energia ou integração de vocabulário com o Ignite.

## Firebase integrado — Wordy Mini

A configuração **pública** do SDK Firebase já está em `src/lib/firebase.js` para o projeto **ignite-wordy-mini**. Não são necessárias variáveis de ambiente na Vercel. Não há acesso ao banco do Ignite original.

Para concluir a configuração do backend no [Firebase Console](https://console.firebase.google.com/project/ignite-wordy-mini/overview):

1. Ativar **Authentication → Sign-in method → E-mail/senha** e **Google** (o Google pode pedir o e-mail de suporte).
2. Criar **Firestore Database** na edição Standard e no **modo de produção**.
3. Em **Firestore Database → Regras**, publicar **a versão atualizada** de `firestore.rules` (contém permissões de `wordyCatalog` e `puzzleWord`). Sem esse passo, a importação não funciona. Não use regras abertas nem modo de testes.
4. Após publicar na Vercel, inserir o domínio final (ex. `ignite-wordy-mini.vercel.app`) em **Authentication → Settings → Authorized domains**.

No primeiro acesso, o aplicativo cria automaticamente os três documentos privados do catálogo, um por idioma, com 15 desafios em cada um. Abra **Catálogo Firebase** (abaixo do histórico) para reimportar o catálogo padrão, baixar um JSON ou importar um JSON editado. O arquivo deve ter três arrays com exatamente 15 objetos `{mainWord, validWords}` cada (aceita também o formato `{courses: {english, spanish, french}}`). O importador valida estrutura, comprimento de palavras e letras disponíveis antes de gravar os três documentos juntos. A seleção lexical foi curada manualmente; para aplicação formal de vocabulário, recomenda-se revisão por falantes e dicionários.

**Privacidade:** o catálogo é **por conta**. Todos recebem inicialmente os mesmos 45 desafios; edições de uma conta não mudam o catálogo de outras. O Firestore cria os documentos de progresso automaticamente quando houver acertos. O acesso é restrito pelo UID da sessão, segundo as regras. A chave Web `apiKey` é pública e não concede privilégio administrativo. Não insira chaves de conta de serviço no frontend.

## Rodar

Requer Node.js 20.19+.

```bash
npm install
npm run dev
```

Teste da lógica:

```bash
npm test
```

Build de produção:

```bash
npm run build
```

## Publicar na Vercel

Na Vercel: **Add New → Project → Import Git Repository** → `PHFA17/ignite-wordy-mini`, framework **Vite**, comando `npm run build`, diretório `dist`. Não é necessário configurar variáveis de ambiente. Depois, autorize o novo domínio Vercel no Authentication do Firebase.

Este repositório é separado de `PHFA17/Ignite`. O Ignite principal não deve ser alterado.

## Estrutura no Firestore

```text
users/{uid}/wordyProgress/{courseId}_{YYYY-MM-DD}
  courseId: "english"
  dateKey: "2026-10-22"
  foundWords: ["TEA", "TEAR"]
  mainFound: true
  updatedAt: Timestamp
```

O Firebase Authentication gerencia contas e sessões. O Cloud Firestore gerencia as conquistas por usuário; as regras verificam `request.auth.uid == uid`, impedindo leitura e alteração de outros usuários.


## Como confirmar o deploy

A API do GitHub pode mostrar o status **Vercel: success** num commit, mas a versão de produção vista no navegador ainda depende de o domínio estar apontando para esse deploy. Em [Vercel → Deployments](https://vercel.com/dashboard), confirme que o commit novo está como **Ready** e foi promovido a **Production**. Se necessário, use **Create Deployment** para a branch `main`. Atualize o navegador com Ctrl+Shift+R depois. O GitHub é atualizado sem tocar em `PHFA17/Ignite`.
