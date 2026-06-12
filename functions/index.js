// functions/index.js

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const resultado = await response.json()
const texto = resultado.candidates?.[0]?.content?.parts?.[0]?.text || ''

// ADICIONE ISSO TEMPORARIAMENTE
console.log('Resposta Gemini:', texto.substring(0, 500))
console.log('Status response:', response.status)

const limpo = texto.replace(/```json|```/g, '').trim()

initializeApp()

const db = getFirestore('firestoreproshelf')

function sanitizarEmail(email) {
  return email.toLowerCase().replace(/[@.]/g, '_')
}

// ─────────────────────────────────────────────────────────
//  Criar professor
// ─────────────────────────────────────────────────────────
exports.criarProfessor = onCall(async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Você precisa estar logado.')
  }

  const coordSnap = await db.collection('users').doc(auth.uid).get()
  if (!coordSnap.exists || coordSnap.data().role !== 'coordenador') {
    throw new HttpsError('permission-denied', 'Apenas coordenadores podem cadastrar professores.')
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
})

// ─────────────────────────────────────────────────────────
//  Deletar professor
// ─────────────────────────────────────────────────────────
exports.deletarProfessor = onCall(async (request) => {
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
})

// ─────────────────────────────────────────────────────────
//  Processar horário com Gemini
// ─────────────────────────────────────────────────────────
exports.processarHorario = onCall(
  { secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    const { auth, data } = request

    if (!auth) {
      throw new HttpsError('unauthenticated', 'Você precisa estar logado.')
    }

    const coordSnap = await db.collection('users').doc(auth.uid).get()
    if (!coordSnap.exists || coordSnap.data().role !== 'coordenador') {
      throw new HttpsError('permission-denied', 'Apenas coordenadores podem processar horários.')
    }

    const { pdfBase64, periodo } = data
    if (!pdfBase64 || !periodo) {
      throw new HttpsError('invalid-argument', 'PDF e período são obrigatórios.')
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY

    const prompt = `Você recebeu um PDF de horário escolar. Extraia todas as aulas e retorne um JSON válido, sem texto adicional, sem markdown, sem \`\`\`json.
O JSON deve ter este formato exato:
{
  "turmas": {
    "NOME DA TURMA": [
      {
        "dia": "SEG",
        "ordem": 1,
        "periodo": "${periodo}",
        "disciplina": "SIGLA DA MATÉRIA",
        "professor": "NOME DO PROFESSOR"
      }
    ]
  }
}
Regras:
- "dia": DOM, SEG, TER, QUA, QUI, SEX ou SAB
- "ordem": posição da aula no dia (1 a 7)
- "turma": exatamente como aparece no PDF (ex: 1 RH, 2 MARKETING)
- "disciplina": sigla ou nome da matéria
- "professor": nome em MAIÚSCULAS como aparece no PDF
- Inclua TODAS as turmas e TODAS as aulas
- Retorne APENAS o JSON`

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inline_data: {
                    mime_type: 'application/pdf',
                    data: pdfBase64
                  }
                },
                { text: prompt }
              ]
            }]
          })
        }
      )

      const result = await response.json()
      const texto = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const limpo = texto.replace(/```json|```/g, '').trim()

      return { sucesso: true, cronograma: JSON.parse(limpo) }

    } catch (error) {
      throw new HttpsError('internal', 'Erro ao processar PDF: ' + error.message)
    }
  }
)