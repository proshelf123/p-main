// src/perfil/Perfil.jsx

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import Cropper from 'react-easy-crop'
import { buscarPerfil, salvarPerfil, uploadFotoPerfil, removerFotoPerfil } from '../firebase/estrutura'
import { auth } from '../firebase'
import DropdownComPortal from '../secoes/DropwdownComPortal'
import { criarImagemAPartirDeArquivo, obterBlobRecortado } from './cropImagem'
import './perfil.css'
import { Camera, Loader2, Trash2 } from 'lucide-react'

const MotionDiv = motion.div

const MODALIDADES = ['Presencial', 'Híbrido', 'EAD']

export default function Perfil({ uid, onFechar }) {
  const [form, setForm] = useState({
    nome: '',
    nomeUsuario: '',
    rp: '',
    instituicao: '',
    email: '',
    modalidade: 'Presencial',
  })
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')
  const [dropdownAberto, setDropdownAberto] = useState(null)
  const [fotoURL, setFotoURL] = useState('')
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const inputFotoRef = useRef(null)

  // ── Estado do modal de recorte ──
  const [imagemParaCrop, setImagemParaCrop] = useState(null) // dataURL da imagem selecionada
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [areaRecortePixels, setAreaRecortePixels] = useState(null)

  useEffect(() => {
    if (!uid) return
    buscarPerfil(uid).then(dados => {
      if (dados) {
        setForm({
          nome:        dados.nome        || '',
          nomeUsuario: dados.nomeUsuario || '',
          rp:          dados.rp          || '',
          instituicao: dados.instituicao || '',
          email:       dados.email       || auth.currentUser?.email || '',
          modalidade:  dados.modalidade  || 'Presencial',
        })
        setFotoURL(dados.fotoURL || '')
      }
    })
  }, [uid])

  // Abre o modal de crop em vez de subir a foto direto
  async function handleSelecionarFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await criarImagemAPartirDeArquivo(file)
      setImagemParaCrop(dataUrl)
    } catch {
      setErro('Não foi possível ler a imagem selecionada.')
    } finally {
      e.target.value = ''
    }
  }

  const onCropCompleteInterno = useCallback((_areaVisivel, areaPixels) => {
    setAreaRecortePixels(areaPixels)
  }, [])

  function handleCancelarCrop() {
    setImagemParaCrop(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setAreaRecortePixels(null)
  }

  async function handleConfirmarCrop() {
    if (!imagemParaCrop || !areaRecortePixels) return
    setEnviandoFoto(true)
    try {
      const blob = await obterBlobRecortado(imagemParaCrop, areaRecortePixels)
      const url = await uploadFotoPerfil(uid, blob)
      setFotoURL(url)
      handleCancelarCrop()
    } catch {
      setErro('Erro ao enviar a foto. Tente novamente.')
    } finally {
      setEnviandoFoto(false)
    }
  }

  async function handleRemoverFoto() {
    setEnviandoFoto(true)
    try {
      await removerFotoPerfil(uid)
      setFotoURL('')
    } finally {
      setEnviandoFoto(false)
    }
  }

  const inicial = form.nome?.charAt(0).toUpperCase() || '?'

  async function handleSalvar() {
    if (!form.nome.trim()) { setErro('Informe seu nome.'); return }
    setSalvando(true)
    setErro('')
    try {
      await salvarPerfil(uid, form)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
      onFechar()
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <MotionDiv
      className='perfil-overlay'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onFechar}
    >
      <MotionDiv
        className='perfil-modal'
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className='perfil-header'>
          <div className='perfil-avatar-wrapper'>
            <div className='perfil-avatar' onClick={() => inputFotoRef.current?.click()}>
              {fotoURL ? <img src={fotoURL} alt='Foto de perfil' /> : inicial}
              <div className='perfil-avatar-overlay'>
                {enviandoFoto ? <Loader2 size={16} className='perfil-spin' /> : <Camera size={16} />}
              </div>
            </div>
            {fotoURL && !enviandoFoto && (
              <button className='perfil-avatar-remover' onClick={handleRemoverFoto} aria-label='Remover foto'>
                <Trash2 size={12} />
              </button>
            )}
            <input
              ref={inputFotoRef}
              type='file'
              accept='image/*'
              hidden
              onChange={handleSelecionarFoto}
            />
          </div>
          <div>
            <h2 className='perfil-titulo'>Editar perfil</h2>
            <p className='perfil-subtitulo'>
              {form.nome ? `Prof. ${form.nome.split(' ')[0]}` : 'Preencha seus dados'}
            </p>
          </div>
          <button className='perfil-fechar' onClick={onFechar} aria-label='Fechar'>✕</button>
        </div>

        {/* Formulário */}
        <div className='perfil-form'>
          <div className='perfil-linha-2'>
            <div className='perfil-grupo'>
              <label className='perfil-label'>Nome completo *</label>
              <input
                className='perfil-input'
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder='Ex: Maria da Silva'
              />
            </div>
          </div>

          <div className='perfil-linha-2'>
            <div className='perfil-grupo'>
              <label className='perfil-label'>RP</label>
              <input
                className='perfil-input'
                value={form.rp}
                onChange={e => setForm({ ...form, rp: e.target.value })}
                placeholder='Registro do professor'
              />
            </div>
            <DropdownComPortal
              label='Modalidade'
              opcoes={MODALIDADES}
              valor={form.modalidade}
              onChange={modalidade => setForm({ ...form, modalidade })}
              id='perfil-modalidade'
              dropdownAberto={dropdownAberto}
              setDropdownAberto={setDropdownAberto}
            />
          </div>

          <div className='perfil-grupo'>
            <label className='perfil-label'>Instituição</label>
            <input
              className='perfil-input'
              value={form.instituicao}
              onChange={e => setForm({ ...form, instituicao: e.target.value })}
              placeholder='Nome da escola ou faculdade'
            />
          </div>

          <div className='perfil-grupo'>
            <label className='perfil-label'>E-mail</label>
            <input
              className='perfil-input perfil-input-disabled'
              value={form.email}
              readOnly
              tabIndex={-1}
            />
          </div>

          {erro && <p className='perfil-erro'>{erro}</p>}
        </div>

        {/* Rodapé */}
        <div className='perfil-rodape'>
          <button className='perfil-cancelar' onClick={onFechar}>Cancelar</button>
          <button className='perfil-salvar' onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : salvo ? '✓ Salvo!' : 'Salvar perfil'}
          </button>
        </div>
      </MotionDiv>

      {/* Modal de recorte de imagem */}
      {imagemParaCrop && (
        <MotionDiv
          className='crop-overlay'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={e => e.stopPropagation()}
        >
          <div className='crop-modal'>
            <h3 className='crop-titulo'>Ajustar foto</h3>
            <div className='crop-area'>
              <Cropper
                image={imagemParaCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape='round'
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropCompleteInterno}
              />
            </div>
            <input
              type='range'
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className='crop-zoom-slider'
            />
            <div className='crop-rodape'>
              <button className='perfil-cancelar' onClick={handleCancelarCrop} disabled={enviandoFoto}>
                Cancelar
              </button>
              <button className='perfil-salvar' onClick={handleConfirmarCrop} disabled={enviandoFoto}>
                {enviandoFoto ? 'Enviando...' : 'Usar esta foto'}
              </button>
            </div>
          </div>
        </MotionDiv>
      )}
    </MotionDiv>
  )
}