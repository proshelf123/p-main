// functions/index.js

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

initializeApp()

// ── Aponta para o banco correto ──
const db = getFirestore('firestoreproshelf')

function sanitizarEmail(email) {
  return email.toLowerCase().replace(/[@.]/g, '_')
}

// ─────────────────────────────────────────────────────────
//  Criar professor
// ─────────────────────────────────────────────────────────
exports.criarProfessor = onCall(async (request))
  { cors: true },
  async (request) => {
    const { auth, data } = request

    if (!auth) {
      throw new HttpsError('unauthenticated', 'Você precisa estar logado.')
    }

    // Verifica se é coordenador no banco correto
    const coordSnap = await db.collection('users').doc(auth.uid).get()

    if (!coordSnap.exists || coordSnap.data().role !== 'coordenador') {
      throw new HttpsError(
        'permission-denied',
        'Apenas coordenadores podem cadastrar professores.'
      )
    }

    const { nome, email, senha, nomePDF } = data

    if (!nome || !email || !senha || !nomePDF) {
      throw new HttpsError('invalid-argument', 'Preencha todos os campos.')
    }
    if (senha.length < 6) {
      throw new HttpsError('invalid-argument', 'A senha deve ter pelo menos 6 caracteres.')
    }

    try {
      const authAdmin = getAuth()
      const novoUsuario = await authAdmin.createUser({
        email: email.toLowerCase(),
        password: senha,
        displayName: nome,
      })

      await db.collection('users').doc(novoUsuario.uid).set({
        nome,
        nomeUsuario: '',
        instituicao: '',
        modalidade: 'Presencial',
        email: email.toLowerCase(),
        role: 'professor',
        criadoEm: FieldValue.serverTimestamp(),
      })

      const emailId = sanitizarEmail(email)
      await db.collection('professores_escola').doc(emailId).set({
        email: email.toLowerCase(),
        nomePDF: nomePDF.toUpperCase().trim(),
        criadoEm: FieldValue.serverTimestamp(),
      })

      return { sucesso: true, mensagem: `Professor ${nome} cadastrado com sucesso!` }

    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'Este e-mail já possui uma conta cadastrada.')
      }
      throw new HttpsError('internal', 'Erro ao cadastrar: ' + error.message)
    }
  }

// ─────────────────────────────────────────────────────────
//  Deletar professor
// ─────────────────────────────────────────────────────────
exports.deletarProfessor = onCall(async (request)
  { cors: true },
  async (request) => {
    const { auth, data } = request

    if (!auth) {
      throw new HttpsError('unauthenticated', 'Não autenticado.')
    }

    const coordSnap = await db.collection('users').doc(auth.uid).get()
    if (!coordSnap.exists || coordSnap.data().role !== 'coordenador') {
      throw new HttpsError('permission-denied', 'Apenas coordenadores podem remover professores.')
    }

    const { email } = data
    if (!email) {
      throw new HttpsError('invalid-argument', 'E-mail não informado.')
    }

    try {
      const authAdmin = getAuth()
      const usuario = await authAdmin.getUserByEmail(email)
      await authAdmin.deleteUser(usuario.uid)
      await db.collection('users').doc(usuario.uid).delete()

      const emailId = sanitizarEmail(email)
      await db.collection('professores_escola').doc(emailId).delete()

      return { sucesso: true, mensagem: 'Professor removido com sucesso.' }

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        const emailId = sanitizarEmail(email)
        await db.collection('professores_escola').doc(emailId).delete()
        return { sucesso: true, mensagem: 'Vínculo removido.' }
      }
      throw new HttpsError('internal', error.message)
    }
  }
)