import { useEffect, useState } from "react";
import { Settings, Calendar, Save, CheckCircle } from "lucide-react";
import { buscarConfiguracoesEscola, salvarConfiguracoesEscola } from "../firebase/estrutura";

// Importe seus componentes customizados (ajuste o caminho se necessário)
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

export default function ConfiguracoesEscola({ uid }) {
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState("");
    const [erro, setErro] = useState("");

    // ESTADO GLOBAL PARA OS DROPDOWNS CUSTOMIZADOS FECHAREM UNS AOS OUTROS
    const [dropdownAberto, setDropdownAberto] = useState(null);

    const [config, setConfig] = useState({
        sistemaAvaliacao: "bimestral",
        mediaAprovacao: 6.0,
        anoLetivo: new Date().getFullYear().toString(),
        datasPeriodos: {}
    });

    useEffect(() => {
        carregar();
    }, [uid]);

    async function carregar() {
        try {
            const dados = await buscarConfiguracoesEscola(uid);
            setConfig(dados);
        } catch (error) {
            setErro("Não foi possível carregar as configurações.");
        } finally {
            setLoading(false);
        }
    }

    function handleDataChange(periodoKey, tipo, valor) {
        setConfig((prev) => ({
            ...prev,
            datasPeriodos: {
                ...prev.datasPeriodos,
                [periodoKey]: {
                    ...prev.datasPeriodos[periodoKey],
                    [tipo]: valor
                }
            }
        }));
    }

    async function salvar() {
        setSalvando(true); setErro(""); setMensagem("");
        try {
            await salvarConfiguracoesEscola(uid, config);
            setMensagem("Configurações salvas com sucesso!");
            setTimeout(() => setMensagem(""), 3000);
        } catch (error) {
            setErro("Erro ao salvar as configurações.");
        } finally {
            setSalvando(false);
        }
    }

    if (loading) return <p className="secao-vazia">Carregando configurações...</p>;

    const periodosAtuais = obterPeriodosDefault(config.sistemaAvaliacao);

    return (
        <div style={{ maxWidth: 800, margin: "0 auto" }}>

            <div style={{ paddingLeft: "15px", borderLeft: "3px solid var(--roxo)", marginBottom: 32 }}>
                          <span className='upload-badge' style={{ marginBottom: '8px', display: 'inline-block' }}>Coordenador</span>

                <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--texto)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}> Configuraçõesda Escola
                </h2>
                <p style={{ fontSize: 14, color: "var(--texto-sec)", margin: "4px 0 0" }}>
                    Defina as regras globais do ano letivo, média e prazos de lançamento de notas.
                </p>
            </div>

            {erro && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 16 }}>{erro}</p>}
            {mensagem && <p style={{ color: "#047857", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><CheckCircle size={16} />{mensagem}</p>}

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

                <div className="perfil-grupo">
                    <label className="perfil-label">Média de Aprovação</label>
                    <input
                        type="number"
                        step="0.1"
                        min="0" max="10"
                        className="perfil-input"
                        value={config.mediaAprovacao}
                        onChange={(e) => setConfig({ ...config, mediaAprovacao: parseFloat(e.target.value) })}
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
                                value={config.datasPeriodos[periodo.key]?.inicio || ""}
                                onChange={(dataStr) => handleDataChange(periodo.key, "inicio", dataStr)}
                                dropdownAberto={dropdownAberto}
                                setDropdownAberto={setDropdownAberto}
                            />
                        </div>

                        <div style={{ flex: 1, minWidth: 140 }}>
                            <CustomDatePicker
                                id={`${periodo.key}-fim`}
                                label="Fecha em (Fim)"
                                value={config.datasPeriodos[periodo.key]?.fim || ""}
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

        </div>
    );
}