// src/firebase/estrutura.js
import {
  doc, setDoc, getDoc,
  collection, addDoc, getDocs,
  collectionGroup,
  updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, where, onSnapshot
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { criarNotificacao, criarNotificacaoPorRole } from "../notificacoes/notificacoes";

// ═══════════════════════════════════════════════════════════
//  PROFESSORES & PERFIL
// ═══════════════════════════════════════════════════════════

export async function buscarProfessores() {
  const q = query(collection(db, "users"), where("role", "==", "professor"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, nome: d.data().nome, email: d.data().email }));
}

export async function criarPerfil(uid, email) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const emailNormalizado = String(email || "").trim().toLowerCase();

  await setDoc(ref, {
    nome: "",
    nomeUsuario: "",
    instituicao: "",
    modalidade: "Presencial",
    email: emailNormalizado,
    role: "professor",
    criadoEm: serverTimestamp(),
  });
}

export async function salvarPerfil(uid, dados) {
  await setDoc(doc(db, "users", uid), {
    ...dados,
    atualizadoEm: serverTimestamp(),
  }, { merge: true });
}

export async function atualizarConfigUser(uid, dados) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, dados, { merge: true });
}

export async function buscarPerfil(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
}

// ═══════════════════════════════════════════════════════════
//  TURMAS
// ═══════════════════════════════════════════════════════════

export async function criarTurma(uid, dados) {
  const ref = collection(db, "turmas", uid, "lista");
  return await addDoc(ref, {
    nome: dados.nome || "",
    disciplina: dados.disciplina || "",
    professor: dados.professor || "",
    professorId: dados.professorId || "",
    periodo: dados.periodo || "Matutino",
    criadoPorUid: uid,
    criadoEm: serverTimestamp(),
  });
}

function dadosTurmaDoSnap(d) {
  return {
    id: d.id,
    ownerUid: d.ref.parent.parent?.id || "",
    sourcePath: d.ref.path,
    ...d.data(),
  };
}

export async function buscarTurmas(uid, perfil = null) {
  if (perfil?.role === "professor") {
    const [minhasSnap, vinculadasSnap] = await Promise.all([
      getDocs(collection(db, "turmas", uid, "lista")),
      getDocs(query(collectionGroup(db, "lista"), where("professorId", "==", uid))),
    ]);

    const turmas = [...minhasSnap.docs, ...vinculadasSnap.docs].map(dadosTurmaDoSnap);
    const vistas = new Set();
    return turmas.filter((turma) => {
      const chave = turma.sourcePath || `${turma.ownerUid}:${turma.id}`;
      if (vistas.has(chave)) return false;
      vistas.add(chave);
      return true;
    });
  }

  const snap = await getDocs(collection(db, "turmas", uid, "lista"));
  return snap.docs.map(dadosTurmaDoSnap);
}

export async function atualizarTurma(uid, turmaId, dados) {
  await updateDoc(doc(db, "turmas", uid, "lista", turmaId), dados);
}

export async function deletarTurma(uid, turmaId) {
  await deleteDoc(doc(db, "turmas", uid, "lista", turmaId));
}

// ═══════════════════════════════════════════════════════════
//  REGISTROS DE AULA
// ═══════════════════════════════════════════════════════════

export async function criarRegistroAula(uid, turmaId, dados) {
  const ref = collection(db, "turmas", uid, "lista", turmaId, "registros");
  return await addDoc(ref, {
    data: dados.data || "",
    conteudo: dados.conteudo || "",
    descricao: dados.descricao || "",
    informacoes: dados.informacoes || "",
    tipo: dados.tipo || "teorica",
    anexos: dados.anexos || [],
    criadoEm: serverTimestamp(),
  });
}

export async function buscarRegistros(uid, turmaId) {
  const ref = collection(db, "turmas", uid, "lista", turmaId, "registros");
  const snap = await getDocs(query(ref, orderBy("data", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function atualizarRegistro(uid, turmaId, registroId, dados) {
  await updateDoc(
    doc(db, "turmas", uid, "lista", turmaId, "registros", registroId),
    dados
  );
}

export async function deletarRegistro(uid, turmaId, registroId) {
  await deleteDoc(doc(db, "turmas", uid, "lista", turmaId, "registros", registroId));
}

// ═══════════════════════════════════════════════════════════
//  CRONOGRAMA
// ═══════════════════════════════════════════════════════════

export async function criarAulaCronograma(uid, dados) {
  const ref = collection(db, "cronogramas", uid, "aulas");
  return await addDoc(ref, {
    dia: dados.dia || "SEG",
    ordem: dados.ordem || 1,
    periodo: dados.periodo || "Matutino",
    disciplina: dados.disciplina || "",
    turma: dados.turma || "",
    sala: dados.sala || "",
    criadoEm: serverTimestamp(),
  });
}

export async function buscarCronograma(uid) {
  const snap = await getDocs(collection(db, "cronogramas", uid, "aulas"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function atualizarAulaCronograma(uid, aulaId, dados) {
  await updateDoc(doc(db, "cronogramas", uid, "aulas", aulaId), dados);
}

export async function deletarAulaCronograma(uid, aulaId) {
  await deleteDoc(doc(db, "cronogramas", uid, "aulas", aulaId));
}

// ═══════════════════════════════════════════════════════════
//  ARQUIVOS DO PROFESSOR
// ═══════════════════════════════════════════════════════════

export async function salvarArquivo(uid, dados) {
  const ref = collection(db, "arquivos", uid, "lista");
  return await addDoc(ref, {
    nome: dados.nome || "",
    url: dados.url || "",
    tipo: dados.tipo || "pdf",
    fixado: dados.fixado || false,
    criadoEm: serverTimestamp(),
  });
}

export async function buscarArquivos(uid) {
  const snap = await getDocs(
    query(collection(db, "arquivos", uid, "lista"), orderBy("criadoEm", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function toggleFixarArquivo(uid, arquivoId, fixado) {
  await updateDoc(doc(db, "arquivos", uid, "lista", arquivoId), { fixado });
}

export async function deletarArquivo(uid, arquivoId) {
  await deleteDoc(doc(db, "arquivos", uid, "lista", arquivoId));
}

// ═══════════════════════════════════════════════════════════
//  CALENDÁRIO
//
//  Arquitetura:
//  - eventos_escola/{id}  → eventos do coordenador, visíveis para todos
//  - calendario/{uid}/eventos/{id} → eventos pessoais do professor (só ele vê)
//
//  buscarEventos() retorna a união dos dois para cada role.
// ═══════════════════════════════════════════════════════════

export async function criarEvento(uid, dados) {
  const compartilhar = dados.compartilharComProfessores === true;

  if (compartilhar) {
    // Salva na coleção global — todos os professores veem automaticamente
    const ref = collection(db, "eventos_escola");
    return await addDoc(ref, {
      titulo: dados.titulo || "",
      data: dados.data || "",
      tipo: dados.tipo || "reuniao",
      descricao: dados.descricao || "",
      criadoPorUid: uid,
      compartilhadoComProfessores: true,
      criadoEm: serverTimestamp(),
    });
  }

  // Evento pessoal do coordenador (sem compartilhamento)
  const ref = collection(db, "calendario", uid, "eventos");
  return await addDoc(ref, {
    titulo: dados.titulo || "",
    data: dados.data || "",
    tipo: dados.tipo || "reuniao",
    descricao: dados.descricao || "",
    criadoPorUid: uid,
    compartilhadoComProfessores: false,
    criadoEm: serverTimestamp(),
  });
}

export async function deletarEvento(uid, eventoId, compartilhadoComUids = []) {
  // Tenta deletar nas duas coleções (um dos dois vai simplesmente não encontrar)
  await Promise.allSettled([
    deleteDoc(doc(db, "eventos_escola", eventoId)),
    deleteDoc(doc(db, "calendario", uid, "eventos", eventoId)),
  ]);
}

export async function buscarEventos(uid, perfil = null) {
  const role = perfil?.role || "professor";

  // Sempre busca os eventos globais da escola (coordenador compartilhou)
  const escolaSnap = await getDocs(
    query(collection(db, "eventos_escola"), orderBy("data", "asc"))
  );
  const eventosEscola = escolaSnap.docs.map((d) => ({
    id: d.id,
    _origem: "escola",
    ...d.data(),
  }));

  // Busca também os eventos pessoais do usuário logado
  const pessoalSnap = await getDocs(
    query(collection(db, "calendario", uid, "eventos"), orderBy("data", "asc"))
  );
  const eventosPessoais = pessoalSnap.docs.map((d) => ({
    id: d.id,
    _origem: "pessoal",
    ...d.data(),
  }));

  // Une e ordena por data, removendo duplicatas por id
  const todos = [...eventosEscola, ...eventosPessoais];
  const vistos = new Set();
  return todos
    .filter((e) => {
      if (vistos.has(e.id)) return false;
      vistos.add(e.id);
      return true;
    })
    .sort((a, b) => (a.data || "").localeCompare(b.data || ""));
}

// ═══════════════════════════════════════════════════════════
//  TURMAS DE ARQUIVOS — coleção global (Arquivos.jsx)
//  Substitui o localStorage — visível para todos os usuários
// ═══════════════════════════════════════════════════════════

/**
 * Retorna a lista de períodos com suas turmas salvas no Firestore.
 * Retorna sempre os 3 períodos; turmas novas do coordenador aparecem para todos.
 */
export function escutarTurmasPeriodo(callback) {
  const q = query(
    collection(db, "turmas_periodo"),
    orderBy("criadoEm", "asc")
  );
  return onSnapshot(q, (snap) => {
    // Agrupa por período mantendo a estrutura esperada pelo Arquivos.jsx
    const mapa = {};
    snap.docs.forEach((d) => {
      const { nomePeriodo, nomeTurma } = d.data();
      if (!mapa[nomePeriodo]) mapa[nomePeriodo] = [];
      mapa[nomePeriodo].push({ id: d.id, nomeTurma });
    });
    callback(mapa);
  });
}

/**
 * Adiciona uma nova turma ao período (chamado pelo coordenador).
 */
export async function adicionarTurmaPeriodo(nomeTurma, nomePeriodo, criadoPorUid) {
  return await addDoc(collection(db, "turmas_periodo"), {
    nomeTurma,
    nomePeriodo,
    criadoPorUid,
    criadoEm: serverTimestamp(),
  });
}

/**
 * Remove uma turma do período (chamado pelo coordenador).
 */
export async function removerTurmaPeriodo(turmaDocId) {
  await deleteDoc(doc(db, "turmas_periodo", turmaDocId));
}

// ═══════════════════════════════════════════════════════════
//  ARQUIVOS & SOLICITAÇÕES (FLUXO COMPLETO DE NOTIFICAÇÕES)
// ═══════════════════════════════════════════════════════════

/**
 * 1. O Professor cria uma solicitação de arquivo e o Coordenador é notificado.
 */
export async function criarSolicitacaoArquivo(turmaId, dadosSolicitacao, usuarioAtual) {
  const ref = collection(db, "solicitacoes_arquivos");
  const arquivo = dadosSolicitacao.arquivo || null;
  let arquivoDados = {};

  if (arquivo) {
    const tamanhoMaximo = 20 * 1024 * 1024;
    if (arquivo.size > tamanhoMaximo) {
      throw new Error("O arquivo deve ter no máximo 20 MB.");
    }

    const turmaSegura = String(turmaId)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.-]+/g, "_");
    const nomeSeguro = arquivo.name.replace(/[^\w.-]+/g, "_");
    const caminho = `solicitacoes_arquivos/${turmaSegura}/${Date.now()}-${nomeSeguro}`;
    const arquivoRef = storageRef(storage, caminho);

    await uploadBytes(arquivoRef, arquivo, {
      contentType: arquivo.type || undefined,
      customMetadata: {
        turmaId: String(turmaId),
        professorId: usuarioAtual.uid || "",
      },
    });

    arquivoDados = {
      arquivoNome: arquivo.name,
      arquivoUrl: await getDownloadURL(arquivoRef),
      arquivoTipo: arquivo.name.split(".").pop()?.toLowerCase() || "arquivo",
      arquivoMime: arquivo.type || "",
      arquivoTamanho: arquivo.size || 0,
      arquivoStoragePath: caminho,
    };
  }

  const novaSolicitacao = {
    turmaId: turmaId,
    professorId: usuarioAtual.uid,
    professorNome: usuarioAtual.nome,
    nome: dadosSolicitacao.nome || arquivo?.name || "",
    descricao: dadosSolicitacao.descricao || "",
    ...arquivoDados,
    status: "pendente",
    criadoEm: serverTimestamp()
  };

  const docRef = await addDoc(ref, novaSolicitacao);

  await criarNotificacaoPorRole({
    role: "coordenador",
    titulo: "Nova Solicitação de Arquivo",
    mensagem: `${usuarioAtual.nome} solicitou a inclusão do arquivo: "${dadosSolicitacao.nome}".`,
    tipo: "aviso",
    link: "/arquivos",
    criadoPorUid: usuarioAtual.uid,
    criadoPorNome: usuarioAtual.nome
  });

  return docRef.id;
}

/**
 * Escuta em tempo real as solicitações pendentes ou concluídas de uma determinada turma.
 */
export function escutarSolicitacoes(turmaId, callback) {
  const q = query(
    collection(db, "solicitacoes_arquivos"),
    where("turmaId", "==", turmaId),
    orderBy("criadoEm", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(lista);
  });
}

/**
 * Escuta em tempo real os arquivos finais aprovados e disponíveis nesta turma.
 */
export function escutarArquivosDaTurma(turmaId, callback) {
  const q = query(
    collection(db, "turmas_arquivos_aprovados"),
    where("turmaId", "==", turmaId),
    orderBy("criadoEm", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(lista);
  });
}

/**
 * 2. O Coordenador aprova a solicitação, anexa o metadado do arquivo e o Professor é avisado.
 */
export async function aprovarEAdicionarArquivo(solicitacao, metaArquivo, usuarioAtual) {
  const arquivosRef = collection(db, "turmas_arquivos_aprovados");
  await addDoc(arquivosRef, {
    turmaId: solicitacao.turmaId,
    nome: solicitacao.nome,
    tipo: metaArquivo.tipo || "pdf",
    tamanho: metaArquivo.tamanho || "--- KB",
    url: metaArquivo.url || solicitacao.arquivoUrl || "",
    arquivoNome: metaArquivo.arquivoNome || solicitacao.arquivoNome || solicitacao.nome,
    arquivoStoragePath: metaArquivo.storagePath || solicitacao.arquivoStoragePath || "",
    enviadoPor: usuarioAtual.nome,
    criadoEm: serverTimestamp()
  });

  await updateDoc(doc(db, "solicitacoes_arquivos", solicitacao.id), { status: "aprovado" });

  if (solicitacao.professorId) {
    await criarNotificacao({
      titulo: "Arquivo Solicitado Disponível!",
      mensagem: `A coordenação aprovou e adicionou o arquivo "${solicitacao.nome}" à sua turma.`,
      tipo: "turma",
      link: "/arquivos",
      destinatarioUids: [solicitacao.professorId],
      criadoPorUid: usuarioAtual.uid,
      criadoPorNome: usuarioAtual.nome
    });
  }
}

export async function deletarArquivoAprovado(arquivoId) {
  await deleteDoc(doc(db, "turmas_arquivos_aprovados", arquivoId));
}
