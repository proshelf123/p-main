import { useState } from "react";
import { motion } from "framer-motion";
import TurmaArquivos from "./TurmaArquivos";

const periodos = [
  {
    nome: "Período Matutino",
    cor: "#F59E0B",
    corFundo: "#FFFBEB",
    turmas: [
      "2° Informática para Internet",
      "3° Informática para Internet",
      "1° Desenvolvimento de Sistemas",
      "1° Marketing",
      "2° Marketing",
      "3° Marketing",
      "1° Recursos Humanos",
      "2° Recursos Humanos",
      "3° Recursos Humanos",
      "1° Eletrônica",
      "2° Eletrônica",
      "3° Eletrônica",
    ],
  },
  {
    nome: "Período Vespertino",
    cor: "#8B5CF6",
    corFundo: "#F5F3FF",
    turmas: [
      "1° Programação de Jogos Digitais",
      "2° Programação de Jogos Digitais",
      "3° Programação de Jogos Digitais",
      "1° Administração",
      "2° Administração",
      "3° Administração",
      "1° Farmácia",
      "2° Farmácia",
      "3° Farmácia",
      "1° Biotecnologia - Modular",
      "2° Biotecnologia - Modular",
      "3° Biotecnologia - Modular",
    ],
  },
  {
    nome: "Período Noturno",
    cor: "#1E40AF",
    corFundo: "#EFF6FF",
    turmas: [
      "1° Eletroeletrônica",
      "2° Eletroeletrônica",
      "3° Eletroeletrônica",
      "2° Desenvolvimento de Sistemas",
      "3° Desenvolvimento de Sistemas",
      "1° Informática para Internet",
      "1° Administração",
      "2° Administração",
      "3° Administração",
      "1° Marketing - Modular",
      "2° Marketing - Modular",
      "3° Marketing - Modular",
      "1° Farmácia - Modular",
      "2° Farmácia - Modular",
      "3° Farmácia - Modular",
    ],
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" } },
};

export default function Arquivos() {
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [periodoSelecionado, setPeriodoSelecionado] = useState(null);

  if (turmaSelecionada) {
    return (
      <TurmaArquivos
        turma={turmaSelecionada}
        periodo={periodoSelecionado}
        onVoltar={() => {
          setTurmaSelecionada(null);
          setPeriodoSelecionado(null);
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FB", padding: "32px 40px" }}>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1A1A2E", marginBottom: 4 }}>
          Arquivos
        </h1>
        <p style={{ color: "#6B7280", fontSize: 14, marginBottom: 32 }}>
          Selecione uma turma para acessar ou solicitar arquivos
        </p>
      </motion.div>

      {periodos.map((periodo, pi) => (
        <motion.div
          key={periodo.nome}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: pi * 0.1 }}
          style={{ marginBottom: 40 }}
        >
          {/* Cabeçalho do período */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
              paddingBottom: 10,
              borderBottom: `2px solid ${periodo.cor}22`,
            }}
          >
            <span style={{ fontSize: 20 }}>{periodo.emoji}</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: periodo.cor,
              }}
            >
              {periodo.nome}
            </span>
            <span
              style={{
                fontSize: 12,
                background: periodo.cor + "18",
                color: periodo.cor,
                borderRadius: 99,
                padding: "2px 10px",
                fontWeight: 600,
              }}
            >
              {periodo.turmas.length} turmas
            </span>
          </div>

          {/* Grid de cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: 14,
            }}
          >
            {periodo.turmas.map((turma) => (
              <TurmaCard
                key={turma}
                turma={turma}
                periodo={periodo}
                onClick={() => {
                  setTurmaSelecionada(turma);
                  setPeriodoSelecionado(periodo);
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

function TurmaCard({ turma, periodo, onClick }) {
  const [hover, setHover] = useState(false);

  // Extrai número e nome do curso
  const match = turma.match(/^(\d°)\s(.+)$/);
  const numero = match ? match[1] : "";
  const nomeCurso = match ? match[2] : turma;

  return (
    <motion.div
      variants={cardVariants}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      style={{
        background: hover ? "#fff" : "#fff",
        borderRadius: 14,
        padding: "18px 18px 14px",
        cursor: "pointer",
        transition: "all 0.22s ease",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: periodo.cor,
            lineHeight: 1,
          }}
        >
          {numero}
        </span>
              <p
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: "#1A1A2E",
          margin: 0,
          flexGrow: 1,
        }}
      >
        {nomeCurso}
      </p>
      </div>


      {/* Botão */}
      <button
        style={{
          width: "100%",
          padding: "7px 0",
          borderRadius: 8,
          border: "none",
          background: hover ? periodo.cor : periodo.cor + "15",
          color: hover ? "#fff" : periodo.cor,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 0.2s ease",
          letterSpacing: "0.02em",
        }}
      >
        Acessar arquivos →
      </button>
    </motion.div>
  );
}