// src/coordenador/UploadCronograma.jsx

import { useState } from 'react'
import { collection, setDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../firebase'
import './coordenador.css'
import { FileDown } from 'lucide-react';
import { CircleCheckBig } from 'lucide-react';
import { CloudUpload } from 'lucide-react';
import { TriangleAlert } from 'lucide-react';


const PERIODOS = ['Matutino', 'Vespertino', 'Noturno']

export default function UploadCronograma() {
  const [arquivo, setArquivo]       = useState(null)
  const [periodo, setPeriodo]       = useState('Matutino')
  const [processando, setProcessando] = useState(false)
  const [progresso, setProgresso]   = useState('')
  const [resultado, setResultado]   = useState(null)
  const [erro, setErro]             = useState(null)

  function handleArquivo(e) {
    const file = e.target.files[0]
    if (!file || file.type !== 'application/pdf') {
      setErro('Por favor, selecione um arquivo PDF.')
      return
    }
    setArquivo(file)
    setErro(null)
    setResultado(null)
  }

  function pdfParaBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleProcessar() {
    if (!arquivo) return
    setProcessando(true)
    setErro(null)
    setResultado(null)

    try {
      setProgresso('Lendo o PDF...')
      const pdfBase64 = await pdfParaBase64(arquivo)

      setProgresso('Gemini está analisando o horário...')
      const processarHorario = httpsCallable(functions, 'processarHorario', { timeout: 120000 })
      const response = await processarHorario({ pdfBase64, periodo })

      const { cronograma } = response.data
      if (!cronograma?.turmas) {
        throw new Error('Formato de resposta inesperado.')
      }

      setProgresso('Salvando no Firebase...')
      const total = await salvarNoFirestore(cronograma.turmas)

      setResultado({
        turmas: Object.keys(cronograma.turmas).length,
        aulas: total,
      })
      setProgresso('')

    } catch (err) {
      console.error(err)
      setErro('Erro: ' + (err.message || 'Tente novamente.'))
      setProgresso('')
    }

    setProcessando(false)
  }

  async function salvarNoFirestore(turmas) {
    let totalAulas = 0
    const batch = writeBatch(db)

    for (const [nomeTurma, aulas] of Object.entries(turmas)) {
      if (!aulas || aulas.length === 0) continue
      for (const aula of aulas) {
        const aulaId = `${aula.dia}_${aula.ordem}_${periodo}`
        const ref = doc(db, 'cronogramas_escola', nomeTurma, 'aulas', aulaId)
        batch.set(ref, {
          dia:        aula.dia || '',
          ordem:      aula.ordem || 1,
          periodo:    aula.periodo || periodo,
          disciplina: aula.disciplina || '',
          professor:  aula.professor || '',
          turma:      nomeTurma,
          atualizadoEm: serverTimestamp(),
        })
        totalAulas++
      }
    }

    await batch.commit()
    return totalAulas
  }

  return (
    <div className='upload-container'>
      <div className='upload-header'>
        <span className='upload-badge'>Coordenador</span>
        <h2 className='upload-titulo'>Upload de Horário</h2>
        <p className='upload-desc'>
          Envie o PDF do horário e a IA vai extrair automaticamente
          as aulas de cada turma.
        </p>
      </div>

      {/* Seletor de período */}
      <div className='perfil-grupo' style={{ marginBottom: 12 }}>
        <label className='perfil-label'>Período do horário</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {PERIODOS.map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 13,
                border: '1.5px solid', cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                background: periodo === p ? 'var(--roxo)' : 'white',
                color: periodo === p ? 'white' : 'var(--roxo)',
                borderColor: 'var(--roxo)',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Área de upload */}
      <label className={`upload-area ${arquivo ? 'tem-arquivo' : ''}`}>
        <input
          type='file'
          accept='application/pdf'
          onChange={handleArquivo}
          disabled={processando}
          hidden
        />
        {arquivo ? (
          <>
            <span className='upload-icone'><FileDown /></span>
            <span className='upload-nome'>{arquivo.name}</span>
            <span className='upload-tamanho'>
              {(arquivo.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </>
        ) : (
          <>
            <span className='upload-icone'><CloudUpload /></span>
            <span className='upload-texto'>Clique para selecionar o PDF</span>
            <span className='upload-subtexto'>Somente arquivos .pdf</span>
          </>
        )}
      </label>

      {/* Botão processar */}
      <button
        className='upload-btn'
        onClick={handleProcessar}
        disabled={!arquivo || processando}
      >
        {processando ? progresso || 'Processando...' : 'Processar horário com IA'}
      </button>

      {/* Barra de progresso */}
      {processando && (
        <div className='upload-progresso'>
          <div className='upload-progresso-bar' />
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className='upload-erro'><TriangleAlert /> {erro}</div>
      )}

      {/* Sucesso */}
      {resultado && (
        <div className='upload-sucesso'>
          <span><CircleCheckBig /> Horário salvo com sucesso!</span>
          <div className='upload-stats'>
            <div className='upload-stat'>
              <strong>{resultado.turmas}</strong>
              <span>turmas</span>
            </div>
            <div className='upload-stat'>
              <strong>{resultado.aulas}</strong>
              <span>aulas salvas</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}