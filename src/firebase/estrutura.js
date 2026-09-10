// src/firebase/estrutura.js
import {
  doc, setDoc, getDoc,
  collection, addDoc, getDocs,
  collectionGroup,
  updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, where, onSnapshot, writeBatch, limit
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, auth } from "../firebase";
import { criarNotificacaoPorRole } from "../notificacoes/notificacoes";

const _escolaIdCache = {};
const _escolaIdPromises = {}; 

export async function getEscolaId(uidParam) {
  if (typeof uidParam !== 'string') uidParam = null;
  const uid = uidParam || auth?.currentUser?.uid;
  if (!uid) throw new Error("UID obrigatório para identificar a escola.");
  
  if (_escolaIdCache[uid]) return _escolaIdCache[uid];
  if (_escolaIdPromises[uid]) return _escolaIdPromises[uid];

  _escolaIdPromises[uid] = (async () => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      const escolaId = snap.data()?.escolaId;

      if (!escolaId) {
        console.warn(`[Multi-tenant] Escola não encontrada para o usuário ${uid}`);
        return null;
      }

      _escolaIdCache[uid] = escolaId; 
      return escolaId;
    } finally {
      delete _escolaIdPromises[uid]; 
    }
  })();

  return _escolaIdPromises[uid];
}

export async function buscarProfessores(uid) {
  const escolaId = await getEscolaId(uid);
  const q = query(collection(db, "users"), where("role", "==", "professor"), where("escolaId", "==", escolaId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, nome: d.data().nome, email: d.data().email }));
}

export async function criarPerfil(uid, email) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const emailNormalizado = String(email || "").trim().toLowerCase();
  const escolaId = await getEscolaId(auth?.currentUser?.uid);

  await setDoc(ref, {
    nome: "", nomeUsuario: "", instituicao: "", modalidade: "Presencial",
    email: emailNormalizado, role: "professor", escolaId: escolaId, criadoEm: serverTimestamp(),
  });
}

export async function salvarPerfil(uid, dados) {
  await setDoc(doc(db, "users", uid), { ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
}

export async function atualizarConfigUser(uid, dados) {
  await setDoc(doc(db, 'users', uid), dados, { merge: true });
}

export async function buscarPerfil(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
}

function normalizarMapaCoresDisciplinas(dados = {}) {
  const cores = dados.cores || {};
  return Object.entries(cores).reduce((acc, [chave, valor]) => {
    if (typeof valor === "string") {
      acc[chave] = { nome: chave, cor: valor };
      return acc;
    }
    acc[chave] = { nome: valor?.nome || chave, cor: valor?.cor || "" };
    return acc;
  }, {});
}

export async function buscarCoresDisciplinas(uid) {
  const escolaId = await getEscolaId(uid);
  const snap = await getDoc(doc(db, "configuracoes_escola", `${escolaId}_cores_disciplinas`));
  if (!snap.exists()) return {};
  return normalizarMapaCoresDisciplinas(snap.data());
}

export function escutarCoresDisciplinas(uid, callback, onErro = () => {}) {
  let unsubscribe = () => {};
  let isUnsubscribed = false;
  getEscolaId(uid).then(escolaId => {
    if (isUnsubscribed) return;
    const ref = doc(db, "configuracoes_escola", `${escolaId}_cores_disciplinas`);
    unsubscribe = onSnapshot(ref, (snap) => callback(snap.exists() ? normalizarMapaCoresDisciplinas(snap.data()) : {}), onErro);
  });
  return () => { isUnsubscribed = true; unsubscribe(); };
}

export async function salvarCoresDisciplinas(uid, cores) {
  const escolaId = await getEscolaId(uid);
  await setDoc(doc(db, "configuracoes_escola", `${escolaId}_cores_disciplinas`), {
    cores: cores || {}, atualizadoPorUid: uid || "", escolaId: escolaId, atualizadoEm: serverTimestamp(),
  }, { merge: true });
}

export function escutarProfessoresDisciplinas(uid, callback, onErro = () => {}) {
  let unsubscribe = () => {};
  let isUnsubscribed = false;

  // Garante que callback seja uma função
  if (typeof callback !== 'function') {
    console.error(
      '[escutarProfessoresDisciplinas] callback inválido:',
      callback
    );
    return () => {};
  }

  getEscolaId(uid)
    .then(escolaId => {
      if (isUnsubscribed) return;

      const ref = doc(
        db,
        "configuracoes_escola",
        `${escolaId}_professores_disciplinas`
      );

      unsubscribe = onSnapshot(
        ref,
        (snap) => {
          if (isUnsubscribed) return;

          callback(
            snap.exists()
              ? (snap.data().vinculos || {})
              : {}
          );
        },
        onErro
      );
    })
    .catch((erro) => {
      console.error(
        '[escutarProfessoresDisciplinas] Erro ao obter escola:',
        erro
      );

      if (typeof onErro === 'function') {
        onErro(erro);
      }
    });

  return () => {
    isUnsubscribed = true;
    unsubscribe();
  };
}

export async function salvarProfessoresDisciplinas(uid, vinculos) {
  const escolaId = await getEscolaId(uid);
  await setDoc(doc(db, "configuracoes_escola", `${escolaId}_professores_disciplinas`), {
    vinculos: vinculos || {}, atualizadoPorUid: uid || "", escolaId: escolaId, atualizadoEm: serverTimestamp(),
  }, { merge: true });
}

export async function criarTurma(uid, dados) {
  // --- NOVA TRAVA DE SEGURANÇA ---
  const isDuplicada = await verificarTurmaDuplicada(uid, dados);
  if (isDuplicada) {
    throw new Error("Já existe uma turma cadastrada com este exato nome, matéria e período.");
  }
  // -------------------------------

  const escolaId = await getEscolaId(uid);
  const ref = collection(db, "turmas", uid, "lista");
  return await addDoc(ref, {
    nome: dados.nome || "", disciplina: dados.disciplina || "", professor: dados.professor || "",
    professorId: dados.professorId || "", periodo: dados.periodo || "Matutino",
    escolaId: escolaId, criadoPorUid: uid, criadoEm: serverTimestamp(),
  });
}

function dadosTurmaDoSnap(d) {
  return { id: d.id, ownerUid: d.ref.parent.parent?.id || "", sourcePath: d.ref.path, ...d.data() };
}

export async function buscarTurmas(uid, perfil = null) {
  const escolaId = await getEscolaId(uid);
  if (perfil?.role === "professor") {
    const [minhasSnap, vinculadasSnap] = await Promise.all([
      getDocs(query(collection(db, "turmas", uid, "lista"), where("escolaId", "==", escolaId))),
      getDocs(query(collectionGroup(db, "lista"), where("professorId", "==", uid), where("escolaId", "==", escolaId))),
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
  const snap = await getDocs(query(collection(db, "turmas", uid, "lista"), where("escolaId", "==", escolaId)));
  return snap.docs.map(dadosTurmaDoSnap);
}

export async function atualizarTurma(uid, turmaId, dados) {
  // --- NOVA TRAVA DE SEGURANÇA ---
  const isDuplicada = await verificarTurmaDuplicada(uid, dados, turmaId);
  if (isDuplicada) {
    throw new Error("Não é possível editar. Já existe outra turma com este nome, matéria e período.");
  }
  // -------------------------------

  await updateDoc(doc(db, "turmas", uid, "lista", turmaId), dados);
}

export async function deletarTurma(uid, turmaId) {
  await deleteDoc(doc(db, "turmas", uid, "lista", turmaId));
}

// 🔥 DESNORMALIZAÇÃO: Agora gravamos ownerUid aqui
export async function criarRegistroAula(uid, turmaId, dados) {
  const escolaId = await getEscolaId(uid);
  const ref = collection(db, "turmas", uid, "lista", turmaId, "registros");
  return await addDoc(ref, {
    data: dados.data || "",
    conteudo: dados.conteudo || "",
    descricao: dados.descricao || "",
    informacoes: dados.informacoes || "",
    tipo: dados.tipo || "teorica",
    anexos: dados.anexos || [],
    escolaId: escolaId,
    criadoEm: serverTimestamp(),
    ownerUid: auth.currentUser?.uid || uid // <--- ADICIONADO PARA REGRA DE SEGURANÇA
  });
}

// =======================================================
// CRUD DE LEMBRETES DA TURMA
// =======================================================

export async function criarLembrete(uid, turmaId, dados) {
  const escolaId = await getEscolaId(uid);
  const ref = collection(db, "turmas", uid, "lista", turmaId, "lembretes");
  return await addDoc(ref, {
    data: dados.data || "",
    titulo: dados.titulo || "",
    tipo: dados.tipo || "avaliacao",
    escolaId: escolaId,
    criadoEm: serverTimestamp(),
    ownerUid: auth.currentUser?.uid || uid
  });
}

export async function buscarLembretes(uid, turmaId) {
  const ref = collection(db, "turmas", uid, "lista", turmaId, "lembretes");
  // Ordena pela data para que os lembretes fiquem na ordem cronológica correta
  const snap = await getDocs(query(ref, orderBy("data", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function atualizarLembrete(uid, turmaId, lembreteId, dados) {
  await updateDoc(doc(db, "turmas", uid, "lista", turmaId, "lembretes", lembreteId), dados);
}

export async function deletarLembrete(uid, turmaId, lembreteId) {
  await deleteDoc(doc(db, "turmas", uid, "lista", turmaId, "lembretes", lembreteId));
}

export async function buscarRegistros(uid, turmaId) {
  const ref = collection(db, "turmas", uid, "lista", turmaId, "registros");
  const snap = await getDocs(query(ref, orderBy("data", "asc"), limit(50)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function atualizarRegistro(uid, turmaId, registroId, dados) {
  await updateDoc(doc(db, "turmas", uid, "lista", turmaId, "registros", registroId), dados);
}

export async function deletarRegistro(uid, turmaId, registroId) {
  await deleteDoc(doc(db, "turmas", uid, "lista", turmaId, "registros", registroId));
}

function normalizarChaveCronograma(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

function nomeDocumentoCronograma(valor) {
  return String(valor || "").trim().toUpperCase();
}

function idSeguroCronograma(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, "_").replace(/[/.#[\]]/g, "-").toUpperCase();
}

function dadosAulaCronograma(d, origem = "") {
  return { id: d.id, sourcePath: d.ref.path, origem, ...d.data() };
}

async function buscarTodasAulasCronogramasEscola(uid) {
  const escolaId = await getEscolaId(uid);
  const cronogramasSnap = await getDocs(query(collection(db, "cronogramas_escola"), where("escolaId", "==", escolaId)));
  const snaps = await Promise.allSettled(
    cronogramasSnap.docs.map((docSnap) => getDocs(collection(docSnap.ref, "aulas")))
  );
  return snaps.flatMap((resultado) => {
    if (resultado.status !== "fulfilled") return [];
    return resultado.value.docs.map((d) => dadosAulaCronograma(d, "escola"));
  });
}

function chaveAulaCronograma(aula) {
  return [aula.dia || "", aula.ordem || "", aula.periodo || "", aula.turma || "", aula.disciplina || "", aula.professor || ""].map(normalizarChaveCronograma).join("|");
}

export function filtrarCronogramaDoProfessor(aulas = [], perfil = null) {
  if (normalizarChaveCronograma(perfil?.role) !== "PROFESSOR") return aulas;
  const nomesProfessor = [perfil?.nome, perfil?.nomeUsuario, perfil?.email].map(normalizarChaveCronograma).filter(Boolean);
  if (nomesProfessor.length === 0) return [];
  return aulas.filter((aula) => nomesProfessor.includes(normalizarChaveCronograma(aula.professor)));
}

const ORDEM_DIA_CRONOGRAMA = { DOMINGO: 0, SEGUNDA: 1, TERCA: 2, QUARTA: 3, QUINTA: 4, SEXTA: 5, SABADO: 6 };
const HORARIOS_MATUTINO = [420, 470, 520, 590, 640, 690, 740];

function minutosInicioAula(aula) {
  const horario = String(aula.horario || "").match(/(\d{1,2}):(\d{2})/);
  if (horario) return Number(horario[1]) * 60 + Number(horario[2]);
  const ordem = Number(aula.ordem || 1);
  const periodo = normalizarChaveCronograma(aula.periodo);
  if (periodo.includes("MATUTINO") || periodo.includes("MANHA")) return HORARIOS_MATUTINO[Math.max(0, ordem - 1)] ?? (420 + (ordem - 1) * 50);
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
    .sort((a, b) => a.distanciaDias - b.distanciaDias || a.inicio - b.inicio || (a.aula.ordem || 0) - (b.aula.ordem || 0))[0]?.aula || null;
}

export function buscarProximasAulasDoProfessor(aulas = [], perfil = null, agora = new Date()) {
  const aulasProfessor = filtrarCronogramaDoProfessor(aulas, perfil);
  if (aulasProfessor.length === 0) return [];
  const hoje = agora.getDay();
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const mapeadas = aulasProfessor
    .map((aula) => {
      const dia = ORDEM_DIA_CRONOGRAMA[normalizarChaveCronograma(aula.dia)];
      const inicio = minutosInicioAula(aula);
      let distanciaDias = typeof dia === "number" ? (dia - hoje + 7) % 7 : 7;
      if (distanciaDias === 0 && inicio < minutosAgora) distanciaDias = 7;
      return { aula, distanciaDias, inicio };
    })
    .sort((a, b) => a.distanciaDias - b.distanciaDias || a.inicio - b.inicio || (a.aula.ordem || 0) - (b.aula.ordem || 0));
  if (mapeadas.length === 0) return [];
  const diaMaisProximo = mapeadas[0].distanciaDias;
  return mapeadas.filter((item) => item.distanciaDias === diaMaisProximo).map((item) => item.aula);
}

export async function salvarCronogramaTurmaManual({ uid, curso, ano, nomeTurma, periodo = "Matutino", aulas = [] }) {
  const escolaId = await getEscolaId(uid);
  const turmaBase = nomeDocumentoCronograma(nomeTurma || `${ano} ${curso}`);
  if (!turmaBase) throw new Error("Informe o curso antes de salvar.");
  if (!Array.isArray(aulas) || aulas.length === 0) throw new Error("Adicione pelo menos uma aula.");

  const batch = writeBatch(db);
  const turmasAfetadas = new Set([turmaBase]);
  aulas.forEach((aula) => { if (aula?.turma) turmasAfetadas.add(nomeDocumentoCronograma(aula.turma)); });

  for (const turma of turmasAfetadas) {
    const docIdSeguro = idSeguroCronograma(`${escolaId}_${turma}`);
    const aulasSnap = await getDocs(collection(db, "cronogramas_escola", docIdSeguro, "aulas"));
    aulasSnap.docs.forEach((aulaDoc) => batch.delete(aulaDoc.ref));
  }

  const agora = serverTimestamp();
  turmasAfetadas.forEach((turma) => {
    const docIdSeguro = idSeguroCronograma(`${escolaId}_${turma}`);
    batch.set(doc(db, "cronogramas_escola", docIdSeguro), {
      tipo: "turma", nomeTurma: turma, turmaBase, curso: String(curso || "").trim(),
      ano: String(ano || "").trim(), periodo, escolaId: escolaId, criadoPorUid: uid || "", atualizadoEm: agora,
    }, { merge: true });
  });

  aulas.forEach((aula, index) => {
    const turma = nomeDocumentoCronograma(aula.turma || turmaBase);
    const docIdSeguro = idSeguroCronograma(`${escolaId}_${turma}`);
    const aulaId = idSeguroCronograma([aula.dia || "Segunda", aula.ordem || index + 1, aula.horario || "", turma, aula.divisao || "", aula.periodo || periodo].join("_"));
    batch.set(doc(db, "cronogramas_escola", docIdSeguro, "aulas", aulaId), {
      dia: aula.dia || "Segunda", ordem: Number(aula.ordem || index + 1), horario: aula.horario || "",
      periodo: aula.periodo || periodo, disciplina: aula.disciplina || "", professor: aula.professor || "",
      sala: aula.sala || "", turma, turmaBase, divisao: aula.divisao || "", escolaId: escolaId, atualizadoEm: agora, criadoPorUid: uid || "",
    }, { merge: true });
  });

  await batch.commit();
  try {
    await criarNotificacaoPorRole({ role: "professor", titulo: "Cronograma atualizado", mensagem: `O cronograma da turma ${turmaBase} foi atualizado pela coordenação.`, tipo: "horario", link: "/cronograma", criadoPorUid: uid || "coordenacao", criadoPorNome: "Coordenação" });
  } catch (erro) {}
  return { totalAulas: aulas.length, nomeTurma: turmaBase };
}

export async function deletarCronogramaCursoManual({ uid, nomeTurma }) {
  const escolaId = await getEscolaId(uid);
  const turmaBase = nomeDocumentoCronograma(nomeTurma);
  if (!turmaBase) throw new Error("Informe o curso para deletar.");

  const cronogramasRef = collection(db, "cronogramas_escola");
  const turmasParaRemover = new Map();
  const turmasSnap = await getDocs(query(cronogramasRef, where("turmaBase", "==", turmaBase), where("escolaId", "==", escolaId)));
  turmasSnap.docs.forEach(d => turmasParaRemover.set(d.ref.path, d));

  const batch = writeBatch(db);
  for (const turmaDoc of turmasParaRemover.values()) {
    const aulasSnap = await getDocs(collection(turmaDoc.ref, "aulas"));
    aulasSnap.docs.forEach((aulaDoc) => batch.delete(aulaDoc.ref));
    batch.delete(turmaDoc.ref);
  }

  const turmasPeriodoSnap = await getDocs(query(collection(db, "turmas_periodo"), where("nomeTurma", "==", turmaBase), where("escolaId", "==", escolaId)));
  turmasPeriodoSnap.docs.forEach((turmaDoc) => batch.delete(turmaDoc.ref));

  await batch.commit();
  return { nomeTurma: turmaBase, totalTurmas: turmasParaRemover.size };
}

export async function buscarCronograma(uid, perfil = null) {
  const aulas = [];
  const rolePerfil = normalizarChaveCronograma(perfil?.role);
  const snapPessoal = await getDocs(collection(db, "cronogramas", uid, "aulas"));
  aulas.push(...snapPessoal.docs.map((d) => dadosAulaCronograma(d, "pessoal")));
  if (rolePerfil === "COORDENADOR" || rolePerfil === "PROFESSOR") {
    aulas.push(...(await buscarTodasAulasCronogramasEscola(uid)));
  }
  const vistas = new Set();
  return aulas.filter((aula) => {
    const chave = chaveAulaCronograma(aula);
    if (vistas.has(chave)) return false;
    vistas.add(chave);
    return true;
  });
}

export async function criarEvento(uid, dados) {
  const escolaId = await getEscolaId(uid);
  const compartilhar = dados.compartilharComProfessores === true;
  if (compartilhar) {
    return await addDoc(collection(db, "eventos_escola"), {
      titulo: dados.titulo || "", data: dados.data || "", tipo: dados.tipo || "reuniao",
      descricao: dados.descricao || "", criadoPorUid: uid, escolaId: escolaId, compartilhadoComProfessores: true, criadoEm: serverTimestamp(),
    });
  }
  return await addDoc(collection(db, "calendario", uid, "eventos"), {
    titulo: dados.titulo || "", data: dados.data || "", tipo: dados.tipo || "reuniao",
    descricao: dados.descricao || "", criadoPorUid: uid, compartilhadoComProfessores: false, criadoEm: serverTimestamp(),
  });
}

export async function deletarEvento(uid, eventoId) {
  await Promise.allSettled([
    deleteDoc(doc(db, "eventos_escola", eventoId)),
    deleteDoc(doc(db, "calendario", uid, "eventos", eventoId)),
  ]);
}

export async function buscarEventos(uid) {
  const escolaId = await getEscolaId(uid);
  const escolaSnap = await getDocs(query(collection(db, "eventos_escola"), where("escolaId", "==", escolaId), orderBy("data", "asc")));
  const eventosEscola = escolaSnap.docs.map((d) => ({ id: d.id, _origem: "escola", ...d.data() }));

  const pessoalSnap = await getDocs(query(collection(db, "calendario", uid, "eventos"), orderBy("data", "asc")));
  const eventosPessoais = pessoalSnap.docs.map((d) => ({ id: d.id, _origem: "pessoal", ...d.data() }));

  const todos = [...eventosEscola, ...eventosPessoais];
  const vistos = new Set();
  return todos.filter((e) => {
    if (vistos.has(e.id)) return false;
    vistos.add(e.id);
    return true;
  }).sort((a, b) => (a.data || "").localeCompare(b.data || ""));
}

export function escutarTurmasPeriodo(uid, callback) {
  let unsubscribe = () => {};
  let isUnsubscribed = false;
  getEscolaId(uid).then(escolaId => {
    if (isUnsubscribed) return;
    const q = query(collection(db, "turmas_periodo"), where("escolaId", "==", escolaId), orderBy("criadoEm", "asc"));
    unsubscribe = onSnapshot(q, (snap) => {
      const mapa = {};
      snap.docs.forEach((d) => {
        const { nomePeriodo, nomeTurma } = d.data();
        if (!mapa[nomePeriodo]) mapa[nomePeriodo] = [];
        mapa[nomePeriodo].push({ id: d.id, nomeTurma });
      });
      callback(mapa);
    });
  });
  return () => { isUnsubscribed = true; unsubscribe(); };
}

export async function buscarOuCriarTurmaPeriodo(nomeTurma, nomePeriodo, uid) {
  const escolaId = await getEscolaId(uid);
  const q = query(collection(db, "turmas_periodo"), where("escolaId", "==", escolaId), where("nomeTurma", "==", nomeTurma), where("nomePeriodo", "==", nomePeriodo));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;

  const novaRef = await addDoc(collection(db, "turmas_periodo"), {
    nomeTurma, nomePeriodo, escolaId, criadoPorUid: uid, criadoEm: serverTimestamp(),
  });
  return novaRef.id;
}

export async function removerTurmaPeriodo(turmaDocId) {
  await deleteDoc(doc(db, "turmas_periodo", turmaDocId));
}

export const TAMANHO_MAXIMO_ARQUIVO_TURMA = 10 * 1024 * 1024; // 10MB
const EXTENSOES_ARQUIVO_TURMA_PERMITIDAS = ["ppt", "pptx", "doc", "docx", "xls", "xlsx", "zip", "rar", "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif"];
const MIME_ARQUIVO_TURMA_PERMITIDOS = ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip", "application/x-zip-compressed", "application/vnd.rar", "application/x-rar-compressed"];

export function validarArquivoTurma(arquivo) {
  if (!arquivo) return { ok: false, motivo: "Selecione um arquivo." };
  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO_TURMA) return { ok: false, motivo: "O arquivo ultrapassa o limite de 10MB." };
  const extensao = arquivo.name.split(".").pop()?.toLowerCase() || "";
  const ehImagem = (arquivo.type || "").startsWith("image/");
  const mimeOk = MIME_ARQUIVO_TURMA_PERMITIDOS.includes(arquivo.type);
  const extensaoOk = EXTENSOES_ARQUIVO_TURMA_PERMITIDAS.includes(extensao);
  if (!ehImagem && !mimeOk && !extensaoOk) return { ok: false, motivo: "Tipo de arquivo não permitido." };
  return { ok: true };
}

function formatarTamanhoArquivoTurma(bytes) {
  if (!bytes) return "--- KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function enviarArquivoTurma(turmaId, dados, usuarioAtual) {
  const escolaId = await getEscolaId(usuarioAtual.uid);
  const origem = usuarioAtual.role === "coordenador" ? "coordenador" : "professor";
  let camposArquivo;

  if (dados.linkGoogle) {
    const link = String(dados.linkGoogle).trim();
    if (!/^https?:\/\//i.test(link)) throw new Error("Cole um link válido.");
    camposArquivo = { tipo: "link", tamanho: "Link do Google Drive", url: link, arquivoNome: dados.nome || link, arquivoStoragePath: "" };
  } else {
    const validacao = validarArquivoTurma(dados.arquivo);
    if (!validacao.ok) throw new Error(validacao.motivo);

    const arquivo = dados.arquivo;
    const nomeSeguro = arquivo.name.replace(/[^\w.-]+/g, "_");
    const caminho = `turmas_arquivos/${escolaId}/${Date.now()}-${nomeSeguro}`;
    const arquivoRef = storageRef(storage, caminho);
    await uploadBytes(arquivoRef, arquivo, { contentType: arquivo.type || undefined, customMetadata: { escolaId, enviadoPorUid: usuarioAtual.uid || "" } });

    camposArquivo = { tipo: arquivo.name.split(".").pop()?.toLowerCase() || "arquivo", tamanho: formatarTamanhoArquivoTurma(arquivo.size), url: await getDownloadURL(arquivoRef), arquivoNome: arquivo.name, arquivoStoragePath: caminho };
  }

  const docRef = await addDoc(collection(db, "turmas_arquivos_aprovados"), {
    turmaId, nome: dados.nome || camposArquivo.arquivoNome || "", ...camposArquivo,
    enviadoPor: usuarioAtual.nome || "Usuário", enviadoPorUid: usuarioAtual.uid,
    origem, escolaId, criadoEm: serverTimestamp(),
  });
  return docRef.id;
}

export function escutarArquivosDaTurma(uid, turmaId, callback) {
  let unsubscribe = () => {};
  let isUnsubscribed = false;
  getEscolaId(uid).then(escolaId => {
    if (isUnsubscribed) return;
    const q = query(collection(db, "turmas_arquivos_aprovados"), where("turmaId", "==", turmaId), where("escolaId", "==", escolaId), orderBy("criadoEm", "desc"), limit(50));
    unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(lista);
    });
  });
  return () => { isUnsubscribed = true; unsubscribe(); };
}

export async function deletarArquivoAprovado(arquivoId) {
  const arquivoRef = doc(db, "turmas_arquivos_aprovados", arquivoId);
  const snap = await getDoc(arquivoRef);
  if (snap.exists() && snap.data().arquivoStoragePath) {
    try { await deleteObject(storageRef(storage, snap.data().arquivoStoragePath)); } catch (e) {}
  }
  await deleteDoc(arquivoRef);
}

export async function criarAluno(uid, nomeSala, dados) {
  const escolaId = await getEscolaId(uid);
  const ref = collection(db, "salas", escolaId, "lista", nomeSala, "alunos");
  return await addDoc(ref, {
    nome: dados.nome || "", numero: dados.numero || "", matricula: dados.matricula || "", escolaId: escolaId, criadoEm: serverTimestamp(),
  });
}

export async function atualizarAluno(uid, nomeSala, alunoId, dados) {
  const escolaId = await getEscolaId(uid);
  await updateDoc(doc(db, "salas", escolaId, "lista", nomeSala, "alunos", alunoId), dados);
}

export async function deletarAluno(uid, nomeSala, alunoId) {
  const escolaId = await getEscolaId(uid);
  await deleteDoc(doc(db, "salas", escolaId, "lista", nomeSala, "alunos", alunoId));
}

export async function buscarAlunos(uid, nomeSala) {
  const escolaId = await getEscolaId(uid);
  const ref = collection(db, "salas", escolaId, "lista", nomeSala, "alunos");
  const snap = await getDocs(query(ref, orderBy("nome", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// 🔥 DESNORMALIZAÇÃO: Agora gravamos ownerUid aqui
export async function salvarPresenca(ownerUid, turmaId, data, registros, atualizadoPorUid) {
  const ref = doc(db, "turmas", ownerUid, "lista", turmaId, "presencas", data);
  await setDoc(ref, {
    data, registros, atualizadoPorUid: atualizadoPorUid || "", atualizadoEm: serverTimestamp(),
    ownerUid: auth.currentUser?.uid || ownerUid // <--- ADICIONADO
  }, { merge: true });
}

export async function buscarPresenca(ownerUid, turmaId, data) {
  const snap = await getDoc(doc(db, "turmas", ownerUid, "lista", turmaId, "presencas", data));
  return snap.exists() ? snap.data() : null;
}

export async function buscarTodasPresencas(ownerUid, turmaId) {
  const ref = collection(db, "turmas", ownerUid, "lista", turmaId, "presencas");
  const snap = await getDocs(query(ref, orderBy("data", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// 🔥 DESNORMALIZAÇÃO: Agora gravamos ownerUid aqui
export async function salvarNotaAluno(ownerUid, turmaId, alunoId, notas, atualizadoPorUid) {
  const ref = doc(db, "turmas", ownerUid, "lista", turmaId, "notas", alunoId);
  await setDoc(ref, {
    alunoId, notas, atualizadoPorUid: atualizadoPorUid || "", atualizadoEm: serverTimestamp(),
    ownerUid: auth.currentUser?.uid || ownerUid // <--- ADICIONADO
  }, { merge: true });
}

// Corrigido: Garante o retorno do objeto completo de notas do aluno
export async function buscarNotasDaTurma(ownerUid, turmaId) {
  const ref = collection(db, "turmas", ownerUid, "lista", turmaId, "notas");
  const snap = await getDocs(ref);
  const mapa = {};
  
  snap.docs.forEach((d) => { 
    const data = d.data();
    mapa[d.id] = {
      alunoId: d.id,
      notas: data.notas || data // Suporta ambos os formatos de gravação
    }; 
  });
  
  return mapa;
}

export async function buscarConfiguracoesEscola(uid) {
  const escolaId = await getEscolaId(uid);
  const snap = await getDoc(doc(db, "configuracoes_escola", `${escolaId}_parametros`));
  if (!snap.exists()) {
    return {
      sistemaAvaliacao: "bimestral", tipoNota: "numerica", mediaAprovacao: 6.0, conceitoAprovacao: "B",
      anoLetivo: new Date().getFullYear().toString(), datasPeriodos: {} 
    };
  }
  return snap.data();
}

export async function salvarConfiguracoesEscola(uid, dados) {
  const escolaId = await getEscolaId(uid);
  await setDoc(doc(db, "configuracoes_escola", `${escolaId}_parametros`), {
    ...dados, escolaId, atualizadoPorUid: uid, atualizadoEm: serverTimestamp()
  }, { merge: true });
}

// Corrigido: Busca pelo campo 'sala' e mapeia o 'ownerUid' e 'disciplina' corretamente
export async function buscarTurmasDaSala(uid, nomeSala) {
  const escolaId = await getEscolaId(uid);
  
  // 1. Busca global de turmas vinculadas à sala selecionada
  const qGroup = query(
    collectionGroup(db, "lista"), 
    where("escolaId", "==", escolaId), 
    where("sala", "==", nomeSala)
  );
  
  const snapGroup = await getDocs(qGroup);
  
  return snapGroup.docs.map(d => {
    // Extrai o UID do dono da turma através do caminho do documento no Firestore
    const parentDoc = d.ref.parent.parent;
    const ownerUid = parentDoc ? parentDoc.id : uid;

    return {
      id: d.id,
      ownerUid: ownerUid,
      disciplina: d.data().disciplina || d.data().nome || "Geral",
      ...d.data()
    };
  });
}

// Lista as avaliações cadastradas numa turma, ordenadas por período e data de criação
export async function buscarAvaliacoes(ownerUid, turmaId) {
  const ref = collection(db, "turmas", ownerUid, "lista", turmaId, "avaliacoes");
  const q = query(ref, orderBy("periodo"), orderBy("criadoEm"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Professor cria uma avaliação nova (ex: "Prova 1", periodo_1, tipo "prova")
export async function criarAvaliacao(ownerUid, turmaId, { nome, periodo, tipo, uid }) {
  const ref = collection(db, "turmas", ownerUid, "lista", turmaId, "avaliacoes");
  const novo = await addDoc(ref, {
    nome,
    periodo,
    tipo: tipo || "avaliacao",
    criadoEm: Date.now(),
    criadoPor: uid,
  });
  return novo.id;
}

// Apaga a avaliação e limpa a nota correspondente de todos os alunos da turma
export async function excluirAvaliacao(ownerUid, turmaId, avaliacaoId, alunoIds) {
  const avaliacaoRef = doc(db, "turmas", ownerUid, "lista", turmaId, "avaliacoes", avaliacaoId);
  await deleteDoc(avaliacaoRef);

  await Promise.all(
    (alunoIds || []).map((alunoId) => {
      const notaRef = doc(db, "turmas", ownerUid, "lista", turmaId, "notas", alunoId);
      return updateDoc(notaRef, {
        [`notasDetalhadas.${avaliacaoId}`]: null,
      }).catch(() => {});
    })
  );
}

// Busca as notas detalhadas (por avaliação) de todos os alunos da turma
export async function buscarNotasDetalhadasDaTurma(ownerUid, turmaId) {
  const ref = collection(db, "turmas", ownerUid, "lista", turmaId, "notas");
  const snap = await getDocs(ref);
  const resultado = {};
  snap.docs.forEach((d) => {
    resultado[d.id] = d.data()?.notasDetalhadas || {};
  });
  return resultado;
}

// Lança/atualiza a nota de UM aluno em UMA avaliação específica
export async function salvarNotaAvaliacao(ownerUid, turmaId, alunoId, avaliacaoId, valor, uid) {
  const notaRef = doc(db, "turmas", ownerUid, "lista", turmaId, "notas", alunoId);
  await setDoc(
    notaRef,
    {
      notasDetalhadas: { [avaliacaoId]: valor },
      atualizadoPor: uid,
      atualizadoEm: Date.now(),
    },
    { merge: true }
  );
}

export async function promoverACoordenador(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    
    await updateDoc(userRef, {
      role: 'coordenador'
    });
    
    console.log("Cargo do usuário atualizado para coordenador com sucesso!");
    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao atualizar o role para coordenador:", error);
    throw error;
  }
}

// Função para checar se já existe uma turma idêntica
export async function verificarTurmaDuplicada(uid, dados, turmaId = null) {
  const escolaId = await getEscolaId(uid);
  const q = query(
    collection(db, "turmas", uid, "lista"),
    where("escolaId", "==", escolaId),
    where("nome", "==", dados.nome),
    where("disciplina", "==", dados.disciplina),
    where("periodo", "==", dados.periodo || "Matutino")
  );
  
  const snap = await getDocs(q);
  
  // Se for uma edição (turmaId não for null), ignoramos o ID da própria turma sendo editada
  return snap.docs.some(doc => doc.id !== turmaId);
}

// Redimensiona a imagem no client antes de subir, pra economizar Storage
// (mesma lógica que vocês já usam na compressão de imagens do audit)
function redimensionarImagem(file, maxDim = 300, qualidade = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = img.width * escala;
      canvas.height = img.height * escala;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', qualidade);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadFotoPerfil(uid, file) {
  const blobRedimensionado = await redimensionarImagem(file);
  const ref = storageRef(storage, `perfis/${uid}/foto.jpg`);
  await uploadBytes(ref, blobRedimensionado, { contentType: 'image/jpeg' });
  const url = await getDownloadURL(ref);
  await setDoc(doc(db, "users", uid), { fotoURL: url, atualizadoEm: serverTimestamp() }, { merge: true });
  return url;
}

export async function removerFotoPerfil(uid) {
  try { await deleteObject(storageRef(storage, `perfis/${uid}/foto.jpg`)); } catch (e) {}
  await setDoc(doc(db, "users", uid), { fotoURL: "", atualizadoEm: serverTimestamp() }, { merge: true });
}