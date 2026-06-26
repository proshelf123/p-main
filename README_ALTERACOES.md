# ProShelf - Alteracoes e pendencias

Atualizado em: 2026-06-26

## Problemas investigados

- O dashboard mostrava cronogramas para o professor, mas a pagina Cronogramas dizia que nao havia horario.
- O console mostrava `FirebaseError: Missing or insufficient permissions` ao carregar Turmas.
- O cadastro de professores havia apresentado bloqueio de CORS ao chamar Cloud Functions.

## Alteracoes feitas

### Cronogramas

- `src/secoes/Cronogramas.jsx` voltou a usar `buscarCronograma(uid, professor)`, o mesmo helper usado no dashboard.
- A pagina deixou de buscar aulas diretamente por nome da turma em `cronogramas_escola/{nomeTurma}/aulas`.
- A pagina agora usa o caminho correto para professor, incluindo `cronogramas_escola/{nomePDF}/aulas`.
- Quando existem aulas, a aba abre no primeiro dia com aula caso o dia atual esteja vazio.
- `src/dashboard/dashboard.jsx` agora passa os cronogramas ja carregados para a aba Cronogramas, evitando mostrar carregamento e refazer a busca sempre que o usuario sai e volta para a aba.

### Turmas e permissoes

- `firestore.rules` agora permite que o professor leia turmas vinculadas quando `professorId == request.auth.uid`.
- `firestore.rules` tambem permite que o professor leia registros de uma turma vinculada.
- `src/secoes/Turmas.jsx` agora trata erros de permissao com mensagem na tela, evitando `Uncaught (in promise)` no console.

### Cadastro de professores / Cloud Functions

- `functions/index.js` passou a responder `OPTIONS` nas rotas HTTP com cabecalhos CORS.
- `src/coordenador/CadastroProfessores.jsx` tenta a callable normal primeiro e usa rota HTTP autenticada como fallback.

## O que ainda precisa fazer

- Publicar as regras do Firestore para o erro de permissao sumir no ambiente real:

```powershell
npx.cmd firebase deploy --only firestore:rules
```

- Publicar as Cloud Functions para a correcao de CORS valer em `cloudfunctions.net`:

```powershell
npx.cmd firebase deploy --only functions
```

- Testar com um professor real:
  - abrir Home e conferir os cronogramas;
  - abrir Cronogramas e conferir se aparecem as aulas;
  - abrir Turmas e conferir se a turma vinculada aparece sem erro de permissao;
  - abrir uma turma e conferir se os registros carregam.

- Se algum cronograma antigo ainda nao aparecer, conferir se o professor tem `nomePDF` igual ao nome do PDF e se as aulas foram salvas em `cronogramas_escola/{nomePDF}/aulas`.

## Validacao local

- Banco Firestore verificado via CLI: `(default)` e `firestoreproshelf` existem como `STANDARD / FIRESTORE_NATIVE`.
- Rodar antes de entregar:

```powershell
npm.cmd run build
```
