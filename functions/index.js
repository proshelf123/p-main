const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { initializeApp, getApps } = require('firebase-admin/app')
const { getFirestore, writeBatch, doc, serverTimestamp } = require('firebase-admin/firestore')
const pdfParse = require('pdf-parse')

if (!getApps().length) initializeApp()

const GEMINI_KEY = defineSecret('GEMINI_API_KEY')

async function chamarGeminiComRetry(model, prompt, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (err) {
      const ehOverload = err.message?.includes('503') || err.message?.includes('overloaded')
      if (ehOverload && i < tentativas - 1) {
        console.log(`Tentativa ${i + 1} falhou (503). Aguardando 3s...`)
        await new Promise(r => setTimeout(r, 3000))
        continue
      }
      throw err
    }
  }
}

// Agrupa as aulas por professor a partir do JSON de turmas
function agruparPorProfessor(turmas, periodo) {
  const porProfessor = {}

  for (const [nomeTurma, aulas] of Object.entries(turmas)) {
    if (!aulas || aulas.length === 0) continue
    for (const aula of aulas) {
      const nomePDF = (aula.professor || '').trim().toUpperCase()
      if (!nomePDF) continue // ignora aulas sem professor

      if (!porProfessor[nomePDF]) porProfessor[nomePDF] = []
      porProfessor[nomePDF].push({
        dia:        aula.dia || '',
        ordem:      aula.ordem || 1,
        periodo:    aula.periodo || periodo,
        disciplina: aula.disciplina || '',
        professor:  nomePDF,
        turma:      nomeTurma,
      })
    }
  }

  return porProfessor
}

async function salvarNoFirestore(turmas, periodo) {
  const db = getFirestore()
  const batch = writeBatch(db)
  let totalAulas = 0

  const porProfessor = agruparPorProfessor(turmas, periodo)

  for (const [nomePDF, aulas] of Object.entries(porProfessor)) {
    for (const aula of aulas) {
      const aulaId = `${aula.dia}_${aula.ordem}_${aula.turma}_${periodo}`
      const ref = doc(db, 'cronogramas_escola', nomePDF, 'aulas', aulaId)
      batch.set(ref, {
        ...aula,
        atualizadoEm: serverTimestamp(),
      })
      totalAulas++
    }
  }

  await batch.commit()
  return { totalAulas, totalProfessores: Object.keys(porProfessor).length }
}

exports.processarHorario = onCall(
  {
    secrets: [GEMINI_KEY],
    timeoutSeconds: 120,
    memory: '512MiB',
    region: 'us-central1',
  },
  async (request) => {
    const { pdfBase64, periodo } = request.data

    if (!pdfBase64 || !periodo) {
      throw new HttpsError('invalid-argument', 'pdfBase64 e periodo são obrigatórios.')
    }

    // 1. Decodifica o PDF e extrai o texto
    let textoPdf
    try {
      const buffer = Buffer.from(pdfBase64, 'base64')
      const parsed = await pdfParse(buffer)
      textoPdf = parsed.text
    } catch (err) {
      throw new HttpsError('internal', 'Falha ao ler o PDF: ' + err.message)
    }

    if (!textoPdf || textoPdf.trim().length < 50) {
      throw new HttpsError('invalid-argument', 'O PDF não contém texto legível.')
    }

    // 2. Monta o prompt
    const prompt = `
Você é um sistema de extração de dados escolares.
Analise o horário escolar abaixo e extraia as aulas de cada turma.
O período é: ${periodo}.

Retorne SOMENTE um JSON válido, sem markdown, sem explicações, no formato:
{
  "turmas": {
    "NOME_DA_TURMA": [
      {
        "dia": "Segunda",
        "ordem": 1,
        "disciplina": "Matemática",
        "professor": "NOME_EXATO_DO_PROFESSOR",
        "periodo": "${periodo}"
      }
    ]
  }
}

Regras:
- "dia" deve ser: Segunda, Terça, Quarta, Quinta, Sexta
- "ordem" é o número da aula no dia (1, 2, 3...)
- "turma" é o nome da turma (ex: "1A", "2B", "3C")
- "professor" deve ser o nome exato como aparece no PDF, em letras maiúsculas
- Se não houver professor identificado, use string vazia ""
- Inclua todas as turmas encontradas no horário

Horário:
${textoPdf}
`

    // 3. Chama o Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_KEY.value())
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { temperature: 0.1 },
    })

    let respostaTexto
    try {
      respostaTexto = await chamarGeminiComRetry(model, prompt)
    } catch (err) {
      throw new HttpsError('internal', 'Erro ao chamar o Gemini: ' + err.message)
    }

    // 4. Parse do JSON
    let cronograma
    try {
      const limpo = respostaTexto
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim()
      cronograma = JSON.parse(limpo)
    } catch (err) {
      console.error('Resposta bruta do Gemini:', respostaTexto)
      throw new HttpsError('internal', 'Gemini retornou JSON inválido.')
    }

    if (!cronograma?.turmas) {
      throw new HttpsError('internal', 'Estrutura de cronograma inválida.')
    }

    // 5. Salva no Firestore agrupado por professor
    const { totalAulas, totalProfessores } = await salvarNoFirestore(cronograma.turmas, periodo)

    return {
      cronograma,
      totalAulas,
      totalProfessores,
    }
  }
)