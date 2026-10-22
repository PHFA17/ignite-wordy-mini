# Wordy Mini — React + Firebase

Mini projeto **independente** baseado nas regras de jogo do Wordy do Ignite (`PHFA17/Ignite`), sem modificar o código, o banco, os deploys ou as configurações do aplicativo principal.

## O que funciona

- React + Vite, com login/cadastro por e-mail e senha e acesso com Google (Firebase Authentication).
- Ao entrar, o usuário acessa diretamente o Wordy.
- Desafio diário por idioma (Inglês, Espanhol e Francês); a mesma palavra do dia vale para usuários com o mesmo calendário local.
- Teclado de cinco letras embaralhadas, digitável por clique ou teclado físico, Backspace/Enter/Escape, letras reutilizáveis, acerto automático a partir da terceira letra, palavras que crescem a partir de outras (ex.: TEA → TEAR), acerto da senha, aviso de repetição e histórico.
- Aba **Palavras do dia** mostra quantas faltam e o tamanho de cada uma, sem revelar as respostas.
- Progresso por conta, idioma e data em **Cloud Firestore**, atualizado em tempo real e salvo com transações.
- Interface responsiva inspirada no Wordy original, simplificada para o mini projeto.

**Escopo:** o catálogo é uma seleção local de sete enigmas por idioma, baseado no modo reserva do Ignite. Não depende da API/MySQL, dos cursos da biblioteca nem do banco de usuários do Ignite principal. Portanto, não existe rotação administrativa global de palavras, energia ou integração de vocabulário com o Ignite.

## Configurar o Firebase (projeto novo, separado)

1. No [console do Firebase](https://console.firebase.google.com/), crie um projeto **novo** (por exemplo, `ignite-wordy-mini`); não use o Firebase ou banco do Ignite principal.
2. Adicione um aplicativo **Web** e copie a configuração do SDK.
3. Em **Authentication > Sign-in method**, habilite **E-mail/senha** e, se quiser o botão correspondente, **Google**. Em **Settings > Authorized domains**, adicione o domínio da sua hospedagem (e confira localhost para testes).
4. Em **Firestore Database**, crie o banco. Na aba **Rules**, publique o conteúdo de `firestore.rules`. Não mantenha regras públicas de teste.
5. Duplique `.env.example` com o nome `.env` e preencha os valores `VITE_FIREBASE_*` com os dados do aplicativo Web do novo projeto.

As chaves de SDK web (`VITE_FIREBASE_*`) são identificadores/configurações de cliente, **não** são credenciais administrativas. A segurança depende de Auth e das regras Firestore. Não coloque chaves de service account no frontend.

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

## Como publicar em repositório NOVO e privado

1. Crie um repositório **privado** vazio no GitHub chamado `ignite-wordy-mini` (não crie dentro do repositório `Ignite`).
2. Dentro desta pasta execute:

```bash
git init
git branch -M main
git add .
git commit -m "feat: Wordy Mini independente com React e Firebase"
git remote add origin https://github.com/PHFA17/ignite-wordy-mini.git
git push -u origin main
```

Nunca publique o `.env` (ele já está no `.gitignore`). Configure as mesmas variáveis de ambiente na hospedagem do mini projeto e faça deploy desse novo repositório, não do Ignite original.

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
