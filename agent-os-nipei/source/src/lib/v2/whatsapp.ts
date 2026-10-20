// WhatsApp sending (Evolution API, env only) and phone-number normalisation shared by the v2 code.

/** Country calling codes offered in the profile form (Brazil first; "outro" = type the code). */
export const PAISES: { cc: string; nome: string }[] = [
  { cc: "55", nome: "Brasil" }, { cc: "54", nome: "Argentina" }, { cc: "598", nome: "Uruguai" }, { cc: "595", nome: "Paraguai" },
  { cc: "56", nome: "Chile" }, { cc: "51", nome: "Peru" }, { cc: "57", nome: "Colômbia" }, { cc: "591", nome: "Bolívia" },
  { cc: "593", nome: "Equador" }, { cc: "58", nome: "Venezuela" }, { cc: "52", nome: "México" }, { cc: "1", nome: "EUA / Canadá" },
  { cc: "351", nome: "Portugal" }, { cc: "34", nome: "Espanha" }, { cc: "33", nome: "França" }, { cc: "49", nome: "Alemanha" },
  { cc: "39", nome: "Itália" }, { cc: "44", nome: "Reino Unido" }, { cc: "41", nome: "Suíça" }, { cc: "31", nome: "Holanda" },
  { cc: "32", nome: "Bélgica" }, { cc: "43", nome: "Áustria" }, { cc: "972", nome: "Israel" }, { cc: "61", nome: "Austrália" },
  { cc: "502", nome: "Guatemala" }, { cc: "506", nome: "Costa Rica" }, { cc: "507", nome: "Panamá" }, { cc: "53", nome: "Cuba" },
];

/**
 * "+55 (73) 99960-6170", cc "55" + "73 99960 6170", or "5573999606170" → "+5573999606170".
 * Returns "" when it can't be a valid international number (E.164: 8–15 digits incl. country code).
 */
export function normalizarFone(numero: string, cc = ""): string {
  const bruto = numero.trim();
  let d = bruto.replace(/\D/g, "");
  if (!d) return "";
  if (bruto.startsWith("+") || bruto.startsWith("00")) d = d.replace(/^00/, "");
  else if (cc) d = cc + d.replace(/^0+/, ""); // local form: drop trunk zeros ("073…")
  if (d.length < 8 || d.length > 15) return "";
  // Brazil: country code + 2-digit area code + 8 or 9 digits.
  if (d.startsWith("55") && !/^55[1-9]\d\d{8,9}$/.test(d)) return "";
  return `+${d}`;
}

/** Sends a text via the Evolution API. Returns false when not configured or the send failed. */
export async function enviarWhatsApp(fone: string, text: string): Promise<boolean> {
  const { EVOLUTION_API_URL: url, EVOLUTION_API_KEY: key, EVOLUTION_INSTANCE_NAME: inst } = process.env;
  const number = fone.replace(/\D/g, "");
  if (!url || !key || !inst || !number) return false;
  try {
    const r = await fetch(`${url}/message/sendText/${inst}`, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify({ number, text }), signal: AbortSignal.timeout(15_000),
    });
    return r.ok;
  } catch {
    return false;
  }
}
