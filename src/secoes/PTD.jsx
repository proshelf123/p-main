import React, { useState, useEffect, useRef } from 'react';
import './ptd.css';
import { Printer, RotateCcw, Eye, Plus, Trash2, Lock } from 'lucide-react';
import { 
  buscarTurmas, 
  escutarProfessoresDisciplinas, 
  buscarConfiguracoesEscola 
} from '../firebase/estrutura';
import DropdownComPortal from './DropwdownComPortal';

// Componente que quebra linha e estica a caixa automaticamente
function AutoTextarea({ value, onChange, placeholder, minRows = 1, readOnly = false, className = "" }) {
  const textareaRef = useRef(null);

  const ajustarAltura = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    ajustarAltura();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      rows={minRows}
      className={`ptd-auto-textarea ${className}`}
    />
  );
}

function gerarConteudoPorSistema(sistema = "bimestral") {
  switch (sistema) {
    case "trimestral":
      return [
        { periodo: "1º Trimestre", temas: "Arquitetura REST, Ciclo de Vida em React, Hooks e Gerenciamento de Estado." },
        { periodo: "2º Trimestre", temas: "Consumo de APIs assíncronas, Axios/Fetch, Autenticação JWT e Rotas Protegidas." },
        { periodo: "3º Trimestre", temas: "Testes automatizados, Estilização com Design System e Projeto Integrador Final." },
      ];
    case "semestral":
      return [
        { periodo: "1º Semestre", temas: "Fundamentos avançados de desenvolvimento cliente-servidor, componentes e autenticação." },
        { periodo: "2º Semestre", temas: "Consumo e construção de APIs REST, testes contínuos e Projeto Integrador Final." },
      ];
    case "livre":
      return [
        { periodo: "Avaliação Única/Final", temas: "Desenvolvimento prático e contínuo de projetos integradores ao longo do módulo." },
      ];
    case "bimestral":
    default:
      return [
        { periodo: "1º Bimestre", temas: "Arquitetura REST, Ciclo de Vida em React, Hooks e Gerenciamento de Estado." },
        { periodo: "2º Bimestre", temas: "Consumo de APIs assíncronas, Axios/Fetch, Autenticação JWT e Rotas Protegidas." },
        { periodo: "3º Bimestre", temas: "Estilização avançada, Design System e Acessibilidade (WCAG)." },
        { periodo: "4º Bimestre", temas: "Testes automatizados, Deploy contínuo e Projeto Integrador Final." },
      ];
  }
}

const MODELO_PADRAO_PEDAGOGICO = {
  ementa: "Construção de ecossistemas web com arquitetura cliente-servidor; consumo e criação de APIs REST; persistência de dados em ambiente cloud; autenticação segura e componentização de interfaces com foco em usabilidade.",
  objetivos: "Capacitar o estudante a planejar, projetar e codificar sistemas web escaláveis, aplicando boas práticas de arquitetura front-end e integração de microsserviços.",
  competencias: [
    "Modelar e integrar bancos de dados relacionais e não-relacionais com front-end reativo.",
    "Implementar autenticação, controle de permissões e boas práticas de segurança (OWASP).",
    "Desenvolver interfaces componentizadas com foco em acessibilidade e responsividade."
  ],
  metodologia: "Aulas práticas em laboratório com metodologia de Aprendizagem Baseada em Projetos (PBL). Estudos de caso e code reviews colaborativos.",
  avaliacao: "Projetos práticos integradores em equipe (peso 50%), desafios práticos individuais (peso 30%) e engajamento contínuo em sala (peso 20%).",
  recursos: "Laboratório de computadores com acesso à internet, Node.js, VS Code, Git/GitHub e plataforma ProShelf.",
  bibliografia: "FREEMAN, Adam. Pro React 16. Apress, 2020.\nSILVA, Maurício. Construindo Aplicações Web Modernas. Editora Novatec, 2022."
};

function extrairAnoECurso(nomeTurma = "") {
  const match = nomeTurma.match(/^(\d+[º°ªa]?\s*(?:ano|módulo|modulo)?)\s*[-:]?\s*(.*)$/i);
  if (match) {
    const anoEncontrado = match[1].trim();
    const cursoEncontrado = match[2].trim();
    const numero = anoEncontrado.match(/\d+/)?.[0];
    const moduloFormatado = numero ? `${numero}º Módulo / ${numero}º Ano` : anoEncontrado;
    return {
      modulo: moduloFormatado,
      curso: cursoEncontrado || nomeTurma
    };
  }
  return {
    modulo: "Módulo Único",
    curso: nomeTurma
  };
}

export default function PTDGenerator({ uid, professor }) {
  const [turmasDisponiveis, setTurmasDisponiveis] = useState([]);
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState([]);
  const [turmaSelecionadaRaw, setTurmaSelecionadaRaw] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(null);
  const [sistemaEscola, setSistemaEscola] = useState("bimestral");

  const [dados, setDados] = useState({
    instituicao: "",
    curso: "",
    modulo: "",
    componente: "",
    cargaHoraria: "80h",
    professor: "",
    anoLetivo: `${new Date().getFullYear()} - 2º Semestre`,
    conteudo: gerarConteudoPorSistema("bimestral"),
    ...MODELO_PADRAO_PEDAGOGICO
  });

  const [visualizacaoDocumento, setVisualizacaoDocumento] = useState(false);

  useEffect(() => {
    if (!uid) return;

    async function carregarDadosIniciais() {
      let nomeEscola = professor?.instituicao || "";
      let sistema = "bimestral";
      let anoConfig = new Date().getFullYear().toString();

      try {
        const config = await buscarConfiguracoesEscola(uid);
        if (config) {
          nomeEscola = config.nomeEscola || config.instituicao || nomeEscola || "Escola Técnica / ProShelf Edu";
          sistema = config.sistemaAvaliacao || "bimestral";
          if (config.anoLetivo) anoConfig = config.anoLetivo;
        }
      } catch {
        nomeEscola = nomeEscola || "ProShelf Edu";
      }

      setSistemaEscola(sistema);

      setDados(prev => ({
        ...prev,
        instituicao: nomeEscola,
        professor: professor?.nome || professor?.nomeUsuario || "Professor",
        anoLetivo: `${anoConfig} - 2º Semestre`,
        conteudo: gerarConteudoPorSistema(sistema)
      }));

      try {
        const turmas = await buscarTurmas(uid, professor);
        const nomesUnicos = [...new Set(turmas.map(t => t.nome).filter(Boolean))];
        setTurmasDisponiveis(nomesUnicos);

        if (nomesUnicos.length > 0) {
          const primeira = nomesUnicos[0];
          setTurmaSelecionadaRaw(primeira);
          const { modulo, curso } = extrairAnoECurso(primeira);
          setDados(prev => ({ ...prev, curso, modulo }));
        }
      } catch (err) {
        console.error("Erro ao carregar turmas para o PTD:", err);
      }
    }

    carregarDadosIniciais();

    const unsub = escutarProfessoresDisciplinas(uid, (vinculos) => {
      const nomeProf = (professor?.nome || "").toLowerCase().trim();
      const uidProf = (uid || "").trim();
      const role = professor?.role || "";
      const materias = new Set();

      Object.entries(vinculos || {}).forEach(([materia, profVinculado]) => {
        if (role === "coordenador") {
          materias.add(materia);
          return;
        }

        if (typeof profVinculado === "string") {
          if (profVinculado.toLowerCase().includes(nomeProf) || profVinculado === uidProf) {
            materias.add(materia);
          }
        } else if (typeof profVinculado === "object" && profVinculado !== null) {
          const valores = Object.values(profVinculado).map(v => String(v || "").toLowerCase());
          if (valores.some(v => v.includes(nomeProf) || v === uidProf)) {
            materias.add(materia);
          }
        }
      });

      const listaMaterias = [...materias];
      setDisciplinasDisponiveis(listaMaterias);

      if (listaMaterias.length > 0) {
        setDados(prev => ({ ...prev, componente: prev.componente || listaMaterias[0] }));
      }
    });

    return () => unsub();
  }, [uid, professor]);

  const handleSelecionarTurma = (valorTurma) => {
    setTurmaSelecionadaRaw(valorTurma);

    if (!valorTurma) {
      setDados(prev => ({ ...prev, curso: "", modulo: "" }));
      return;
    }

    const { modulo, curso } = extrairAnoECurso(valorTurma);
    setDados(prev => ({ ...prev, curso, modulo }));
  };

  const handleChange = (campo, valor) => {
    setDados(prev => ({ ...prev, [campo]: valor }));
  };

  const handleCompetenciaChange = (index, valor) => {
    const novas = [...dados.competencias];
    novas[index] = valor;
    setDados(prev => ({ ...prev, competencias: novas }));
  };

  const adicionarCompetencia = () => {
    setDados(prev => ({ ...prev, competencias: [...prev.competencias, ""] }));
  };

  const removerCompetencia = (index) => {
    setDados(prev => ({ ...prev, competencias: prev.competencias.filter((_, i) => i !== index) }));
  };

  const handleConteudoChange = (index, campo, valor) => {
    const novos = [...dados.conteudo];
    novos[index][campo] = valor;
    setDados(prev => ({ ...prev, conteudo: novos }));
  };

  const restaurarModeloPadrao = () => {
    setDados(prev => ({
      ...prev,
      ...MODELO_PADRAO_PEDAGOGICO,
      conteudo: gerarConteudoPorSistema(sistemaEscola)
    }));
  };

  return (
    <div className="ptd-container">
      {/* CABEÇALHO */}
      <div className="ptd-header">
        <div className="ptd-titulo-bloco">
          <h1 className="ptd-titulo">Plano de Trabalho Docente (PTD)</h1>
          <p className="ptd-subtitulo">Preencha o modelo e gere o documento final para impressão acadêmica.</p>
        </div>

        <div className="ptd-acoes">
          <button
            type="button"
            onClick={() => setVisualizacaoDocumento(!visualizacaoDocumento)}
            className="btn-ptd btn-ptd-outline"
          >
            <Eye size={16} />
            {visualizacaoDocumento ? "Voltar à Edição" : "Visualizar Folha"}
          </button>

          <button
            type="button"
            onClick={restaurarModeloPadrao}
            className="btn-ptd btn-ptd-laranja"
          >
            <RotateCcw size={16} />
            Restaurar Ementa Base
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn-ptd btn-ptd-roxo"
          >
            <Printer size={16} />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* CONTEÚDO */}
      {!visualizacaoDocumento ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* 1. DADOS DE IDENTIFICAÇÃO */}
          <div className="ptd-card" style={{ margin: 0 }}>
            <div className="ptd-card-topo">
              <span className="ptd-secao-titulo">
                <span className="ptd-bolinha"></span>
                1. Dados de Identificação
              </span>
            </div>

            <div className="ptd-grid-3">
              <div className="ptd-campo">
                <label className="ptd-label flex-label-locked">
                  Instituição <Lock size={12} className="icone-bloqueio" />
                </label>
                <input
                  type="text"
                  className="ptd-input ptd-input-bloqueado"
                  value={dados.instituicao}
                  readOnly
                  title="Definido automaticamente pelo cadastro da sua escola"
                />
              </div>

              <div className="ptd-campo">
                <label className="ptd-label">Curso</label>
                <DropdownComPortal
                  id="dropdown-curso-ptd"
                  opcoes={turmasDisponiveis.length > 0 ? turmasDisponiveis : ["Nenhum curso cadastrado"]}
                  valor={turmaSelecionadaRaw || "Selecione o curso..."}
                  onChange={handleSelecionarTurma}
                  dropdownAberto={dropdownAberto}
                  setDropdownAberto={setDropdownAberto}
                />
              </div>

              <div className="ptd-campo">
                <label className="ptd-label flex-label-locked">
                  Série / Módulo <Lock size={12} className="icone-bloqueio" />
                </label>
                <input
                  type="text"
                  className="ptd-input ptd-input-bloqueado"
                  value={dados.modulo}
                  readOnly
                  placeholder="Selecione o curso acima..."
                />
              </div>

              <div className="ptd-campo">
                <label className="ptd-label">Componente Curricular (Matéria)</label>
                <DropdownComPortal
                  id="dropdown-materia-ptd"
                  opcoes={disciplinasDisponiveis.length > 0 ? disciplinasDisponiveis : ["Nenhuma matéria vinculada"]}
                  valor={dados.componente || "Selecione a matéria..."}
                  onChange={(valor) => handleChange("componente", valor)}
                  dropdownAberto={dropdownAberto}
                  setDropdownAberto={setDropdownAberto}
                />
              </div>

              <div className="ptd-campo">
                <label className="ptd-label">Carga Horária</label>
                <input
                  type="text"
                  className="ptd-input"
                  value={dados.cargaHoraria}
                  onChange={e => handleChange("cargaHoraria", e.target.value)}
                />
              </div>

              <div className="ptd-campo">
                <label className="ptd-label flex-label-locked">
                  Professor <Lock size={12} className="icone-bloqueio" />
                </label>
                <input
                  type="text"
                  className="ptd-input ptd-input-bloqueado"
                  value={dados.professor}
                  readOnly
                  title="Usuário conectado atualmente no ProShelf"
                />
              </div>
            </div>
          </div>

          {/* 2. EMENTA E OBJETIVOS */}
          <div className="ptd-card" style={{ margin: 0 }}>
            <span className="ptd-secao-titulo" style={{ marginBottom: "16px" }}>
              <span className="ptd-bolinha"></span>
              2. Ementa e Objetivos
            </span>
            <div className="ptd-grid-2">
              <div className="ptd-campo">
                <label className="ptd-label">Ementa</label>
                <AutoTextarea
                  minRows={3}
                  value={dados.ementa}
                  onChange={e => handleChange("ementa", e.target.value)}
                />
              </div>
              <div className="ptd-campo">
                <label className="ptd-label">Objetivos Gerais</label>
                <AutoTextarea
                  minRows={3}
                  value={dados.objetivos}
                  onChange={e => handleChange("objetivos", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 3. COMPETÊNCIAS E HABILIDADES */}
          <div className="ptd-card" style={{ margin: 0 }}>
            <div className="ptd-card-topo">
              <span className="ptd-secao-titulo">
                <span className="ptd-bolinha"></span>
                3. Competências e Habilidades
              </span>
              <button
                type="button"
                onClick={adicionarCompetencia}
                className="btn-ptd btn-ptd-outline"
                style={{ fontSize: "12px", padding: "4px 10px" }}
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>

            {dados.competencias.map((comp, idx) => (
              <div key={idx} className="ptd-item-linha">
                <span className="ptd-item-index">#{idx + 1}</span>
                <AutoTextarea
                  value={comp}
                  placeholder="Descreva a competência ou habilidade técnica..."
                  onChange={e => handleCompetenciaChange(idx, e.target.value)}
                />
                {dados.competencias.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerCompetencia(idx)}
                    className="ptd-btn-icone"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 4. CONTEÚDO PROGRAMÁTICO */}
          <div className="ptd-card" style={{ margin: 0 }}>
            <div className="ptd-card-topo">
              <span className="ptd-secao-titulo">
                <span className="ptd-bolinha"></span>
                4. Conteúdo Programático
              </span>
            </div>

            {dados.conteudo.map((item, idx) => (
              <div
                key={idx}
                className="ptd-cronograma-item"
                style={{ gridTemplateColumns: "180px 1fr" }}
              >
                <input
                  type="text"
                  className="ptd-input ptd-input-bloqueado"
                  value={item.periodo}
                  readOnly
                  title="Período fixado pelas regras do ano letivo da escola"
                />
                <AutoTextarea
                  placeholder="Detalhamento do conteúdo programático..."
                  value={item.temas}
                  onChange={e => handleConteudoChange(idx, "temas", e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* 5. METODOLOGIA */}
          <div className="ptd-card" style={{ margin: 0 }}>
            <span className="ptd-secao-titulo" style={{ marginBottom: "12px" }}>
              <span className="ptd-bolinha"></span> 5. Metodologia
            </span>
            <AutoTextarea
              minRows={3}
              placeholder="Descreva os procedimentos didáticos..."
              value={dados.metodologia}
              onChange={e => handleChange("metodologia", e.target.value)}
            />
          </div>

          {/* 6. CRITÉRIOS DE AVALIAÇÃO */}
          <div className="ptd-card" style={{ margin: 0 }}>
            <span className="ptd-secao-titulo" style={{ marginBottom: "12px" }}>
              <span className="ptd-bolinha"></span> 6. Critérios de Avaliação
            </span>
            <AutoTextarea
              minRows={3}
              placeholder="Descreva os instrumentos e critérios avaliativos..."
              value={dados.avaliacao}
              onChange={e => handleChange("avaliacao", e.target.value)}
            />
          </div>

          {/* 7. RECURSOS DIDÁTICOS */}
          <div className="ptd-card" style={{ margin: 0 }}>
            <span className="ptd-secao-titulo" style={{ marginBottom: "12px" }}>
              <span className="ptd-bolinha"></span> 7. Recursos Didáticos
            </span>
            <AutoTextarea
              minRows={3}
              placeholder="Softwares, laboratórios, plataformas..."
              value={dados.recursos}
              onChange={e => handleChange("recursos", e.target.value)}
            />
          </div>

          {/* 8. BIBLIOGRAFIA */}
          <div className="ptd-card" style={{ margin: 0 }}>
            <span className="ptd-secao-titulo" style={{ marginBottom: "12px" }}>
              <span className="ptd-bolinha"></span> 8. Bibliografia
            </span>
            <AutoTextarea
              minRows={3}
              placeholder="Referências bibliográficas básicas e complementares..."
              value={dados.bibliografia}
              onChange={e => handleChange("bibliografia", e.target.value)}
            />
          </div>
        </div>
      ) : (
        /* FOLHA DE IMPRESSÃO A4 */
        <div id="ptd-impressao" className="ptd-folha-a4">
          <div className="ptd-folha-topo">
            <div>
              <h2>Plano de Trabalho Docente (PTD)</h2>
              <p style={{ color: "#666", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>
                {dados.instituicao}
              </p>
            </div>
            <span style={{ fontSize: "11px", fontWeight: "700", border: "1px solid #ccc", padding: "4px 8px", borderRadius: "4px" }}>
              {dados.anoLetivo}
            </span>
          </div>

          <table className="ptd-folha-tabela-info">
            <tbody>
              <tr>
                <td><strong>Curso:</strong> {dados.curso}</td>
                <td><strong>Módulo/Série:</strong> {dados.modulo}</td>
              </tr>
              <tr>
                <td><strong>Componente:</strong> {dados.componente}</td>
                <td><strong>Carga Horária:</strong> {dados.cargaHoraria}</td>
              </tr>
              <tr>
                <td colSpan="2"><strong>Docente Responsável:</strong> {dados.professor}</td>
              </tr>
            </tbody>
          </table>

          <div className="ptd-folha-bloco">
            <div className="ptd-folha-subtitulo">1. Ementa</div>
            <p>{dados.ementa}</p>
          </div>

          <div className="ptd-folha-bloco">
            <div className="ptd-folha-subtitulo">2. Objetivos Gerais</div>
            <p>{dados.objetivos}</p>
          </div>

          <div className="ptd-folha-bloco">
            <div className="ptd-folha-subtitulo">3. Competências e Habilidades</div>
            <ul style={{ paddingLeft: "18px", margin: "4px 0" }}>
              {dados.competencias.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>

          <div className="ptd-folha-bloco">
            <div className="ptd-folha-subtitulo">4. Conteúdo Programático</div>
            <table className="ptd-folha-tabela-conteudo">
              <thead>
                <tr>
                  <th style={{ width: "25%" }}>Período ({sistemaEscola.toUpperCase()})</th>
                  <th>Conteúdo</th>
                </tr>
              </thead>
              <tbody>
                {dados.conteudo.map((item, i) => (
                  <tr key={i}>
                    <td><strong>{item.periodo}</strong></td>
                    <td>{item.temas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ptd-folha-grid-2">
            <div className="ptd-folha-bloco">
              <div className="ptd-folha-subtitulo">5. Metodologia</div>
              <p>{dados.metodologia}</p>
            </div>
            <div className="ptd-folha-bloco">
              <div className="ptd-folha-subtitulo">6. Avaliação</div>
              <p>{dados.avaliacao}</p>
            </div>
          </div>

          <div className="ptd-folha-grid-2">
            <div className="ptd-folha-bloco">
              <div className="ptd-folha-subtitulo">7. Recursos Didáticos</div>
              <p>{dados.recursos}</p>
            </div>
            <div className="ptd-folha-bloco">
              <div className="ptd-folha-subtitulo">8. Bibliografia</div>
              <p style={{ whiteSpace: "pre-line" }}>{dados.bibliografia}</p>
            </div>
          </div>

          <div className="ptd-folha-assinaturas">
            <div className="ptd-folha-linha-assinatura">
              <strong>{dados.professor}</strong>
              <div style={{ fontSize: "10px", color: "#666" }}>Docente Responsável</div>
            </div>
            <div className="ptd-folha-linha-assinatura">
              <strong>Coordenação Pedagógica</strong>
              <div style={{ fontSize: "10px", color: "#666" }}>{dados.instituicao}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}