// src/firebase/estrutura.js
import {
  doc, setDoc, getDoc,
  collection, addDoc, getDocs,
  updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, where, onSnapshot
} from "firebase/firestore";
import { db } from "../firebase";
import { criarNotificacao, criarNotificacaoPorRole } from "../notificacoes/notificacoes";

// ═══════════════════════════════════════════════════════════
//  PROFESSORES & PERFIL
// ═══════════════════════════════════════════════════════════

export async function buscarProfessores() {
  const q = query(collection(db, "users"), where("role", "==", "professor"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, nome: d.data().nome, email: d.data().email }));
}

export async function atualizarConfigUser(uid, dados) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, dados, { merge: true });
}

export async function buscarPerfil(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
}

// ═══════════════════════════════════════════════════════════
//  CALENDÁRIO
// ═══════════════════════════════════════════════════════════

export async function criarEvento(uid, dados) {
  const ref = collection(db, "calendario", uid, "eventos");
  return await addDoc(ref, {
    titulo: dados.titulo || "",
    data: dados.data || "",
    tipo: dados.tipo || "reuniao",
    descricao: dados.descricao || "",
    criadoEm: serverTimestamp(),
  });
}

export async function deletarEvento(uid, eventoId) {
  await deleteDoc(doc(db, "calendario", uid, "eventos", eventoId));
}

// ═══════════════════════════════════════════════════════════
//  ARQUIVOS & SOLICITAÇÕES (FLUXO COMPLETO DE NOTIFICAÇÕES)
// ═══════════════════════════════════════════════════════════

/**
 * 1. O Professor cria uma solicitação de arquivo e o Coordenador é notificado.
 */
export async function criarSolicitacaoArquivo(turmaId, dadosSolicitacao, usuarioAtual) {
  const ref = collection(db, "solicitacoes_arquivos");
  
  const novaSolicitacao = {
    turmaId: turmaId,
    professorId: usuarioAtual.uid,
    professorNome: usuarioAtual.nome,
    nome: dadosSolicitacao.nome,
    descricao: dadosSolicitacao.descricao || "",
    status: "pendente",
    criadoEm: serverTimestamp()
  };

  const docRef = await addDoc(ref, novaSolicitacao);

  // Notifica todos os coordenadores da escola
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
  // A) Salva o arquivo na coleção de arquivos liberados daquela turma
  const arquivosRef = collection(db, "turmas_arquivos_aprovados");
  await addDoc(arquivosRef, {
    turmaId: solicitacao.turmaId,
    nome: solicitacao.nome,
    tipo: metaArquivo.tipo || "pdf",
    tamanho: metaArquivo.tamanho || "--- KB",
    enviadoPor: usuarioAtual.nome,
    criadoEm: serverTimestamp()
  });

  // B) Atualiza o estado da solicitação original para 'aprovado'
  const solicitacaoDocRef = doc(db, "solicitacoes_arquivos", solicitacao.id);
  await updateDoc(solicitacaoDocRef, { status: "aprovado" });

  // C) Envia uma notificação direta para o feed/sino do professor que pediu
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

// Remove um arquivo aprovado da lista da turma
export async function deletarArquivoAprovado(arquivoId) {
  await deleteDoc(doc(db, "turmas_arquivos_aprovados", arquivoId));
}