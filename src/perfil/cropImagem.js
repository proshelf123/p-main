// src/perfil/cropImagem.js

export function criarImagemAPartirDeArquivo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.crossOrigin = 'anonymous'
    img.src = url
  })
}

export async function obterBlobRecortado(imagemSrc, areaRecorte, tamanhoSaida = 400) {
  const image = await carregarImagem(imagemSrc)
  const canvas = document.createElement('canvas')
  canvas.width = tamanhoSaida
  canvas.height = tamanhoSaida
  const ctx = canvas.getContext('2d')

  ctx.drawImage(
    image,
    areaRecorte.x,
    areaRecorte.y,
    areaRecorte.width,
    areaRecorte.height,
    0,
    0,
    tamanhoSaida,
    tamanhoSaida
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) { reject(new Error('Falha ao gerar imagem recortada')); return }
        resolve(blob)
      },
      'image/jpeg',
      0.9
    )
  })
}