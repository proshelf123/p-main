// src/firebase/estrutura.js
import {
  doc, setDoc, getDoc,
  collection, addDoc, getDocs,
  collectionGroup,
  updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, where, onSnapshot, writeBatch
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
  return snap.docs.map((d) => ({
    id: d.id,
    nome: d.data().nome,
    email: d.data().email,
    nomePDF: d.data().nomePDF,
  }));
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

const CORES_DISCIPLINAS_REF = doc(db, "configuracoes_escola", "cores_disciplinas");
const PROFESSORES_DISCIPLINAS_REF = doc(db, "configuracoes_escola", "professores_disciplinas");

function normalizarMapaCoresDisciplinas(dados = {}) {
  const cores = dados.cores || {};
  return Object.entries(cores).reduce((acc, [chave, valor]) => {
    if (typeof valor === "string") {
      acc[chave] = { nome: chave, cor: valor };
      return acc;
    }
    acc[chave] = {
      nome: valor?.nome || chave,
      cor: valor?.cor || "",
    };
    return acc;
  }, {});
}

export async function buscarCoresDisciplinas() {
  const snap = await getDoc(CORES_DISCIPLINAS_REF);
  if (!snap.exists()) return {};
  return normalizarMapaCoresDisciplinas(snap.data());
}

export function escutarCoresDisciplinas(callback, onErro = () => {}) {
  return onSnapshot(
    CORES_DISCIPLINAS_REF,
    (snap) => callback(snap.exists() ? normalizarMapaCoresDisciplinas(snap.data()) : {}),
    onErro
  );
}

export async function salvarCoresDisciplinas(uid, cores) {
  await setDoc(CORES_DISCIPLINAS_REF, {
    cores: cores || {},
    atualizadoPorUid: uid || "",
    atualizadoEm: serverTimestamp(),
  }, { merge: true });
}

export function escutarProfessoresDisciplinas(callback, onErro = () => {}) {
  return onSnapshot(
    PROFESSORES_DISCIPLINAS_REF,
    (snap) => callback(snap.exists() ? (snap.data().vinculos || {}) : {}),
    onErro
  );
}

export async function salvarProfessoresDisciplinas(uid, vinculos) {
  await setDoc(PROFESSORES_DISCIPLINAS_REF, {
    vinculos: vinculos || {},
    atualizadoPorUid: uid || "",
    atualizadoEm: serverTimestamp(),
  }, { merge: true });
}

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

function normalizarChaveCronograma(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function nomeDocumentoCronograma(valor) {
  return String(valor || "").trim().toUpperCase();
}

function sanitizarEmailCronograma(email) {
  return String(email || "").trim().toLowerCase().replace(/[@.]/g, "_");
}

async function buscarNomesProfessorCronograma(perfil = null) {
  const nomes = [
    perfil?.nomePDF,
    perfil?.nome,
    normalizarChaveCronograma(perfil?.nomePDF),
    normalizarChaveCronograma(perfil?.nome),
  ];
  const emailId = sanitizarEmailCronograma(perfil?.email);

  if (emailId) {
    const vinculoSnap = await getDoc(doc(db, "professores_escola", emailId));
    if (vinculoSnap.exists()) {
      const vinculo = vinculoSnap.data();
      nomes.push(
        vinculo.nomePDF,
        vinculo.nome,
        normalizarChaveCronograma(vinculo.nomePDF),
        normalizarChaveCronograma(vinculo.nome)
      );
    }
  }

  const professoresSnap = await getDocs(collection(db, "professores_escola"));
  professoresSnap.docs.forEach((professorDoc) => {
    const professor = professorDoc.data();
    const mesmoEmail = professor.email
      && perfil?.email
      && String(professor.email).trim().toLowerCase() === String(perfil.email).trim().toLowerCase();
    const mesmoUid = professor.uid && perfil?.id && professor.uid === perfil.id;

    if (mesmoEmail || mesmoUid) {
      nomes.push(
        professor.nomePDF,
        professor.nome,
        normalizarChaveCronograma(professor.nomePDF),
        normalizarChaveCronograma(professor.nome)
      );
    }
  });

  return [...new Set(nomes.map(nomeDocumentoCronograma).filter(Boolean))];
}

function dadosAulaCronograma(d, origem = "") {
  return {
    id: d.id,
    sourcePath: d.ref.path,
    origem,
    ...d.data(),
  };
}

async function buscarTodasAulasCronogramasEscola() {
  const nomesCronogramas = new Set();
  const adicionarNome = (valor) => {
    const nome = nomeDocumentoCronograma(valor);
    if (nome) nomesCronogramas.add(nome);
  };

  const [cronogramasSnap, professoresSnap, turmasPeriodoSnap] = await Promise.all([
    getDocs(collection(db, "cronogramas_escola")),
    getDocs(collection(db, "professores_escola")),
    getDocs(collection(db, "turmas_periodo")),
  ]);

  cronogramasSnap.docs.forEach((d) => adicionarNome(d.id));

  professoresSnap.docs.forEach((professorDoc) => {
    const professor = professorDoc.data();
    adicionarNome(professor.nomePDF);
    adicionarNome(professor.nome);
  });

  turmasPeriodoSnap.docs.forEach((turmaDoc) => {
    const turma = turmaDoc.data();
    adicionarNome(turma.nomeTurma);
    adicionarNome(turma.nome);
    adicionarNome(turmaDoc.id);
  });

  const snaps = await Promise.allSettled(
    [...nomesCronogramas].map((nome) => getDocs(collection(db, "cronogramas_escola", nome, "aulas")))
  );

  return snaps.flatMap((resultado) => {
    if (resultado.status !== "fulfilled") return [];
    return resultado.value.docs.map((d) => dadosAulaCronograma(d, "escola"));
  });
}

function chaveAulaCronograma(aula) {
  return [
    aula.dia || "",
    aula.ordem || "",
    aula.periodo || "",
    aula.turma || "",
    aula.disciplina || "",
    aula.professor || "",
  ].map(normalizarChaveCronograma).join("|");
}

export function filtrarCronogramaDoProfessor(aulas = [], perfil = null) {
  if (normalizarChaveCronograma(perfil?.role) !== "PROFESSOR") return aulas;

  const nomesProfessor = [
    perfil?.nomePDF,
    perfil?.nome,
    perfil?.nomeUsuario,
    perfil?.email,
  ].map(normalizarChaveCronograma).filter(Boolean);

  if (nomesProfessor.length === 0) return [];
  return aulas.filter((aula) => nomesProfessor.includes(normalizarChaveCronograma(aula.professor)));
}

function idSeguroCronograma(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[/.#[\]]/g, "-")
    .toUpperCase();
}

export async function salvarCronogramaTurmaManual({
  uid,
  curso,
  ano,
  nomeTurma,
  periodo = "Matutino",
  aulas = [],
}) {
  const turmaBase = nomeDocumentoCronograma(nomeTurma || `${ano} ${curso}`);
  if (!turmaBase) throw new Error("Informe o curso antes de salvar.");
  if (!Array.isArray(aulas) || aulas.length === 0) throw new Error("Adicione pelo menos uma aula.");

  const batch = writeBatch(db);
  const turmasAfetadas = new Set([turmaBase]);

  aulas.forEach((aula) => {
    if (aula?.turma) turmasAfetadas.add(nomeDocumentoCronograma(aula.turma));
  });

  for (const turma of turmasAfetadas) {
    const aulasSnap = await getDocs(collection(db, "cronogramas_escola", turma, "aulas"));
    aulasSnap.docs.forEach((aulaDoc) => batch.delete(aulaDoc.ref));
  }

  const agora = serverTimestamp();

  turmasAfetadas.forEach((turma) => {
    batch.set(doc(db, "cronogramas_escola", turma), {
      tipo: "turma",
      nomeTurma: turma,
      turmaBase,
      curso: String(curso || "").trim(),
      ano: String(ano || "").trim(),
      periodo,
      criadoPorUid: uid || "",
      atualizadoEm: agora,
    }, { merge: true });
  });

  aulas.forEach((aula, index) => {
    const turma = nomeDocumentoCronograma(aula.turma || turmaBase);
    const aulaId = idSeguroCronograma([
      aula.dia || "Segunda",
      aula.ordem || index + 1,
      aula.horario || "",
      turma,
      aula.divisao || "",
      aula.periodo || periodo,
    ].join("_"));

    batch.set(doc(db, "cronogramas_escola", turma, "aulas", aulaId), {
      dia: aula.dia || "Segunda",
      ordem: Number(aula.ordem || index + 1),
      horario: aula.horario || "",
      periodo: aula.periodo || periodo,
      disciplina: aula.disciplina || "",
      professor: aula.professor || "",
      sala: aula.sala || "",
      turma,
      turmaBase,
      divisao: aula.divisao || "",
      atualizadoEm: agora,
      criadoPorUid: uid || "",
    }, { merge: true });
  });

  await batch.commit();

  try {
    await criarNotificacaoPorRole({
      role: "professor",
      titulo: "Cronograma atualizado",
      mensagem: `O cronograma da turma ${turmaBase} foi atualizado pela coordenação.`,
      tipo: "horario",
      link: "/cronograma",
      criadoPorUid: uid || "coordenacao",
      criadoPorNome: "Coordenação",
    });
  } catch (erro) {
    console.error("Erro ao notificar atualização de cronograma:", erro);
  }

  return { totalAulas: aulas.length, nomeTurma: turmaBase };
}

export async function deletarCronogramaCursoManual({ nomeTurma }) {
  const turmaBase = nomeDocumentoCronograma(nomeTurma);
  if (!turmaBase) throw new Error("Informe o curso para deletar.");

  const cronogramasRef = collection(db, "cronogramas_escola");
  const turmasParaRemover = new Map();
  const adicionarTurma = (turmaDoc) => {
    turmasParaRemover.set(turmaDoc.ref.path, turmaDoc);
  };

  const turmasSnap = await getDocs(query(cronogramasRef, where("turmaBase", "==", turmaBase)));
  turmasSnap.docs.forEach(adicionarTurma);

  await Promise.all(
    [turmaBase, `${turmaBase} A`, `${turmaBase} B`].map(async (turma) => {
      const turmaSnap = await getDoc(doc(db, "cronogramas_escola", turma));
      if (turmaSnap.exists()) adicionarTurma(turmaSnap);
    })
  );

  const batch = writeBatch(db);

  for (const turmaDoc of turmasParaRemover.values()) {
    const aulasSnap = await getDocs(collection(turmaDoc.ref, "aulas"));
    aulasSnap.docs.forEach((aulaDoc) => batch.delete(aulaDoc.ref));
    batch.delete(turmaDoc.ref);
  }

  const turmasPeriodoParaRemover = new Map();
  const turmaPeriodoRef = doc(db, "turmas_periodo", idSeguroCronograma(turmaBase));
  turmasPeriodoParaRemover.set(turmaPeriodoRef.path, turmaPeriodoRef);
  const turmasPeriodoSnap = await getDocs(query(
    collection(db, "turmas_periodo"),
    where("nomeTurma", "==", turmaBase)
  ));
  turmasPeriodoSnap.docs.forEach((turmaDoc) => {
    turmasPeriodoParaRemover.set(turmaDoc.ref.path, turmaDoc.ref);
  });
  turmasPeriodoParaRemover.forEach((turmaRef) => batch.delete(turmaRef));

  await batch.commit();
  return { nomeTurma: turmaBase, totalTurmas: turmasParaRemover.size };
}

const ORDEM_DIA_CRONOGRAMA = {
  DOMINGO: 0,
  SEGUNDA: 1,
  TERCA: 2,
  QUARTA: 3,
  QUINTA: 4,
  SEXTA: 5,
  SABADO: 6,
};

const HORARIOS_MATUTINO = [420, 470, 520, 590, 640, 690, 740];

function minutosInicioAula(aula) {
  const horario = String(aula.horario || "").match(/(\d{1,2}):(\d{2})/);
  if (horario) return Number(horario[1]) * 60 + Number(horario[2]);

  const ordem = Number(aula.ordem || 1);
  const periodo = normalizarChaveCronograma(aula.periodo);
  if (periodo.includes("MATUTINO") || periodo.includes("MANHA")) {
    return HORARIOS_MATUTINO[Math.max(0, ordem - 1)] ?? (420 + (ordem - 1) * 50);
  }
  if (periodo.includes("VESPERTINO") || periodo.includes("TARDE")) return 780 + (ordem - 1) * 50;
  if (periodo.includes("NOTURNO") || periodo.includes("NOITE")) return 1140 + (ordem - 1) * 50;
  return 420 + (ordem - 1) * 50;
}

export function buscarProximaAulaDoProfessor(aulas = [], perfil = null, agora = new Date()) {
  const aulasProfessor = filtrarCronogramaDoProfessor(aulas, perfil);
  if (aulasProfessor.length === 0) return null;

  const hoje = agora.getDay();
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  return aulasProfessor
    .map((aula) => {
      const dia = ORDEM_DIA_CRONOGRAMA[normalizarChaveCronograma(aula.dia)];
      const inicio = minutosInicioAula(aula);
      let distanciaDias = typeof dia === "number" ? (dia - hoje + 7) % 7 : 7;
      if (distanciaDias === 0 && inicio < minutosAgora) distanciaDias = 7;
      return { aula, distanciaDias, inicio };
    })
    .sort((a, b) => a.distanciaDias - b.distanciaDias || a.inicio - b.inicio || (a.aula.ordem || 0) - (b.aula.ordem || 0))[0]
    ?.aula || null;
}

export async function buscarCronograma(uid, perfil = null) {
  const aulas = [];
  const rolePerfil = normalizarChaveCronograma(perfil?.role);

  const adicionar = (novasAulas) => {
    aulas.push(...novasAulas);
  };

  const snapPessoal = await getDocs(collection(db, "cronogramas", uid, "aulas"));
  adicionar(snapPessoal.docs.map((d) => dadosAulaCronograma(d, "pessoal")));

  if (rolePerfil === "COORDENADOR" || rolePerfil === "PROFESSOR") {
    adicionar(await buscarTodasAulasCronogramasEscola());
  } else {
    const nomesProfessorDocumento = await buscarNomesProfessorCronograma(perfil);
    const nomesProfessorComparacao = nomesProfessorDocumento.map(normalizarChaveCronograma);

    if (rolePerfil === "PROFESSOR" && nomesProfessorDocumento.length > 0) {
      const snapsProfessor = await Promise.allSettled(
        nomesProfessorDocumento.map((nomePDF) => getDocs(collection(db, "cronogramas_escola", nomePDF, "aulas")))
      );

      snapsProfessor.forEach((resultado) => {
        if (resultado.status === "fulfilled") {
          adicionar(resultado.value.docs.map((d) => dadosAulaCronograma(d, "professor")));
        }
      });
    }

    const turmasPeriodoSnap = await getDocs(collection(db, "turmas_periodo"));
    const nomesTurmas = [...new Set(
      turmasPeriodoSnap.docs.map((d) => d.data().nomeTurma).filter(Boolean)
    )];

    const snapsTurmas = await Promise.allSettled(
      nomesTurmas.map((nomeTurma) => getDocs(collection(db, "cronogramas_escola", nomeTurma, "aulas")))
    );

    snapsTurmas.forEach((resultado) => {
      if (resultado.status !== "fulfilled") return;

      const aulasDaTurma = resultado.value.docs
        .map((d) => dadosAulaCronograma(d, "turma"))
        .filter((aula) => {
          if (rolePerfil !== "PROFESSOR" || nomesProfessorComparacao.length === 0) return true;
          return nomesProfessorComparacao.includes(normalizarChaveCronograma(aula.professor));
        });

      adicionar(aulasDaTurma);
    });
  }

  const vistas = new Set();
  return aulas.filter((aula) => {
    const chave = chaveAulaCronograma(aula);
    if (vistas.has(chave)) return false;
    vistas.add(chave);
    return true;
  });
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

export async function deletarEvento(uid, eventoId) {
  // Tenta deletar nas duas coleções (um dos dois vai simplesmente não encontrar)
  await Promise.allSettled([
    deleteDoc(doc(db, "eventos_escola", eventoId)),
    deleteDoc(doc(db, "calendario", uid, "eventos", eventoId)),
  ]);
}

export async function buscarEventos(uid) {
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
 * Escuta em tempo real as solicitações de uma turma.
 * Por padrão, oculta pedidos já aprovados ou recusados da fila principal.
 */
export function escutarSolicitacoes(turmaId, callback, opcoes = {}) {
  const q = query(
    collection(db, "solicitacoes_arquivos"),
    where("turmaId", "==", turmaId),
    orderBy("criadoEm", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const incluirResolvidas = opcoes.incluirResolvidas === true;
    const lista = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((solicitacao) => incluirResolvidas || (solicitacao.status || "pendente") === "pendente");
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
  if (!solicitacao?.id) {
    throw new Error("Solicitacao invalida para aprovacao.");
  }
  if (solicitacao.status && solicitacao.status !== "pendente") {
    throw new Error("Esta solicitacao ja foi resolvida.");
  }

  const arquivosRef = collection(db, "turmas_arquivos_aprovados");
  const arquivoRef = await addDoc(arquivosRef, {
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

  await updateDoc(doc(db, "solicitacoes_arquivos", solicitacao.id), {
    status: "aprovado",
    arquivoAprovadoId: arquivoRef.id,
    resolvidoEm: serverTimestamp(),
    resolvidoPorUid: usuarioAtual.uid || "",
    resolvidoPorNome: usuarioAtual.nome || "Coordenacao",
  });

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

  return arquivoRef.id;
}

export async function recusarSolicitacaoArquivo(solicitacao, usuarioAtual, motivo = "") {
  if (!solicitacao?.id) {
    throw new Error("Solicitacao invalida para recusa.");
  }
  if (solicitacao.status && solicitacao.status !== "pendente") {
    throw new Error("Esta solicitacao ja foi resolvida.");
  }

  const motivoLimpo = String(motivo || "").trim();

  await updateDoc(doc(db, "solicitacoes_arquivos", solicitacao.id), {
    status: "recusado",
    motivoRecusa: motivoLimpo,
    resolvidoEm: serverTimestamp(),
    resolvidoPorUid: usuarioAtual.uid || "",
    resolvidoPorNome: usuarioAtual.nome || "Coordenacao",
  });

  if (solicitacao.professorId) {
    await criarNotificacao({
      titulo: "Solicitacao de Arquivo Recusada",
      mensagem: motivoLimpo
        ? `A coordenacao recusou o arquivo "${solicitacao.nome}". Motivo: ${motivoLimpo}`
        : `A coordenacao recusou o arquivo "${solicitacao.nome}".`,
      tipo: "aviso",
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
