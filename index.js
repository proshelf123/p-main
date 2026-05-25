// functions/index.js
//
// Cloud Function que cria a conta do professor usando o Admin SDK.
// Isso evita que o coordenador seja deslogado ao criar novas contas.
//
// Deploy: firebase deploy --only functions

const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

// ─────────────────────────────────────────────────────────
//  Função: criarProfessor
//  Chamada pelo frontend quando o coordenador cadastra um professor.
//  Verifica se quem chamou é coordenador antes de criar a conta.
// ─────────────────────────────────────────────────────────
exports.criarProfessor = functions.https.onCall(async (data, context) => {

  // 1. Verifica se o usuário está autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Você precisa estar logado para realizar esta ação.'
    )
  }

  // 2. Verifica se quem chamou é coordenador
  const coordSnap = await admin.firestore()
    .collection('users')
    .doc(context.auth.uid)
    .get()

  if (!coordSnap.exists || coordSnap.data().role !== 'coordenador') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Apenas coordenadores podem cadastrar professores.'
    )
  }

  const { nome, email, senha, nomePDF } = data

  // 3. Valida os dados recebidos
  if (!nome || !email || !senha || !nomePDF) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Preencha todos os campos.'
    )
  }
  if (senha.length < 6) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A senha deve ter pelo menos 6 caracteres.'
    )
  }

  try {
    // 4. Cria o usuário no Firebase Auth usando o Admin SDK
    // (não desloga o coordenador!)
    const novoUsuario = await admin.auth().createUser({
      email: email.toLowerCase(),
      password: senha,
      displayName: nome,
    })

    // 5. Cria o perfil no Firestore
    await admin.firestore()
      .collection('users')
      .doc(novoUsuario.uid)
      .set({
        nome: nome,
        nomeUsuario: '',
        instituicao: '',
        modalidade: 'Presencial',
        email: email.toLowerCase(),
        role: 'professor',
        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      })

    // 6. Vincula e-mail ao nome no PDF
    const emailId = email.toLowerCase().replace(/[@.]/g, '_')
    await admin.firestore()
      .collection('professores_escola')
      .doc(emailId)
      .set({
        email: email.toLowerCase(),
        nomePDF: nomePDF.toUpperCase().trim(),
        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      })

    return {
      sucesso: true,
      uid: novoUsuario.uid,
      mensagem: `Professor ${nome} cadastrado com sucesso!`,
    }

  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError(
        'already-exists',
        'Este e-mail já possui uma conta cadastrada.'
      )
    }
    throw new functions.https.HttpsError(
      'internal',
      'Erro ao cadastrar professor: ' + error.message
    )
  }
})

// ─────────────────────────────────────────────────────────
//  Função: deletarProfessor
//  Remove a conta do professor do Authentication e do Firestore.
// ─────────────────────────────────────────────────────────
exports.deletarProfessor = functions.https.onCall(async (data, context) => {

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Não autenticado.')
  }

  const coordSnap = await admin.firestore()
    .collection('users')
    .doc(context.auth.uid)
    .get()

  if (!coordSnap.exists || coordSnap.data().role !== 'coordenador') {
    throw new functions.https.HttpsError('permission-denied', 'Apenas coordenadores podem remover professores.')
  }

  const { email } = data
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'E-mail não informado.')
  }

  try {
    // Busca o uid pelo e-mail
    const usuario = await admin.auth().getUserByEmail(email)

    // Remove do Authentication
    await admin.auth().deleteUser(usuario.uid)

    // Remove o perfil do Firestore
    await admin.firestore().collection('users').doc(usuario.uid).delete()

    // Remove o vínculo do PDF
    const emailId = email.toLowerCase().replace(/[@.]/g, '_')
    await admin.firestore().collection('professores_escola').doc(emailId).delete()

    return { sucesso: true, mensagem: 'Professor removido com sucesso.' }

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // Se não achou no Auth, remove só o vínculo
      const emailId = email.toLowerCase().replace(/[@.]/g, '_')
      await admin.firestore().collection('professores_escola').doc(emailId).delete()
      return { sucesso: true, mensagem: 'Vínculo removido.' }
    }
    throw new functions.https.HttpsError('internal', error.message)
  }
})