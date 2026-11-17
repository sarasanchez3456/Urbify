// JWT de mentira para las pruebas (solo importa el payload): cabecera.payload.firma
export const crearJwt = (exp) => {
  const base64 = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${base64({ alg: "HS256" })}.${base64({ id: 1, exp })}.firma`;
};
