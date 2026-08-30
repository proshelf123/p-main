# AGENTS.md — ProShelf

> Guia de referência para agentes de IA que trabalham neste repositório.
> Leia este arquivo antes de fazer qualquer alteração no código.

---

## 1. Visão Geral do Projeto

**ProShelf** é uma plataforma de gestão pedagógica para escolas técnicas, desenvolvida como TCC. Permite que professores e coordenadores gerenciem turmas, cronogramas, arquivos, calendário, notas e frequência dos alunos.

- **Stack**: React 19 + Vite 8 + Firebase 12 (Auth, Firestore, Storage, App Check, Functions)
- **Roteamento**: React Router v7 (`react-router`, não `react-router-dom` nos imports internos)
- **Animações**: Framer Motion 12
- **Ícones**: Lucide React
- **CSS**: Puro (sem CSS-in-JS, sem Tailwind em uso real; Tailwind está instalado mas não é utilizado)
- **Deploy**: Firebase Hosting + Cloud Functions (Node 20)

### Comandos essenciais

```bash
npm run dev       # Inicia o servidor de desenvolvimento (Vite)
npm run build     # Gera o build de produção em /dist
npm run preview   # Pré-visualiza o build localmente
npm run lint      # Executa o ESLint
```

---

## 2. Estrutura de Pastas

```
src/
├── admin-geral/          # Painel do super-admin do ProShelf (não é o coordenador)
├── assets/               # Imagens e ícones estáticos (.png, .webp)
├── cadastrar-escola/     # Fluxo de cadastro de nova escola (público)
├── componentes/          # Componentes genéricos reutilizáveis (ex: ColorPickerDisciplina)
├── coordenador/          # Seções exclusivas do papel "coordenador"
│   ├── Boletins.jsx
│   ├── CadastroProfessores.jsx
│   ├── ConfiguracoesEscola.jsx
│   ├── CoresDisciplinas.jsx
│   ├── GerenciarCoordenadores.jsx
│   ├── ModalNovaTurmaUnificada.jsx
│   ├── ProfessoresDisciplinas.jsx
│   ├── TurmaAlunos.jsx
│   └── coordenador.css
├── dashboard/            # Shell do dashboard logado
│   ├── dashboard.jsx     # Componente raiz: header, nav, roteamento de seções
│   ├── dashboard.css     # CSS do dashboard + design system (variáveis CSS)
│   ├── Bem-vindo.jsx     # Tela inicial (home) do dashboard
│   └── Bem-vindo.css
├── esqueci-senha/        # Recuperação de senha (público)
├── firebase/
│   └── estrutura.js      # TODA a camada de dados: funções CRUD do Firestore + Storage
├── firebase.js           # Inicialização do Firebase (auth, db, storage, functions)
├── global.css            # Variáveis CSS globais e reset mínimo
├── hooks/
│   └── useCoresDisciplinas.js  # Hook que escuta as cores das disciplinas em tempo real
├── inicio-celular/       # Landing page mobile (< 768px)
├── login/
│   ├── login.jsx / login.module.css      # Login desktop
│   └── loginMobile.jsx / loginMobile.module.css  # Login mobile
├── main.jsx              # Ponto de entrada: roteamento, detecção mobile/desktop
├── notificacoes/         # Sistema de notificações (sino + toasts)
├── paginas/
│   ├── inicio.jsx        # Landing page desktop (>= 769px)
│   └── inicio.module.css
├── perfil/               # Modal de edição de perfil do usuário
├── primeiro-acesso/      # Tela de definição de senha no primeiro login
├── registro/             # Registro de professor via convite
├── secoes/               # Seções do dashboard (conteúdo principal)
│   ├── Arquivos.jsx          # Lista de turmas/arquivos por período
│   ├── Calendario.jsx        # Calendário de eventos
│   ├── Cronogramas.jsx       # Visualização e edição de grade horária
│   ├── Turmas.jsx            # Lista de turmas + registros de aula
│   ├── TurmaArquivos.jsx     # Arquivos de uma turma específica
│   ├── TurmaAvaliacoes.jsx   # Avaliações e notas por turma
│   ├── TurmaPresenca.jsx     # Controle de frequência
│   ├── TurmasNotas.jsx       # Notas consolidadas
│   ├── config.jsx            # Configurações do usuário (tema, fonte)
│   ├── coresDisciplinas.js   # Helpers para cores de disciplinas
│   ├── vinculosDisciplinas.js # Helpers para vínculos professor-disciplina
│   ├── DropwdownComPortal.jsx # Dropdown via React Portal (evita overflow)
│   ├── dropdown-calendario.jsx # Date picker customizado
│   └── secoes.css            # CSS de todos os componentes do dashboard
├── tema.js               # Helpers para dark/light mode
└── transicao-de-paginas.jsx/ # Componente de transição entre rotas
```

---

## 3. Arquitetura Multi-Tenant

> **CRÍTICO**: Este é o aspecto mais importante do sistema. Toda leitura/escrita no Firestore deve respeitar o isolamento por escola.

### Como funciona

Cada usuário pertence a uma **escola** (`escolaId`). Todos os dados são filtrados por `escolaId`.

```
users/{uid}
  └── escolaId: "escola_abc123"   ← identificador da escola
```

### Função central: `getEscolaId(uid)`

Localizada em `src/firebase/estrutura.js`. **Sempre use esta função** antes de qualquer query ao Firestore.

```js
// CORRETO — respeita o tenant
const escolaId = await getEscolaId(uid)
const q = query(collection(db, 'turmas', uid, 'lista'), where('escolaId', '==', escolaId))

// ERRADO — vaza dados entre escolas
const snap = await getDocs(collection(db, 'turmas', uid, 'lista'))
```

A função tem cache em memória (`_escolaIdCache`) para evitar leituras duplicadas no Firestore.

---

## 4. Modelo de Dados Firestore

### Coleções Principais

| Coleção | Descrição |
|---------|-----------|
| `users/{uid}` | Perfil do usuário (nome, role, escolaId, darkMode, etc.) |
| `turmas/{uid}/lista/{turmaId}` | Turmas criadas/gerenciadas pelo uid |
| `turmas/{uid}/lista/{turmaId}/registros` | Registros de aula de uma turma |
| `turmas/{uid}/lista/{turmaId}/presencas/{data}` | Frequência por data |
| `turmas/{uid}/lista/{turmaId}/notas/{alunoId}` | Notas dos alunos |
| `turmas/{uid}/lista/{turmaId}/avaliacoes` | Avaliações cadastradas |
| `cronogramas/{uid}/aulas` | Cronograma pessoal (legado) |
| `cronogramas_escola/{docId}/aulas` | Cronograma da escola (atual, compartilhado) |
| `eventos_escola` | Eventos compartilhados com professores |
| `calendario/{uid}/eventos` | Eventos pessoais do professor |
| `turmas_arquivos_aprovados` | Arquivos aprovados pela coordenação |
| `turmas_periodo` | Mapeamento período → turmas (para seção Arquivos) |
| `salas/{escolaId}/lista/{nomeSala}/alunos` | Alunos por sala |
| `configuracoes_escola/{escolaId}_cores_disciplinas` | Cores das disciplinas |
| `configuracoes_escola/{escolaId}_professores_disciplinas` | Vínculos professor-disciplina |
| `configuracoes_escola/{escolaId}_parametros` | Configurações gerais da escola |
| `professores_escola/{docId}` | Índice de professores por e-mail (para Cloud Functions) |
| `escolas/{escolaId}` | Cadastro de escolas pendentes/aprovadas (admin geral) |
| `admins/{adminId}` | Usuários com role de admin geral |

### Padrão `ownerUid`

Documentos em subcoleções de `turmas/{uid}` incluem `ownerUid` para que as Firestore Security Rules possam validar o criador original, mesmo quando um coordenador grava dados em nome de um professor.

---

## 5. Roles e Permissões

O campo `role` no documento `users/{uid}` controla o acesso:

| Role | Acesso |
|------|--------|
| `professor` | Gerencia suas próprias turmas, vê cronograma da escola, arquivos, calendário |
| `coordenador` | Tudo do professor + gerencia professores, alunos, turmas de todos, boletins, configurações da escola |
| `admin` (custom claim) | Super-admin do ProShelf: aprova escolas, gerencia todo o sistema |

### Verificação de role no frontend

```jsx
// No dashboard.jsx
const eCoordenador = professor?.role === 'coordenador'

// Em componentes
const isCoordenador = professor?.role === 'coordenador'
```

### Lógica especial para Turmas (professor vê turmas onde é vinculado)

Professores veem: turmas que criaram + turmas onde foram vinculados via `professorId`.
Coordenadores veem: todas as turmas da escola (via `escolaId`).

---

## 6. Roteamento e Detecção Mobile/Desktop

O arquivo `src/main.jsx` controla tudo:

- **`isMobile`** = `window.innerWidth <= 768`
- Rotas `/` e `/login` renderizam componentes diferentes para mobile e desktop
- Todas as rotas são lazy-loaded para performance

```
/                → InicioCelular (mobile) | Inicio (desktop)
/login           → LoginCelular (mobile) | Login (desktop)
/dashboard       → Dashboard (único para todos os tamanhos)
/esqueci-senha   → EsqueciSenha
/cadastrar-escola → CadastrarEscola
/registro        → Registro
/primeiro-acesso → PrimeiroAcesso
/admin-proshelf  → AdminGeral (super-admin, sem PageTransition)
```

---

## 7. Dashboard: Navegação por Seções

O `dashboard.jsx` é uma **Single Page Application dentro da rota `/dashboard`**. Não há sub-rotas. A navegação é feita por estado React:

```js
const [secaoAtiva, setSecaoAtiva] = useState('Início')
```

### Seções do Professor
`Início`, `Cronogramas`, `Turmas`, `Arquivos`, `Calendário`

### Seções do Coordenador (dropdown "Coordenador" no nav)
`Professores`, `Alunos`, `Gerenciar Coordenadores`, `Cores`, `Disciplinas`, `Config. da Escola`, `Boletins`

---

## 8. Sistema de Temas (Dark/Light Mode)

Gerenciado pelo arquivo `src/tema.js`.

- O tema escuro é aplicado adicionando a classe `dark-mode` no `document.documentElement` (`:root`)
- A preferência é salva no Firestore (`users/{uid}.darkMode`) E no `localStorage` como cache local
- CSS usa o seletor `:root.dark-mode .componente` para estilização no modo escuro

```js
aplicarTemaEscuro(true)  // adiciona class 'dark-mode' no :root
removerTemaVisual()      // remove ao fazer logout
```

---

## 9. Convenções CSS

### Variáveis CSS globais (definidas em `dashboard.css`)

```css
--roxo: #6f3b9d
--roxo-claro: #eeedfe
--roxo-medio: #afa9ec
--laranja: #ff9d00
--bg: #f8f7fc
--branco: #ffffff
--texto: #1a1a1a
--texto-sec: #666
--borda: #e8e4f0
```

### Arquivos CSS e seus escopos

| Arquivo | Escopo |
|---------|--------|
| `global.css` | Reset mínimo, variáveis de cor globais |
| `dashboard.css` | Header, nav, layout do dashboard, grids, dark mode base |
| `secoes.css` | TODOS os componentes dentro das seções (turmas, cronogramas, modais, calendário, arquivos) |
| `coordenador.css` | Componentes exclusivos do coordenador |
| `*.module.css` | CSS Modules para páginas públicas (login, início) |

### Breakpoints do projeto

```
480px   → celulares pequenos
768px   → tablets (ponto de corte mobile/desktop no main.jsx)
900px   → tablets grandes / notebooks pequenos
1024px  → notebooks
```

### Regras importantes de CSS

1. **Não use `!important` exceto** para blindar elementos de regras genéricas problemáticas
2. **Prefira `min-width: 0`** em filhos de `display: grid` para evitar overflow
3. **Sempre use `box-sizing: border-box`** em elementos novos
4. **A regra `.turma-arquivos-pagina button:last-child { width: 100% }`** em `secoes.css` é um seletor genérico perigoso — novos botões nessa área precisam de proteção com classe específica
5. **`secoes.css` tem media queries duplicadas** para alguns breakpoints — ao adicionar novas regras, verifique se já existe um bloco para aquele breakpoint antes de criar outro

---

## 10. Padrões de Componentes

### Componentes de seção recebem sempre: `uid` e `professor`

```jsx
// Padrão universal
<MinhaSecao uid={uid} professor={professor} />

// professor tem shape:
{
  id: string,
  uid: string,
  nome: string,
  email: string,
  role: 'professor' | 'coordenador',
  escolaId: string,
  darkMode: boolean,
  nomeUsuario: string,
  instituicao: string,
  modalidade: string,
}
```

### Modais de confirmação

Todo modal de confirmação segue o padrão com overlay + card, usando as classes `.modal-confirmar-overlay` e `.modal-confirmar` do `secoes.css`.

### Dropdowns com Portal

Use `DropwdownComPortal` (atenção: o arquivo tem typo "Drowdown") para dropdowns dentro de modais ou containers com `overflow: hidden`. Ele renderiza o menu via `ReactDOM.createPortal` diretamente no `body`.

---

## 11. Hooks Customizados

### `useCoresDisciplinas()`

```js
// src/hooks/useCoresDisciplinas.js
const coresDisciplinas = useCoresDisciplinas()
// Retorna: { [chave]: { nome: string, cor: string } }
// Escuta em tempo real via onSnapshot
```

### `useNotificacoes(uid)`

```js
const { notificacoes } = useNotificacoes(uid)
// Escuta notificações em tempo real para o usuário
```

---

## 12. Cronogramas — Lógica de Dados

O cronograma é complexo e tem dois formatos:

1. **Legado** (`cronogramas/{uid}/aulas`): cronograma pessoal do professor
2. **Atual** (`cronogramas_escola/{docId}/aulas`): cronograma da escola, compartilhado

O ID do documento em `cronogramas_escola` é gerado como:

```js
idSeguroCronograma(`${escolaId}_${nomeTurma}`)
// Normaliza: remove acentos, espaços → underscores, caracteres especiais → hífens, uppercase
```

### Filtro de cronograma por professor

```js
filtrarCronogramaDoProfessor(aulas, perfil)
// Compara o campo `professor` da aula com nome/nomeUsuario/email do perfil
// Insensível a acentos e maiúsculas/minúsculas
```

### `buscarProximasAulasDoProfessor`

Retorna **todas** as aulas do dia mais próximo (não só a primeira). Coordenadores recebem todos os cronogramas; professores recebem apenas as suas aulas filtradas.

---

## 13. Sistema de Notificações

### Criar notificações

```js
// Para usuários específicos:
await criarNotificacao({
  titulo, mensagem, tipo, link,
  destinatarioUids: ['uid1', 'uid2'],
  criadoPorUid, criadoPorNome
})

// Para todos de um role (ex: todos os professores da escola):
await criarNotificacaoPorRole({
  role: 'professor',
  titulo, mensagem, tipo, link,
  criadoPorUid, criadoPorNome
})
```

---

## 14. Arquivos de Turma — Fluxo de Aprovação

```
Professor  → criarSolicitacaoArquivo()   → fila de aprovação
Coordenador → aprovarEAdicionarArquivo() → turmas_arquivos_aprovados
            → recusarSolicitacaoArquivo() → rejeição
Coordenador → enviarArquivoTurma()        → turmas_arquivos_aprovados (direto)
```

**Tipos suportados**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, RAR, imagens (JPG, PNG, GIF, WEBP, BMP, SVG, HEIC, HEIF).
**Limite de tamanho**: 10MB.

---

## 15. Cloud Functions (Node 20)

Localizadas em `functions/index.js`. Deploy: `firebase deploy --only functions`.

### Funções Callable (client-side via `httpsCallable`)

| Função | Descrição | Permissão |
|--------|-----------|-----------|
| `criarProfessor` | Cria professor no Auth + Firestore com `escolaId` do coordenador | Coordenador |
| `deletarProfessor` | Remove professor do Auth + Firestore | Coordenador |
| `criarNotificacaoPorRole` | Envia notificação para todos usuários de um role | Autenticado |
| `aprovarEscola` | Aprova escola pendente, cria coordenador no Auth | Admin Geral |
| `loginComLimite` | Login com rate limiting por IP + App Check | Público (com App Check) |

### Trigger Firestore

| Trigger | Descrição |
|---------|-----------|
| `syncUserRole` | `onDocumentWritten` em `users/{userId}` — sincroniza `role` e `escolaId` para **Custom Claims** do Firebase Auth (JWT). Isso permite que as Security Rules usem `request.auth.token.role` e `request.auth.token.escolaId` sem `get()` |

### Segredos (Secret Manager)

- `IDENTITY_TOOLKIT_API_KEY` — Chave da API do Identity Toolkit (para `loginComLimite` validar senha via REST)
- Configure no console: `firebase functions:secrets:set IDENTITY_TOOLKIT_API_KEY`

### Rate Limiting de Login

- `loginComLimite` implementa rate limiting por IP (máx 20 tentativas / 15 min) armazenado em `_loginAttempts/{ip}` no banco padrão
- Usa `fetch` nativo (Node 18+) para chamar `signInWithPassword` do Identity Toolkit
- Retorna `customToken` que o frontend troca por ID token via `signInWithCustomToken`

### CORS

Configurado para aceitar: `localhost`, `127.0.0.1`, `proshelf-8ecfd.web.app`, `proshelf-8ecfd.firebaseapp.com`, `proshelf.web.app`, `proshelf.firebaseapp.com`.

---

## 16. Firestore Security Rules — Pontos Críticos

Arquivo: `firestore.rules`

- **Roles via Custom Claims**: `request.auth.token.role` e `request.auth.token.escolaId` são populados pelo trigger `syncUserRole`. Isso evita leituras de `get()` nas rules.
- **Isolamento por escola**: Todas as rules de leitura/escrita verificam `escolaId` ou `ownerUid`
- **`ownerUid` denormalizado**: Subcoleções de `turmas/` gravam `ownerUid` (o `auth.currentUser.uid` de quem criou) para que coordenadores possam escrever em nome de professores sem quebrar as rules
- **`eCoordenador()`** usa `request.auth.token.role == "coordenador"` — não faz leitura no banco

---

## 17. Coisas que NÃO fazer

1. **Não importe de `react-router-dom`** nos componentes — use `react-router`
2. **Não escreva queries no Firestore sem `where('escolaId', '==', escolaId)`** — viola o isolamento multi-tenant
3. **Não adicione classes Tailwind** — o projeto não usa Tailwind no CSS
4. **Não crie rotas novas em `main.jsx` sem lazy import** — todas as páginas devem ser carregadas sob demanda
5. **Não remova o campo `ownerUid`** dos documentos de subcoleções em `turmas/` — as Security Rules dependem disso
6. **Não use `height: 100vh`** em containers que precisam de scroll — prefira `min-height: 100vh`
7. **Não use `position: absolute` com valores hardcoded de pixels** para elementos que precisam funcionar em múltiplas resoluções
8. **Não faça `get()` nas Security Rules** — use Custom Claims (`request.auth.token.role`, `request.auth.token.escolaId`)
9. **Não commite o `.env`** — já está no `.gitignore`

---

## 18. Boas Práticas do Projeto

1. **Feedback visual imediato**: toda ação assíncrona deve ter estado de `salvando`, `carregando` ou similar
2. **Modais de confirmação** para toda ação destrutiva (deletar turma, remover professor, etc.)
3. **`wordBreak: 'break-word'` + `minWidth: 0`** em células de grid para evitar overflow com textos longos
4. **Animações com Framer Motion**: use `AnimatePresence` para montar/desmontar e `motion.div` para transições suaves
5. **`onSnapshot` com cleanup**: todo listener do Firestore deve retornar o `unsubscribe` e ser limpo no `useEffect` cleanup
6. **Cores de disciplinas**: nunca hardcode cores de matérias. Use `montarCoresDisciplina(disciplina, coresDisciplinas)` de `src/secoes/coresDisciplinas.js`
7. **Variáveis CSS**: use `var(--roxo)`, `var(--texto)`, `var(--branco)`, etc. para garantir compatibilidade com dark mode
8. **Lazy loading**: todas as rotas em `main.jsx` usam `lazy()` + `Suspense`

---

## 19. App Check e Variáveis de Ambiente

O Firebase App Check está configurado com reCAPTCHA v3.

- Em desenvolvimento: debug token ativado automaticamente (`FIREBASE_APPCHECK_DEBUG_TOKEN = true`)
- A chave do reCAPTCHA é lida de `VITE_RECAPTCHA_SITE_KEY` no `.env`
- **Nunca comite o `.env`** (já está no `.gitignore`)

---

## 20. Checklist antes de modificar o código

- [ ] Toda nova query no Firestore usa `getEscolaId(uid)` e filtra por `escolaId`
- [ ] Novos componentes de seção aceitam `uid` e `professor` como props
- [ ] Modais de confirmação existem para ações destrutivas
- [ ] CSS responsivo cobre pelo menos os breakpoints 480px, 768px e 1024px
- [ ] Listeners do Firestore têm cleanup no `useEffect`
- [ ] `npm run build` executa sem erros
- [ ] O tema escuro funciona no componente novo (use as variáveis CSS `var(--texto)`, `var(--branco)`, etc.)
- [ ] Se adicionou Cloud Function: testou localmente com `firebase emulators:start` e fez deploy
- [ ] Se alterou Security Rules: validou que `request.auth.token.role` e `escolaId` funcionam (via Custom Claims)