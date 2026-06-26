// src/hooks/useNotificarProfessores.js
//
// Hook centralizado para o coordenador disparar notificações aos professores.
//
// USO:
//   const { notificar } = useNotificarProfessores()
//   await notificar.novaTurma({ nomeTurma: "6º A", link: "/turmas/abc123" })
//
// Todas as funções retornam { sucesso, notificacoesCriadas } ou { sucesso: false, erro }.

import { useCallback } from "react"
import { useAuth } from "../contexts/AuthContext" // ajuste para o seu contexto de auth
import { notificarProfessores } from "../notificacoes/notificacoes"

export function useNotificarProfessores() {
  const { currentUser } = useAuth() // deve expor { uid, displayName }

  const criadoPorUid = currentUser?.uid || null
  const criadoPorNome = currentUser?.displayName || "Coordenação"

  // Helper interno — evita repetir criadoPorUid/criadoPorNome em toda chamada
  const disparar = useCallback(
    (titulo, mensagem, tipo = "aviso", link = null) =>
      notificarProfessores({ titulo, mensagem, tipo, link, criadoPorUid, criadoPorNome }),
    [criadoPorUid, criadoPorNome]
  )

  const notificar = {
    // ─── Turmas ──────────────────────────────────────────────────────────────

    /** Coordenador criou uma turma nova */
    novaTurma: ({ nomeTurma, link = null }) =>
      disparar(
        "Nova turma criada",
        `A turma "${nomeTurma}" foi adicionada. Verifique seus horários.`,
        "turma",
        link
      ),

    /** Coordenador editou dados de uma turma */
    turmaAtualizada: ({ nomeTurma, link = null }) =>
      disparar(
        "Turma atualizada",
        `Informações da turma "${nomeTurma}" foram alteradas.`,
        "turma",
        link
      ),

    /** Coordenador removeu uma turma */
    turmaRemovida: ({ nomeTurma }) =>
      disparar(
        "Turma removida",
        `A turma "${nomeTurma}" foi encerrada ou removida do sistema.`,
        "turma"
      ),

    // ─── Horários ────────────────────────────────────────────────────────────

    /** Coordenador alterou o horário de uma turma ou aula */
    horarioAlterado: ({ nomeTurma, detalhes = null, link = null }) =>
      disparar(
        "Horário alterado",
        detalhes
          ? `O horário da turma "${nomeTurma}" foi alterado: ${detalhes}.`
          : `O horário da turma "${nomeTurma}" foi alterado. Confira no sistema.`,
        "horario",
        link
      ),

    // ─── Calendário ──────────────────────────────────────────────────────────

    /** Coordenador publicou ou atualizou o calendário escolar */
    calendarioAtualizado: ({ descricao = null, link = null }) =>
      disparar(
        "Calendário atualizado",
        descricao || "O calendário escolar foi atualizado. Verifique as novas datas.",
        "calendario",
        link
      ),

    /** Coordenador adicionou um evento ao calendário */
    novoEvento: ({ nomeEvento, data = null, link = null }) =>
      disparar(
        "Novo evento no calendário",
        data
          ? `O evento "${nomeEvento}" foi agendado para ${data}.`
          : `Um novo evento foi adicionado ao calendário: "${nomeEvento}".`,
        "calendario",
        link
      ),

    // ─── Avisos gerais ───────────────────────────────────────────────────────

    /** Aviso genérico — use quando não se encaixar nas categorias acima */
    aviso: ({ titulo, mensagem, link = null }) =>
      disparar(titulo, mensagem, "aviso", link),
  }

  return { notificar }
}