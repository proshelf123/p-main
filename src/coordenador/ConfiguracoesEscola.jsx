import { useEffect, useState } from "react";
import { Settings, Calendar, Save, CheckCircle, TriangleAlert } from "lucide-react";
import { buscarConfiguracoesEscola, salvarConfiguracoesEscola } from "../firebase/estrutura";

// Importe seus componentes customizados 
import DropdownComPortal from "../secoes/DropwdownComPortal";
import CustomDatePicker from "../secoes/dropdown-calendario";

const obterPeriodosDefault = (sistema) => {
    switch (sistema) {
        case "trimestral":
            return [
                { key: "periodo_1", label: "1º Trimestre" },
                { key: "periodo_2", label: "2º Trimestre" },
                { key: "periodo_3", label: "3º Trimestre" },
            ];
        case "semestral":
            return [
                { key: "periodo_1", label: "1º Semestre" },
                { key: "periodo_2", label: "2º Semestre" },
            ];
        case "livre":
            return [{ key: "periodo_1", label: "Avaliação Única/Final" }];
        case "bimestral":
        default:
            return [
                { key: "periodo_1", label: "1º Bimestre" },
                { key: "periodo_2", label: "2º Bimestre" },
                { key: "periodo_3", label: "3º Bimestre" },
                { key: "periodo_4", label: "4º Bimestre" },
            ];
    }
};

const OPCOES_AVALIACAO = [
    { valor: "bimestral", label: "Bimestral (4 notas)" },
    { valor: "trimestral", label: "Trimestral (3 notas)" },
    { valor: "semestral", label: "Semestral (2 notas)" },
    { valor: "livre", label: "Avaliação Única (1 nota)" }
];

const OPCOES_TIPO_NOTA = [
    { valor: "numerica", label: "Numérica (0 a 10)" },
    { valor: "etec", label: "Conceitos ETEC (MB, B, R, I)" },
    { valor: "letras", label: "Letras (A+, A, B, C...)" }
];

// --- MODAL DE CONFIGURAÇÕES SALVAS COM SUCESSO ---
function ModalConfiguracoesSalvas({ onFechar }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onFechar();
        }, 2500); // O modal fechará passados 2,5 segundos
        return () => clearTimeout(timer);
    }, [onFechar]);

    return (
        <>
            <div className='modal-confirmar-overlay' onClick={onFechar} style={{ zIndex: 99999 }} />
            <div className='modal-confirmar' style={{ zIndex: 100000 }}>
                <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: '#D1FAE5', // Verde bem claro para o fundo do ícone
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                    animation: 'confirm-icon-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both'
                }}>
                    <CheckCircle size={26} color='#10B981' strokeWidth={2.2} /> {/* Verde esmeralda */}
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: '0 0 8px', textAlign: 'center' }}>
                    Configurações salvas!
                </h3>

                <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 20px', textAlign: 'center', lineHeight: 1.5 }}>
                    As regras da escola foram atualizadas e já estão ativas no sistema.
                </p>

                <div style={{ display: 'flex' }}>
                    <button
                        onClick={onFechar}
                        style={{
                            flex: 1, padding: '11px', borderRadius: 10,
                            border: 'none', background: '#10B981', // Verde principal
                            fontSize: 13, fontFamily: "'Poppins', sans-serif",
                            fontWeight: 600, color: '#fff', cursor: 'pointer',
                            transition: 'all .15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'scale(1.02)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.transform = 'scale(1)' }}
                    >
                        Entendi
                    </button>
                </div>
            </div>
        </>
    )
}

export default function ConfiguracoesEscola({ uid }) {
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [mostrarModalSalvo, setMostrarModalSalvo] = useState(false);
    const [erro, setErro] = useState("");
    const [animacaoErro, setAnimacaoErro] = useState(0); // dispara a animação da caixa de erro a cada novo erro

    // ESTADO GLOBAL PARA OS DROPDOWNS CUSTOMIZADOS FECHAREM UNS AOS OUTROS
    const [dropdownAberto, setDropdownAberto] = useState(null);

    const [config, setConfig] = useState({
        sistemaAvaliacao: "bimestral",
        tipoNota: "numerica",
        mediaAprovacao: 6.0,
        conceitoAprovacao: "B",
        anoLetivo: new Date().getFullYear().toString(),
        datasPeriodos: {}
    });

    const dispararErro = (mensagem) => {
        setErro(mensagem);
        setAnimacaoErro((valorAtual) => valorAtual + 1);
    };

    useEffect(() => {
        carregar();
    }, [uid]);

    async function carregar() {
        try {
            const dados = await buscarConfiguracoesEscola(uid);
            // CORREÇÃO 1: Mescla os dados do banco com o estado padrão para garantir 
            // que "datasPeriodos" nunca seja undefined em escolas antigas.
            setConfig((prev) => ({
                ...prev,
                ...dados,
                datasPeriodos: dados?.datasPeriodos || {} 
            }));
        } catch (error) {
            dispararErro("Não foi possível carregar as configurações.");
        } finally {
            setLoading(false);
        }
    }

    function handleDataChange(periodoKey, tipo, valor) {
        setConfig((prev) => {
            // CORREÇÃO 2: Garante que os objetos existam antes de usar o spread (...)
            const safeDatasPeriodos = prev.datasPeriodos || {};
            const safePeriodoAtual = safeDatasPeriodos[periodoKey] || {};

            return {
                ...prev,
                datasPeriodos: {
                    ...safeDatasPeriodos,
                    [periodoKey]: {
                        ...safePeriodoAtual,
                        [tipo]: valor
                    }
                }
            };
        });
    }

    async function salvar() {
        setSalvando(true); setErro("");
        try {
            await salvarConfiguracoesEscola(uid, config);
            setMostrarModalSalvo(true);
        } catch (error) {
            dispararErro("Erro ao salvar as configurações.");
        } finally {
            setSalvando(false);
        }
    }

    if (loading) return <p className="secao-vazia">Carregando configurações...</p>;

    const periodosAtuais = obterPeriodosDefault(config.sistemaAvaliacao);

    return (
        <div>

            <div style={{ paddingLeft: "15px", borderLeft: "3px solid var(--roxo)", marginBottom: 32 }}>
                <span className='upload-badge' style={{ marginBottom: '8px', display: 'inline-block' }}>Coordenador</span>
                {/* CORREÇÃO DO ESPAÇAMENTO DO TÍTULO */}
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--texto)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}> 
                    Configurações da Escola
                </h2>
                <p style={{ fontSize: 14, color: "var(--texto-sec)", margin: "4px 0 0" }}>
                    Defina as regras globais do ano letivo, média e prazos de lançamento de notas.
                </p>
            </div>

            {erro && (
                <div
                    key={animacaoErro}
                    className='upload-erro upload-erro-anim'
                    style={{ marginBottom: 16 }}
                >
                    <TriangleAlert size={18} /> {erro}
                </div>
            )}

            {/* --- BLOCO 1: REGRAS GERAIS --- */}
            <h3 style={{ fontSize: 15, color: "var(--roxo)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>Regras Gerais</h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
                <div className="perfil-grupo">
                    <label className="perfil-label">Ano Letivo Vigente</label>
                    <input
                        type="number"
                        className="perfil-input"
                        value={config.anoLetivo}
                        onChange={(e) => setConfig({ ...config, anoLetivo: e.target.value })}
                    />
                </div>

                <div style={{ width: "100%" }}>
                    <DropdownComPortal
                        id="dropdown-sistema-avaliacao"
                        label="Formato de Avaliação"
                        opcoes={OPCOES_AVALIACAO}
                        valor={config.sistemaAvaliacao}
                        onChange={(novoValor) => {
                            setConfig({ ...config, sistemaAvaliacao: novoValor, datasPeriodos: {} });
                        }}
                        dropdownAberto={dropdownAberto}
                        setDropdownAberto={setDropdownAberto}
                    />
                </div>

                <div style={{ width: "100%" }}>
                    <DropdownComPortal
                        id="dropdown-tipo-nota"
                        label="Formato de Nota"
                        opcoes={OPCOES_TIPO_NOTA}
                        valor={config.tipoNota || "numerica"}
                        onChange={(novoValor) => {
                            setConfig({ ...config, tipoNota: novoValor });
                        }}
                        dropdownAberto={dropdownAberto}
                        setDropdownAberto={setDropdownAberto}
                    />
                </div>

                <div className="perfil-grupo">
                    <label className="perfil-label">
                        {(!config.tipoNota || config.tipoNota === "numerica") 
                            ? "Média de Aprovação" 
                            : "Conceito Mín. p/ Aprovação"}
                    </label>
                    
                    {(!config.tipoNota || config.tipoNota === "numerica") ? (
                        <input
                            type="number"
                            step="0.1"
                            min="0" max="10"
                            className="perfil-input"
                            value={config.mediaAprovacao}
                            onChange={(e) => setConfig({ ...config, mediaAprovacao: parseFloat(e.target.value) })}
                        />
                    ) : (
                        <input
                            type="text"
                            className="perfil-input"
                            placeholder="Ex: B, C, R..."
                            value={config.conceitoAprovacao || ""}
                            onChange={(e) => setConfig({ ...config, conceitoAprovacao: e.target.value })}
                        />
                    )}
                </div>
            </div>

            {/* --- BLOCO 2: CALENDÁRIO DE NOTAS --- */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Calendar size={20} color="var(--roxo)" />
                <h3 style={{ fontSize: 15, color: "var(--roxo)", textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>
                    Prazos de Lançamento (Bloqueio de Sistema)
                </h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--texto-sec)", marginBottom: 20 }}>
                Se você definir datas, os professores <b>só poderão digitar notas</b> dentro desse intervalo. Fora do prazo, os campos ficarão bloqueados. Deixe em branco se não quiser bloquear.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                {periodosAtuais.map((periodo) => (
                    <div key={periodo.key} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px", borderRadius: 12, border: "2px solid var(--borda)", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--texto)", minWidth: 120 }}>
                            {periodo.label}
                        </span>

                        <div style={{ flex: 1, minWidth: 140 }}>
                            <CustomDatePicker
                                id={`${periodo.key}-inicio`}
                                label="Abre em (Início)"
                                // CORREÇÃO 3: Adicionado o `?.` antes do [periodo.key]
                                value={config.datasPeriodos?.[periodo.key]?.inicio || ""}
                                onChange={(dataStr) => handleDataChange(periodo.key, "inicio", dataStr)}
                                dropdownAberto={dropdownAberto}
                                setDropdownAberto={setDropdownAberto}
                            />
                        </div>

                        <div style={{ flex: 1, minWidth: 140 }}>
                            <CustomDatePicker
                                id={`${periodo.key}-fim`}
                                label="Fecha em (Fim)"
                                // CORREÇÃO 3: Adicionado o `?.` antes do [periodo.key]
                                value={config.datasPeriodos?.[periodo.key]?.fim || ""}
                                onChange={(dataStr) => handleDataChange(periodo.key, "fim", dataStr)}
                                dropdownAberto={dropdownAberto}
                                setDropdownAberto={setDropdownAberto}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <button className="perfil-salvar" onClick={salvar} disabled={salvando} style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                <Save size={18} />
                {salvando ? "Salvando parâmetros..." : "Salvar Configurações da Escola"}
            </button>

            {/* RENDERIZA O MODAL DE SUCESSO AO SALVAR */}
            {mostrarModalSalvo && (
                <ModalConfiguracoesSalvas onFechar={() => setMostrarModalSalvo(false)} />
            )}

        </div>
    );
}