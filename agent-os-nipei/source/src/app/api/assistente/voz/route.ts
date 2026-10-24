import { NextResponse } from "next/server";
import { currentUser } from "@/lib/v2/data";
import { funcaoLigada } from "@/lib/v2/funcoes";
import { registrarCustoIA } from "@/lib/v2/custosIA";

// Spoken replies for the assistant (Equipe 1): Gemini TTS → audio/wav. The text is already short
// (the panel cleans markdown and cuts it); this route caps it again and counts uses per person.
// ponytail: WAV (~70 KB per second of speech); switch to a compressed format if mobile data becomes an issue.

const MAX = 700;
const LIMITE_DIA = 150;
const usos = new Map<string, { dia: string; n: number }>(); // ponytail: in memory, resets on deploy

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me || !funcaoLigada("voz", me)) return NextResponse.json({ erro: "só a Equipe 1" }, { status: 403 });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ erro: "voz não configurada (GEMINI_API_KEY)" }, { status: 503 });
  const { texto, lang } = await req.json().catch(() => ({}));
  const t = String(texto ?? "").replace(/\s+/g, " ").trim().slice(0, MAX);
  if (!t) return NextResponse.json({ erro: "texto vazio" }, { status: 400 });

  const quem = me.pessoa?.id ?? me.username, dia = new Date().toISOString().slice(0, 10);
  const u = usos.get(quem);
  const n = u?.dia === dia ? u.n : 0;
  if (n >= LIMITE_DIA) return NextResponse.json({ erro: "limite diário de voz atingido" }, { status: 429 });
  usos.set(quem, { dia, n: n + 1 });

  const modelo = process.env.NIPEI_VOZ_MODEL || "gemini-3.8-flash-lite-tts";
  const voz = process.env.NIPEI_VOZ || "Kore";
  const estilo = lang === "en" ? "Read in natural English, calm and warm, at a brisk pace:" : "Leia em português do Brasil, tom calmo e caloroso, ritmo ágil:";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${estilo} ${t}` }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } } },
    }),
    signal: AbortSignal.timeout(45_000),
  }).catch(() => null);
  const j = r?.ok ? await r.json() : null;
  registrarCustoIA(me.pessoa?.id ?? me.username, "voz", "gemini", modelo, j?.usageMetadata);
  const audio = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!audio?.data) return NextResponse.json({ erro: "voz indisponível agora" }, { status: 502 });
  return new NextResponse(Buffer.from(audio.data, "base64"), { headers: { "Content-Type": audio.mimeType?.startsWith("audio/") ? audio.mimeType : "audio/wav", "Cache-Control": "no-store" } });
}
