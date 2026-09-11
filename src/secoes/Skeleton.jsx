import { motion } from "motion/react";

/* ══════════════════════════════════════════════════════════════
   Skeleton.jsx — blocos de "esqueleto" animados (shimmer)
   Usados como placeholder enquanto os dados carregam, no lugar
   de textos como "Carregando...".
   ══════════════════════════════════════════════════════════════ */

const shimmerStyle = {
  backgroundImage:
    "linear-gradient(90deg, var(--borda) 25%, #6f3b9d22 37%, var(--borda) 63%)",
  backgroundSize: "400% 100%",
};

const shimmerAnim = {
  animate: { backgroundPosition: ["100% 0%", "0% 0%"] },
  transition: { duration: 1.4, repeat: Infinity, ease: "linear" },
};

/** Bloco genérico com shimmer. Use para montar qualquer formato. */
export function SkeletonBox({ width = "100%", height = 16, radius = 8, style = {} }) {
  return (
    <motion.div
      style={{ width, height, borderRadius: radius, ...shimmerStyle, ...style }}
      {...shimmerAnim}
    />
  );
}

/** Uma linha de "texto" fake. */
export function SkeletonText({ width = "100%", height = 13 }) {
  return <SkeletonBox width={width} height={height} radius={6} />;
}

/** Skeleton de card (ex: card de cronograma, card de arquivo).
 *  variant="pill" deixa o card com cantos 100% arredondados e o
 *  ícone lateral circular, em vez de quadrado. */
export function SkeletonCard({ height = 64, variant = "default" }) {
  const isPill = variant === "pill";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: isPill ? "10px 20px" : "12px 16px",
        borderRadius: isPill ? height : 12,
        border: "1px solid var(--borda)",
        background: "var(--branco)",
      }}
    >
      <SkeletonBox
        width={height - (isPill ? 16 : 0)}
        height={height - (isPill ? 16 : 0)}
        radius={isPill ? 999 : 10}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <SkeletonText width="55%" height={14} />
        <SkeletonText width="35%" height={11} />
      </div>
    </div>
  );
}

/** Lista vertical de cards-esqueleto (ex: bem-vindo, presença, turmas). */
export function SkeletonList({ linhas = 4, alturaCard = 64, variant = "default" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: linhas }).map((_, i) => (
        <SkeletonCard key={i} height={alturaCard} variant={variant} />
      ))}
    </div>
  );
}

/** Skeleton de tabela (ex: notas, avaliações). */
export function SkeletonTable({ linhas = 5, colunas = 4 }) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: 16, padding: "8px 8px", marginBottom: 4 }}>
        <SkeletonText width="22%" height={12} />
        {Array.from({ length: colunas }).map((_, i) => (
          <SkeletonText key={i} width={`${60 / colunas}%`} height={12} />
        ))}
      </div>
      {Array.from({ length: linhas }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "12px 8px",
            borderBottom: "1px solid var(--borda)",
          }}
        >
          <SkeletonText width="22%" height={13} />
          {Array.from({ length: colunas }).map((_, j) => (
            <SkeletonBox key={j} width={`${60 / colunas}%`} height={22} radius={6} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton de calendário / grid (ex: mini calendário). */
export function SkeletonCalendar() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <SkeletonText width="40%" height={14} />
        <SkeletonText width="15%" height={14} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {Array.from({ length: 28 }).map((_, i) => (
          <SkeletonBox key={i} height={26} radius={6} />
        ))}
      </div>
    </div>
  );
}

// Adicione este componente no final do Skeleton.jsx

/** Skeleton específico para o card de documento/arquivo */
export function SkeletonArquivoCard() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        background: "var(--bg)",
        borderRadius: 12,
        border: "1px solid var(--borda)",
      }}
    >
      {/* Topo: Ícone + Nome do arquivo + Detalhes */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%" }}>
        <SkeletonBox width={26} height={30} radius={6} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <SkeletonText width="45%" height={14} />
          <SkeletonText width="30%" height={11} />
        </div>
      </div>

      {/* Base: Botão roxo "Ver arquivo" */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, width: "100%" }}>
        <SkeletonBox width="100%" height={38} radius={8} />
      </div>
    </div>
  );
}