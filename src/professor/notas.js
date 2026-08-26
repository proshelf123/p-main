export const NOTAS_ETEC = ["MB", "B", "R", "I"];
export const NOTAS_LETRAS = ["A+", "A", "B+", "B", "C+", "C", "D", "F"];

export function escalaDoTipo(tipoNota) {
  return tipoNota === "etec" ? NOTAS_ETEC : NOTAS_LETRAS;
}

// Recebe um objeto { avaliacaoId: valor } com as notas lançadas num período
// e devolve o total (média simples), respeitando o tipo de nota da escola.
export function calcularTotalPeriodo(notasDoPeriodo, tipoNota) {
  const valores = Object.values(notasDoPeriodo || {}).filter(
    (v) => v !== "" && v !== null && v !== undefined
  );
  if (valores.length === 0) return null;

  if (tipoNota === "numerica") {
    const soma = valores.reduce((acc, v) => acc + Number(v), 0);
    return (soma / valores.length).toFixed(1);
  }

  // conceito / etec: média das posições no array ordenado, arredondada
  const escala = escalaDoTipo(tipoNota);
  const indices = valores
    .map((v) => escala.indexOf(v))
    .filter((i) => i >= 0);
  if (indices.length === 0) return null;

  const mediaIndice = Math.round(
    indices.reduce((a, b) => a + b, 0) / indices.length
  );
  return escala[mediaIndice];
}