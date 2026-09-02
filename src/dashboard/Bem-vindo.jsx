// src/secoes/Bemvindo.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Joyride, STATUS } from "react-joyride"; // v3: named export, não é mais default
import { doc, updateDoc } from "firebase/firestore";
import { BookOpen, Clock, Calendar, ChevronRight, Layers, PlayCircle, Bell, CircleHelp } from "lucide-react";
import { db } from "../firebase"; // ajuste o caminho conforme seu projeto
import "./Bem-vindo.css";
import { buscarTurmas, buscarLembretes } from "../firebase/estrutura";


// ── Helpers ──────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// NOVO: Resolve o bug de fuso horário separando ano, mês e dia
function converterData(dataStr) {
  if (!dataStr) return new Date();
  const [ano, mes, dia] = dataStr.split("-");
  return new Date(ano, mes - 1, dia); // mes - 1 porque no JS janeiro é 0
}

function hoje() {
  const d = new Date();
  d.setHours(0, 0, 0, 0); // Garante que a comparação seja feita apenas por dia
  return d;
}

function saudacao(nome) {
  const h = new Date().getHours();
  const primeiro = nome?.split(" ")[0] ?? "";
  if (h < 12) return `Bom dia, ${primeiro}!`;
  if (h < 18) return `Boa tarde, ${primeiro}!`;
  return `Boa noite, ${primeiro}!`;
}

// Gera os dias do mês atual para o mini-calendário
function diasDoMes(ano, mes) {
  const primeiro = new Date(ano, mes, 1).getDay();
  const total = new Date(ano, mes + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < primeiro; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  return cells;
}

// Filtra cronogramas que caem no dia da semana de hoje
function aulasDeHoje(cronogramas) {
  const diaAtual = DIAS_SEMANA[hoje().getDay()]; // ex: "Seg"
  return cronogramas.filter((c) => c.dia === diaAtual);
}

// ── Passos do tour de onboarding ─────────────────────────────────────────────
// Cada `target` aponta para um atributo data-tour colocado no JSX abaixo.

const PASSOS_TOUR = [
  {
    target: '[data-tour="saudacao"]',
    title: "Bem-vindo ao ProShelf! ",
    content:
      "Esse é o seu painel principal. Aqui você vê um resumo rápido do seu dia a dia.",
    skipBeacon: true, // v3: renomeado de disableBeacon
    placement: "bottom",
  },
  {
    target: '[data-tour="cronogramas"]',
    title: "Suas aulas e lembretes",
    content:
      "Aqui aparecem as aulas do dia. Clique em qualquer card, ou em 'Ver todos', para ir até a tela completa de cronogramas. Os lembretes ficam mais abaixo e você consegue ver tudo o que foi marcado.",
    placement: "right",
  },
  {
    target: '[data-tour="calendario"]',
    title: "Calendário",
    content:
      "Um mini calendário com seus eventos marcados. Clique em 'Abrir' pra ver a agenda completa.",
    placement: "left",
  },
];

// ── Sub-componente: Mini Calendário ──────────────────────────────────────────

function MiniCalendario({ eventos = [] }) {
  const agora = hoje();
  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth());
  const diaHoje = agora.getDate();
  const mesHoje = agora.getMonth();
  const anoHoje = agora.getFullYear();

  const dias = diasDoMes(ano, mes);

  // dias com evento no mês atual
  const diasComEvento = new Set(
    eventos
      .filter((e) => {
        const d = converterData(e.data); // ANTES ERA: new Date(e.data)
        return d.getFullYear() === ano && d.getMonth() === mes;
      })
      .map((e) => converterData(e.data).getDate()) // ANTES ERA: new Date(e.data).getDate()
  );

  const navMes = (dir) => {
    setMes((m) => {
      const nm = m + dir;
      if (nm < 0) {
        setAno((a) => a - 1);
        return 11;
      }
      if (nm > 11) {
        setAno((a) => a + 1);
        return 0;
      }
      return nm;
    });
  };

  return (
    <div className="bv-calendario">
      <div className="bv-cal-header">
        <button className="bv-cal-nav" onClick={() => navMes(-1)}>
          ‹
        </button>
        <span className="bv-cal-titulo">
          {MESES[mes]} {ano}
        </span>
        <button className="bv-cal-nav" onClick={() => navMes(1)}>
          ›
        </button>
      </div>

      <div className="bv-cal-grid-header">
        {DIAS_SEMANA.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="bv-cal-grid">
        {dias.map((dia, i) => {
          if (!dia) return <span key={`v-${i}`} />;
          const isHoje = dia === diaHoje && mes === mesHoje && ano === anoHoje;
          const temEvento = diasComEvento.has(dia);
          return (
            <span
              key={dia}
              className={`bv-cal-dia ${isHoje ? "hoje" : ""} ${temEvento ? "tem-evento" : ""
                }`}
            >
              {dia}
              {temEvento && <span className="bv-cal-dot" />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Sub-componente: Card de Cronograma ───────────────────────────────────────

const CORES_TURMA = ["#7C3FBD", "#2E7D9C", "#C05621", "#2D6A4F", "#9B2335"];

function formatarHorarioCurto(horario) {
  const texto = String(horario || "").trim();
  const match = texto.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return texto;

  const hora = Number(match[1]);
  const minutos = match[2];
  return minutos === "00" ? `${hora}h` : `${hora}h${minutos}`;
}

function descricaoHorarioCronograma(item) {
  const partes = [];
  if (item.dia) partes.push(item.dia);
  if (item.ordem) {
    const horario = formatarHorarioCurto(item.horario);
    partes.push(
      horario ? `${item.ordem}ª aula (${horario})` : `${item.ordem}ª aula`
    );
  } else if (item.horario) {
    partes.push(formatarHorarioCurto(item.horario));
  }
  return partes.join(" • ") || "Horário não definido";
}

function CardCronograma({ item, index, onClick }) {
  const cor = CORES_TURMA[index % CORES_TURMA.length];
  return (
    <motion.div
      className="bv-card-crono"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      onClick={onClick}
      style={{ "--acento": cor }}
    >
      <div className="bv-crono-faixa" />
      <div className="bv-crono-body">
        <p className="bv-crono-turma">{item.turma ?? "Turma"}</p>
        <p className="bv-crono-disciplina">
          {item.disciplina ?? item.nome ?? "—"}
        </p>
        <div className="bv-crono-meta">
          <Clock size={12} />
          <span>{descricaoHorarioCronograma(item)}</span>
        </div>
      </div>
      <ChevronRight size={15} className="bv-crono-seta" />
    </motion.div>
  );
}



// ── Sub-componente: Próximos Eventos ─────────────────────────────────────────

function ProximosEventos({ eventos = [] }) {
  const agora = hoje();
  const proximos = eventos
    .filter((e) => converterData(e.data) >= agora) // ANTES ERA: new Date(e.data)
    .sort((a, b) => converterData(a.data) - converterData(b.data)) // ANTES ERA: new Date...
    .slice(0, 4);

  if (!proximos.length) {
    return <p className="bv-vazio">Nenhum evento próximo.</p>;
  }

  return (
    <ul className="bv-eventos-lista">
      {proximos.map((ev, i) => {
        const d = converterData(ev.data); // ANTES ERA: new Date(ev.data)
        const dia = String(d.getDate()).padStart(2, "0");
        const mes = MESES[d.getMonth()].slice(0, 3);
        return (
          <motion.li
            key={i}
            className="bv-evento-item"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="bv-evento-data">
              <span className="bv-evento-dia">{dia}</span>
              <span className="bv-evento-mes">{mes}</span>
            </div>
            <div className="bv-evento-info">
              <p className="bv-evento-titulo">
                {ev.titulo ?? ev.nome ?? "Evento"}
              </p>
              {ev.descricao && <p className="bv-evento-desc">{ev.descricao}</p>}
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * @param {object}   professor  – dados do perfil (nome, role, tutorialConcluido, …)
 * @param {string}   uid
 * @param {array}    cronogramas – lista de cronogramas do professor
 * @param {array}    eventos     – lista de eventos do calendário
 * @param {function} onIrCronogramas – callback para navegar até a seção Cronogramas
 * @param {function} onIrCalendario  – callback para navegar até a seção Calendário
 * @param {function} onAtalhoClick  – callback genérico para navegar para qualquer seção via atalho rápido
 */
export default function Bemvindo({
  professor,
  uid,
  cronogramas = [],
  eventos = [],
  onIrCronogramas,
  onIrCalendario,
  onAtalhoClick,
}) {
  const eCoordenador = professor?.role === "coordenador";
  const nome = professor?.nome ?? "";
  const cronogramasHoje = aulasDeHoje(cronogramas);
  const tituloCronogramas = eCoordenador ? "Suas aulas de hoje" : "Próximas aulas";
  const textoVazioCronogramas = eCoordenador
    ? "Nenhuma aula agendada para hoje."
    : "Nenhuma aula agendada para hoje.";

    // --- CONFIG DO DASHBOARD ---
  const COR_TIPO = {
    atividade: { bg: "#FFBB00", badgeBg: "#FFF7E6", text: "#B28200", label: "Atividade" },
    avaliacao: { bg: "#188AF5", badgeBg: "#E8F3FE", text: "#1060AA", label: "Avaliação" },
  };

  const [lembretesGerais, setLembretesGerais] = useState([]);
  const [filtroTempo, setFiltroTempo] = useState("7dias"); // "7dias", "15dias", "todos"
  const [carregandoLems, setCarregandoLems] = useState(true);

  // --- BUSCA DOS LEMBRETES ---
  useEffect(() => {
    if (uid && professor) {
      async function carregarLembretesDashboard() {
        setCarregandoLems(true);
        try {
          const turmas = await buscarTurmas(uid, professor);
          let todosAgendamentos = [];
          
          for (const t of turmas) {
            const owner = t.ownerUid || uid;
            const lemsDaTurma = await buscarLembretes(owner, t.id);
            
            // Adiciona a qual turma esse lembrete pertence
            const mapeados = lemsDaTurma.map(l => ({
              ...l,
              turmaNome: t.nome,
              turmaDisciplina: t.disciplina
            }));
            todosAgendamentos.push(...mapeados);
          }
          
          setLembretesGerais(todosAgendamentos);
        } catch (e) {
          console.error("Erro ao carregar lembretes para o dashboard", e);
        } finally {
          setCarregandoLems(false);
        }
      }
      
      carregarLembretesDashboard();
    }
  }, [uid, professor]);

  // --- FILTRO DE TEMPO ---
  const dataDeHoje = hoje();
  const lembretesExibicao = lembretesGerais.filter(l => {
    const dataLembrete = converterData(l.data);
    
    // Esconde os que já passaram
    if (dataLembrete < dataDeHoje) return false; 
    
    const diferencaDias = Math.ceil(Math.abs(dataLembrete - dataDeHoje) / (1000 * 60 * 60 * 24));
    
    if (filtroTempo === "7dias") return diferencaDias <= 7;
    if (filtroTempo === "15dias") return diferencaDias <= 15;
    return true; // "todos"
  }).sort((a, b) => converterData(a.data) - converterData(b.data));

  // ── Onboarding tour ──
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    // Só dispara o tour se o professor já carregou e ainda não viu o onboarding
    if (professor && professor.tutorialConcluido !== true) {
      // pequeno delay pra garantir que os elementos já renderizaram
      const timer = setTimeout(() => setRunTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, [professor]);

  const marcarTutorialConcluido = async () => {
    if (!uid) return;
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { tutorialConcluido: true });
    } catch (erro) {
      console.error("Erro ao marcar tutorial como concluído:", erro);
    }
  };

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
      marcarTutorialConcluido();
    }
  };

  const reiniciarTutorial = () => {
    setRunTour(true);
  };

  return (
    <div className="bv-wrapper">
<Joyride
        steps={PASSOS_TOUR}
        run={runTour}
        continuous
        onEvent={handleJoyrideCallback}
        locale={{
          back: "Voltar",
          close: "Fechar",
          last: "Concluir",
          next: "Próximo",
          skip: "Pular",
          primary: "Próximo",
        }}
        // Na V3, as opções de cores gerais, z-index e overlay viraram uma propriedade separada!
        options={{
          primaryColor: "#6F3B9D",
          zIndex: 10000, // Agora sim o Joyride vai cobrir o cabeçalho
          overlayColor: "rgba(0, 0, 0, 0.35)", // O mesmo fundo cinza transparente do seu site
          showProgress: true,
          backgroundColor: "#ffffff",
          textColor: "#1a1a1a",
          buttons: ["back", "close", "primary", "skip"]
        }}
        styles={{
          tooltip: {
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
          },
          tooltipTitle: {
            fontSize: "16px",
            fontWeight: "600",
            color: "#1a1a1a",
            marginBottom: "8px",
          },
          tooltipContent: {
            fontSize: "14px",
            color: "#666",
            lineHeight: "1.5",
          },
          // Na V3, o botão "Próximo" chama buttonPrimary em vez de buttonNext
          buttonPrimary: { 
            backgroundColor: "#6F3B9D",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "600",
            transition: "background 0.2s",
          },
          buttonBack: {
            color: "#666",
            marginRight: "14px",
            fontSize: "14px",
            fontWeight: "500",
          },
          buttonSkip: {
            color: "#666",
            fontSize: "14px",
            fontWeight: "500",
          }
        }}
      />

      {/* ── Cabeçalho de boas-vindas ── */}
      <motion.div
        className="bv-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
<div className="bv-header-texto" data-tour="saudacao">
  <div className="bv-header-topo">
    {professor?.fotoURL ? (
      <img src={professor.fotoURL} alt="Foto de perfil" className="bv-avatar-saudacao" />
    ) : (
      <div className="bv-avatar-saudacao bv-avatar-inicial">
        {nome?.charAt(0).toUpperCase() || "?"}
      </div>
    )}
    <div>
      <h1 className="bv-saudacao">
        {eCoordenador ? " " : ""}
        {saudacao(nome)}
      </h1>
      <p className="bv-subtitulo">
        {new Date().toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>
  </div>
</div>

        {/* Chips de resumo */}
        <div className="bv-chips">
          <div className="bv-chip">
            <Layers size={14} />
            <span>
              {eCoordenador
                ? `${cronogramasHoje.length} aulas hoje ${cronogramasHoje.length !== 1 ? "" : ""
                }`
                : cronogramasHoje.length > 0
                  ? `${cronogramasHoje.length} próxima${cronogramasHoje.length > 1 ? "s" : ""} aula${cronogramasHoje.length > 1 ? "s" : ""}`
                  : "Sem próximas aulas"}
            </span>
          </div>
          <div className="bv-chip">
            <Calendar size={14} />
            <span>
              {eventos.filter((e) => converterData(e.data) >= hoje()).length}{" "}
              evento
              {eventos.filter((e) => converterData(e.data) >= hoje()).length !==
                1
                ? "s"
                : ""}{" "}
              próximo
              {eventos.filter((e) => converterData(e.data) >= hoje()).length !==
                1
                ? "s"
                : ""}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Corpo ── */}
      <div className="bv-corpo">
        {/* Coluna esquerda: cronogramas */}
        <section className="bv-secao" data-tour="cronogramas">
          <div className="bv-secao-header">
            <div className="bv-secao-titulo">
              <BookOpen size={15} />
              <h2>{tituloCronogramas}</h2>
            </div>
            <button className="bv-link" onClick={onIrCronogramas}>
              Ver todos <ChevronRight size={13} />
            </button>
          </div>

          {cronogramasHoje.length === 0 ? (
            <p className="bv-vazio">{textoVazioCronogramas}</p>
          ) : (
            <div className="bv-crono-lista">
              {cronogramasHoje.slice(0, 5).map((c, i) => (
                <CardCronograma
                  key={c.id ?? i}
                  item={c}
                  index={i}
                  onClick={onIrCronogramas}
                />
              ))}
            </div>

            
          )}
          {/* 🔴 NOVA ÁREA: CENTRO DE LEMBRETES */}
          <div className="bv-lembretes-header">
            <div className="bv-secao-titulo">
              <Bell size={16} />
              <h2>Agenda de Lembretes</h2>
            </div>
            
            <div className="bv-lembretes-filtros">
              <button 
                className={`bv-filtro-btn ${filtroTempo === "7dias" ? "ativo" : ""}`} 
                onClick={() => setFiltroTempo("7dias")}
              >
                Esta semana
              </button>
              <button 
                className={`bv-filtro-btn ${filtroTempo === "15dias" ? "ativo" : ""}`} 
                onClick={() => setFiltroTempo("15dias")}
              >
                15 dias
              </button>
              <button 
                className={`bv-filtro-btn ${filtroTempo === "todos" ? "ativo" : ""}`} 
                onClick={() => setFiltroTempo("todos")}
              >
                Todos
              </button>
            </div>
          </div>

          {carregandoLems ? (
            <p className="bv-vazio">Buscando agendamentos...</p>
          ) : lembretesExibicao.length === 0 ? (
            <p className="bv-vazio">
              {filtroTempo === "todos" 
                ? "Você não possui nenhum evento futuro agendado." 
                : "Nenhum evento neste período."}
            </p>
          ) : (
            <div className="bv-lembretes-grid">
              {lembretesExibicao.map((lembrete) => {
                const cfg = COR_TIPO[lembrete.tipo] || COR_TIPO.avaliacao;
                const formatada = lembrete.data.split("-").reverse().join("/");
                const diferencaDias = Math.ceil(Math.abs(converterData(lembrete.data) - dataDeHoje) / (1000 * 60 * 60 * 24));
                const textoUrgencia = diferencaDias === 0 ? "Hoje" : diferencaDias === 1 ? "Amanhã" : `Daqui a ${diferencaDias} dias`;

                return (
                  <div key={lembrete.id} className="bv-lembrete-card">
                    <div className="bv-lembrete-faixa" style={{ background: cfg.bg }} />
                    
                    <div className="bv-lembrete-topo">
                      <span className="bv-lembrete-badge" style={{ background: cfg.badgeBg, color: cfg.text }}>
                        {cfg.label}
                      </span>
                      <span className="bv-lembrete-data">
                        {formatada} • {textoUrgencia}
                      </span>
                    </div>
                    
                    <h4 className="bv-lembrete-titulo">{lembrete.titulo}</h4>
                    <p className="bv-lembrete-turma">{lembrete.turmaDisciplina} - {lembrete.turmaNome}</p>
                  </div>
                );
              })}
            </div>
          )}
          {/* FIM DA ÁREA DO CENTRO DE LEMBRETES */}
                  </section>

                  

        {/* Coluna direita: calendário + próximos eventos */}
        <aside className="bv-aside">
          {/* Mini calendário */}
          <div className="bv-card-aside" data-tour="calendario">
            <div className="bv-secao-header">
              <div className="bv-secao-titulo">
                <Calendar size={15} />
                <h2>Calendário</h2>
              </div>
              <button className="bv-link" onClick={onIrCalendario}>
                Abrir <ChevronRight size={13} />
              </button>
            </div>
            <MiniCalendario eventos={eventos} />
          </div>
        </aside>
      </div>

      {/* ── Botão flutuante de ajuda/tutorial ── */}
<button
  type="button"
  onClick={reiniciarTutorial}
  title="Ver tutorial"
  aria-label="Ver tutorial"
  style={{
    position: "fixed",
    right: "24px",
    bottom: "24px",
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    border: "none",
    background: "var(--roxo)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)",
    zIndex: 9998,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "scale(1.08)";
    e.currentTarget.style.boxShadow =
      "0 10px 28px rgba(0, 0, 0, 0.24)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow =
      "0 8px 24px rgba(0, 0, 0, 0.18)";
  }}
>
  <CircleHelp size={25} strokeWidth={2.2} />
</button>

    </div>
  );
}