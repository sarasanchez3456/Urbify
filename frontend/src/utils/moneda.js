// Las tarifas de Urbify son pesos colombianos, sin centavos: 50000 se muestra como $50.000.
export const formatoPesos = (valor) => {
  const n = Number(valor);
  return `$${(Number.isFinite(n) ? n : 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
};

// Salto de las flechas del campo de tarifa.
export const PASO_TARIFA = 1000;
