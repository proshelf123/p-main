const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp, getApps } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { FieldValue, getFirestore } = require('firebase-admin/firestore')

if (!getApps().length) initializeApp()

const FIRESTORE_DATABASE_ID = 'firestoreproshelf'
const CAMPOS_ROLE = ['role', 'perfil', 'tipo', 'cargo', 'papel']
const CORS_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/proshelf-8ecfd\.web\.app$/,
  /^https:\/\/proshelf-8ecfd\.firebaseapp\.com$/,
  /^https:\/\/proshelf\.web\.app$/,          
  /^https:\/\/proshelf\.firebaseapp\.com$/,
]
const PUBLIC_CALLABLE_OPTIONS = {
  region: 'us-central1',
  invoker: 'public',
  cors: CORS_ORIGINS,
}

const { defineSecret } = require("firebase-functions/params");

const identityToolkitApiKey = defineSecret("IDENTITY_TOOLKIT_API_KEY");

function origemCorsPermitida(origin) {
  if (!origin) return false
  return CORS_ORIGINS.some((permitida) => permitida.test(origin))
}

function responderCors(req, res) {
  const origin = String(req.get('origin') || '')

  if (origemCorsPermitida(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.set('Access-Control-Max-Age', '3600')
    res.set('Vary', 'Origin')
  }

  if (req.method === 'OPTIONS') {
    res.status(origemCorsPermitida(origin) ? 204 : 403).send('')
    return true
  }

  return false
}

function erroCallable(error) {
  if (error instanceof HttpsError) return error
  return new HttpsError('internal', error?.message || 'Erro interno.')
}

function callableHttp(options, handler) {
  if (!handler) {
    handler = options
    options = {}
  }

  return onRequest({ ...PUBLIC_CALLABLE_OPTIONS, ...options }, async (req, res) => {
    if (responderCors(req, res)) return

    if (req.method !== 'POST') {
      res.status(405).json({
        error: {
          status: 'INVALID_ARGUMENT',
          message: 'Use POST para chamar esta função.',
        },
      })
      return
    }

    const authorization = String(req.get('authorization') || '')
    let auth = null

    if (authorization.startsWith('Bearer ')) {
      try {
        const token = await getAuth().verifyIdToken(authorization.slice(7))
        auth = { uid: token.uid, token }
      } catch (error) {
        console.warn('Token de autenticação inválido na callable HTTP:', error)
      }
    }

    try {
      const result = await handler({
        data: req.body?.data,
        auth,
        rawRequest: req,
      })

      res.status(200).json({ result })
    } catch (error) {
      const httpsError = erroCallable(error)
      res.status(httpsError.httpErrorCode.status).json({
        error: httpsError.toJSON(),
      })
    }
  })
}

function getDb() {
  return getFirestore(FIRESTORE_DATABASE_ID)
}

function getDefaultDb() {
  return getFirestore()
}

function sanitizarEmail(email) {
  return String(email || '').trim().toLowerCase().replace(/[@.]/g, '_')
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function variantesDeRole(role) {
  const normalizada = normalizarTexto(role)
  const aliases = {
    professor: ['professor', 'professora', 'docente'],
    coordenador: ['coordenador', 'coordenadora', 'coordenacao', 'coordenação'],
  }

  return [...new Set([
    String(role || '').trim(),
    normalizada,
    normalizada.charAt(0).toUpperCase() + normalizada.slice(1),
    ...(aliases[normalizada] || []),
  ].filter(Boolean))]
}

async function exigirCoordenador(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Faça login para continuar.')
  }

  const perfilSnap = await getDb().doc(`users/${request.auth.uid}`).get()
  if (!perfilSnap.exists || perfilSnap.data()?.role !== 'coordenador') {
    throw new HttpsError('permission-denied', 'Apenas coordenadores podem executar esta ação.')
  }
}

async function buscarUidsUsuariosPorRole(db, role) {
  const rolesPossiveis = variantesDeRole(role).slice(0, 10)
  const uids = new Set()

  for (const campo of CAMPOS_ROLE) {
    const snap = await db.collection('users')
      .where(campo, 'in', rolesPossiveis)
      .get()

    snap.docs.forEach((documento) => uids.add(documento.id))
  }

  return [...uids]
}

async function resolverUidsPorEmails(emails) {
  const auth = getAuth()
  const uids = []
  const emailsValidos = [...new Set(
    emails
      .map((email) => String(email || '').trim().toLowerCase())
      .filter(Boolean)
  )]

  for (const email of emailsValidos) {
    try {
      const user = await auth.getUserByEmail(email)
      uids.push(user.uid)
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        console.warn(`Não foi possível resolver UID do email ${email}:`, err.message)
      }
    }
  }

  return uids
}

async function buscarUidsProfessoresVinculados(db) {
  const snap = await db.collection('professores_escola').get()
  const uids = []
  const emails = []

  snap.docs.forEach((documento) => {
    const dados = documento.data() || {}
    const uid = dados.uid || dados.userId || dados.userUid || dados.authUid || dados.professorId

    if (uid) uids.push(String(uid))
    if (dados.email) emails.push(dados.email)
  })

  return [...new Set([
    ...uids,
    ...(await resolverUidsPorEmails(emails)),
  ])]
}

async function listarAuthUidsExceto(uidIgnorado) {
  const auth = getAuth()
  const uids = []
  let pageToken

  do {
    const pagina = await auth.listUsers(1000, pageToken)
    pagina.users.forEach((user) => {
      if (!user.disabled && user.uid !== uidIgnorado) {
        uids.push(user.uid)
      }
    })
    pageToken = pagina.pageToken
  } while (pageToken)

  return uids
}

async function buscarDestinatariosPorRole(role, remetenteUid) {
  const roleNormalizada = normalizarTexto(role)
  const bancos = [getDb(), getDefaultDb()]
  const uids = new Set()

  for (const db of bancos) {
    const porUsers = await buscarUidsUsuariosPorRole(db, role)
    porUsers.forEach((uid) => uids.add(uid))

    if (roleNormalizada === 'professor') {
      const porVinculos = await buscarUidsProfessoresVinculados(db)
      porVinculos.forEach((uid) => uids.add(uid))
    }
  }

  if (uids.size === 0 && roleNormalizada === 'professor') {
    const porAuth = await listarAuthUidsExceto(remetenteUid)
    porAuth.forEach((uid) => uids.add(uid))
  }

  uids.delete(remetenteUid)
  return [...uids]
}

async function criarNotificacoesNoFirestore({
  destinatarioUids,
  titulo,
  mensagem,
  tipo = 'aviso',
  link = null,
  criadoPorUid = null,
  criadoPorNome = null,
}) {
  const uids = [...new Set(
    (destinatarioUids || [])
      .map((uid) => String(uid || '').trim())
      .filter(Boolean)
  )]

  if (uids.length === 0) {
    return {
      sucesso: false,
      notificacoesCriadas: 0,
      motivo: 'Nenhum destinatário encontrado.',
    }
  }

  const db = getDb()
  const lotes = []

  for (let i = 0; i < uids.length; i += 450) {
    const batch = db.batch()
    uids.slice(i, i + 450).forEach((uid) => {
      const ref = db.collection('users').doc(uid).collection('notificacoes').doc()
      batch.set(ref, {
        titulo,
        mensagem,
        tipo,
        link,
        lida: false,
        criadoEm: FieldValue.serverTimestamp(),
        criadoPorUid,
        criadoPorNome,
      })
    })
    lotes.push(batch.commit())
  }

  await Promise.all(lotes)

  return {
    sucesso: true,
    notificacoesCriadas: uids.length,
  }
}

async function lerPerfilEmQualquerBanco(uid) {
  const [perfilProshelf, perfilDefault] = await Promise.all([
    getDb().doc(`users/${uid}`).get(),
    getDefaultDb().doc(`users/${uid}`).get(),
  ])

  if (perfilProshelf.exists) return perfilProshelf.data() || {}
  if (perfilDefault.exists) return perfilDefault.data() || {}
  return {}
}

async function sincronizarProfessoresDoAuth(uidCoordenador) {
  const auth = getAuth()
  const db = getDb()
  let pageToken
  let verificados = 0
  let sincronizados = 0

  do {
    const pagina = await auth.listUsers(1000, pageToken)

    for (const user of pagina.users) {
      verificados++

      if (user.disabled || user.uid === uidCoordenador || !user.email) continue

      const perfil = await lerPerfilEmQualquerBanco(user.uid)
      if (normalizarTexto(perfil.role) === 'coordenador') continue

      const nome =
        String(perfil.nome || perfil.displayName || user.displayName || '').trim()
        || user.email.split('@')[0]
      const email = String(user.email).trim().toLowerCase()
      const agora = FieldValue.serverTimestamp()

      await Promise.all([
        db.doc(`users/${user.uid}`).set({
          nome,
          nomeUsuario: perfil.nomeUsuario || '',
          instituicao: perfil.instituicao || '',
          modalidade: perfil.modalidade || 'Presencial',
          email,
          role: 'professor',
          atualizadoEm: agora,
        }, { merge: true }),
        db.doc(`professores_escola/${sanitizarEmail(email)}`).set({
          uid: user.uid,
          nome,
          email,
          atualizadoEm: agora,
        }, { merge: true }),
      ])

      sincronizados++
    }

    pageToken = pagina.pageToken
  } while (pageToken)

  return { verificados, sincronizados }
}

async function criarProfessorHandler(request) {
    await exigirCoordenador(request);

    // 1. DESCOBRIR A ESCOLA DO COORDENADOR QUE ESTÁ FAZENDO A REQUISIÇÃO
    const coordenadorRef = await getDb().doc(`users/${request.auth.uid}`).get();
    const escolaIdDoCoordenador = coordenadorRef.data()?.escolaId;

    if (!escolaIdDoCoordenador) {
        throw new HttpsError('failed-precondition', 'Este coordenador não está vinculado a nenhuma escola.');
    }

    if (request.data?.acao === 'sincronizarProfessores') {
      // Se usar sincronização, precisará passar o escolaIdDoCoordenador para a função sincronizarProfessoresDoAuth também.
      return await sincronizarProfessoresDoAuth(request.auth.uid);
    }

    const nome = String(request.data?.nome || '').trim();
    const email = String(request.data?.email || '').trim().toLowerCase();
    const senha = String(request.data?.senha || '');

    if (!nome || !email || !senha) {
      throw new HttpsError('invalid-argument', 'Nome, e-mail e senha são obrigatórios.');
    }

    if (senha.length < 6) {
      throw new HttpsError('invalid-argument', 'A senha deve ter pelo menos 6 caracteres.');
    }

    const auth = getAuth();
    let userRecord;

    try {
      userRecord = await auth.createUser({
        email,
        password: senha,
        displayName: nome,
      });
    } catch (err) {
      if (err.code !== 'auth/email-already-exists') {
        throw new HttpsError('internal', err.message || 'Erro ao criar usuário.');
      }
      userRecord = await auth.getUserByEmail(email);
      await auth.updateUser(userRecord.uid, { displayName: nome, password: senha });
    }

    const db = getDb();
    const agora = FieldValue.serverTimestamp();
    const emailId = sanitizarEmail(email);

    // 2. SALVAR O PROFESSOR COM O CARIMBO DO escolaId
    await Promise.all([
      db.doc(`users/${userRecord.uid}`).set({
        nome,
        nomeUsuario: '',
        instituicao: '',
        modalidade: 'Presencial',
        email,
        role: 'professor',
        escolaId: escolaIdDoCoordenador, // <--- ADICIONADO AQUI
        criadoEm: agora,
        atualizadoEm: agora,
      }, { merge: true }),
      
      db.doc(`professores_escola/${emailId}`).set({
        uid: userRecord.uid,
        nome,
        email,
        escolaId: escolaIdDoCoordenador, // <--- ADICIONADO AQUI
        atualizadoEm: agora,
      }, { merge: true }),
    ]);

  return { uid: userRecord.uid };
}


exports.criarProfessor = onCall(
  {
    ...PUBLIC_CALLABLE_OPTIONS,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  criarProfessorHandler
)

exports.criarProfessorHttp = callableHttp(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  criarProfessorHandler
)

async function deletarProfessorHandler(request) {
    await exigirCoordenador(request)

    const email = String(request.data?.email || '').trim().toLowerCase()
    if (!email) {
      throw new HttpsError('invalid-argument', 'E-mail é obrigatório.')
    }

    const auth = getAuth()
    const db = getDb()
    const emailId = sanitizarEmail(email)
    const vinculoSnap = await db.doc(`professores_escola/${emailId}`).get()

    let uid = vinculoSnap.data()?.uid || ''
    try {
      const userRecord = await auth.getUserByEmail(email)
      uid = userRecord.uid
      await auth.deleteUser(uid)
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        throw new HttpsError('internal', err.message || 'Erro ao remover usuário.')
      }
    }

    const deletes = [db.doc(`professores_escola/${emailId}`).delete()]
    if (uid) deletes.push(db.doc(`users/${uid}`).delete())
    await Promise.allSettled(deletes)

  return { uid }
}

exports.deletarProfessor = onCall(
  {
    ...PUBLIC_CALLABLE_OPTIONS,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  deletarProfessorHandler
)

exports.deletarProfessorHttp = callableHttp(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  deletarProfessorHandler
)

exports.criarNotificacaoPorRole = onCall(
  {
    ...PUBLIC_CALLABLE_OPTIONS,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Faça login para continuar.')
    }

    const role = String(request.data?.role || '').trim()
    const titulo = String(request.data?.titulo || '').trim()
    const mensagem = String(request.data?.mensagem || '').trim()
    const tipo = String(request.data?.tipo || 'aviso').trim()
    const link = request.data?.link || null
    const criadoPorUid = request.data?.criadoPorUid || request.auth.uid
    const criadoPorNome = request.data?.criadoPorNome || null

    if (!role || !titulo || !mensagem) {
      throw new HttpsError('invalid-argument', 'Role, título e mensagem são obrigatórios.')
    }

    const destinatarioUids = await buscarDestinatariosPorRole(role, request.auth.uid)

    console.log(
      `Criando notificação para role "${role}". Destinatários encontrados: ${destinatarioUids.length}`
    )

    return criarNotificacoesNoFirestore({
      destinatarioUids,
      titulo,
      mensagem,
      tipo,
      link,
      criadoPorUid,
      criadoPorNome,
    })
  }
)

// Função para checar se é um Admin Geral
async function exigirAdminGeral(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Faça login para continuar.');
  }

  const adminSnap = await getDb().doc(`admins/${request.auth.uid}`).get();
  if (!adminSnap.exists) {
    throw new HttpsError('permission-denied', 'Acesso negado. Apenas administradores gerais podem executar esta ação.');
  }
}

// Lógica de aprovação de escola
async function aprovarEscolaHandler(request) {
  // 1. Garante que só o Admin Geral pode rodar isso
  await exigirAdminGeral(request);

  const escolaId = request.data?.escolaId;
  const senhaTemporaria = request.data?.senhaTemporaria;

  if (!escolaId || !senhaTemporaria) {
    throw new HttpsError('invalid-argument', 'ID da escola e senha são obrigatórios.');
  }

  const db = getDb();
  const auth = getAuth();
  
  // 2. Busca os dados da Escola Pendente
  const escolaRef = db.collection('escolas').doc(escolaId);
  const escolaSnap = await escolaRef.get();

  if (!escolaSnap.exists) {
    throw new HttpsError('not-found', 'Escola não encontrada.');
  }

  const escolaData = escolaSnap.data();

  // 3. Verifica conflitos (ID único de e-mail)
  // O Firebase já cuida do conflito do ID do documento (escolaId). Aqui garantimos que não exista outra conta com o mesmo e-mail.
  try {
    await auth.getUserByEmail(escolaData.email);
    // Se não der erro, o e-mail já existe!
    throw new HttpsError('already-exists', 'Já existe um usuário registrado com este e-mail.');
  } catch (err) {
    if (err.code !== 'auth/user-not-found' && err.code !== 'already-exists') {
      throw new HttpsError('internal', 'Erro ao verificar conflito de e-mail.');
    }
    if (err.code === 'already-exists') throw err;
  }

  // 4. Cria o usuário coordenador de forma segura no Firebase Auth
  const userRecord = await auth.createUser({
    email: escolaData.email,
    password: senhaTemporaria,
    displayName: escolaData.responsavel,
  });

  const novoUid = userRecord.uid;
  const agora = FieldValue.serverTimestamp();

  // 5. Salva os dados no Firestore (Tudo ao mesmo tempo para evitar erros)
  await Promise.all([
    // Atualiza status da escola
    escolaRef.update({ status: 'aprovada', aprovadaEm: agora }),
    
    // Cria o perfil do coordenador na coleção users
    db.doc(`users/${novoUid}`).set({
      email: escolaData.email,
      nome: escolaData.responsavel,
      role: 'coordenador',
      escolaId: escolaId, // Vínculo com a escola
      nomeInstituicao: escolaData.nomeInstituicao,
      criadoEm: agora,
      atualizadoEm: agora,
    })
  ]);

  return { sucesso: true, novoUid, email: escolaData.email };
}

// Exportar a função para ser chamada pelo front-end
exports.aprovarEscola = onCall(
  {
    ...PUBLIC_CALLABLE_OPTIONS,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  aprovarEscolaHandler
);

// ═══════════════════════════════════════════════════════════
//  RATE LIMITING & PROTEÇÃO DE LOGIN (Defesa em Profundidade)
// ═══════════════════════════════════════════════════════════

const MAX_TENTATIVAS_LOGIN = 20;
const JANELA_MS_LOGIN = 15 * 60 * 1000; // 15 minutos

async function loginComLimiteHandler(request) {
const appCheckToken = request.rawRequest.headers["x-firebase-appcheck"] || "";
  
  console.log("🔥 LOGIN COM LIMITE FOI CHAMADO")
  // 1. Extrai o IP (com fallback seguro e compatível com IPv6)
  const ipRaw = request.rawRequest.headers["x-forwarded-for"]?.split(",")[0]?.trim() || request.rawRequest.ip || "ip-desconhecido";
  const ipSanitizado = ipRaw.replace(/:/g, "_"); 

  const email = String(request.data?.email || "").trim();
  const senha = request.data?.senha;
const apiKey = identityToolkitApiKey.value();

  if (!email || !senha || !apiKey) {
    throw new HttpsError("invalid-argument", "E-mail e senha são obrigatórios.");
  }

  const db = getDefaultDb(); // Salvando o log no banco padrão
  const ref = db.collection("_loginAttempts").doc(ipSanitizado);
  const agora = Date.now();

  // 2. Conta as tentativas usando transação para evitar condições de corrida
  const permitido = await db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const tentativasAtuais = doc.exists ? doc.data().tentativas || [] : [];
    
    // Filtra apenas as tentativas que ocorreram dentro dos últimos 15 min
    const tentativasValidas = tentativasAtuais.filter(ts => agora - ts < JANELA_MS_LOGIN);

    if (tentativasValidas.length >= MAX_TENTATIVAS_LOGIN) {
      return false; // Bloqueia
    }

    // Adiciona a tentativa atual e salva
    tentativasValidas.push(agora);
    t.set(ref, { tentativas: tentativasValidas, atualizadoEm: agora });
    return true;
  });

  if (!permitido) {
    throw new HttpsError("resource-exhausted", "Muitas tentativas de login. Tente novamente em 15 minutos.");
  }

  // 3. Valida a senha usando a REST API do Firebase Authentication
  // OBS: Requer Node.js 18+ (padrão nas Cloud Functions v2) para o 'fetch' nativo
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Firebase-AppCheck": appCheckToken // 👈 Repassando o token para o Auth
      },
      body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
    }
  );

  const dados = await resp.json();

  if (!resp.ok) {
    // 🔍 LOG DE DIAGNÓSTICO: mostra o motivo REAL que o Google retornou,
    // sem expor a senha. Veja em Firebase Console → Functions → Logs.
console.error("[loginComLimite] Falha ao validar credenciais:", {
  ip: ipSanitizado,
  email,
  senhaTamanho: senha.length,
  statusHTTP: resp.status,
  motivoGoogle: dados?.error?.message || "desconhecido",
  respostaGoogle: dados,
});
    throw new HttpsError("permission-denied", `Erro do Google: ${dados?.error?.message || "Desconhecido"}`);
  }

  // 4. Se a senha estiver certa, gera um Token Customizado para o front-end
  const auth = getAuth();
  const customToken = await auth.createCustomToken(dados.localId);

  return { customToken };
}

// Exporta a função ativando a exigência do App Check
exports.loginComLimite = onCall(
  {
    ...PUBLIC_CALLABLE_OPTIONS,
    enforceAppCheck: false,
    secrets: [identityToolkitApiKey],
  },
  loginComLimiteHandler
);