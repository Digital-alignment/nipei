import { verifyToken } from "@/lib/auth";
import { getEquipes, getEventos, getTarefas } from "@/lib/v2/data";

export const dynamic = "force-dynamic";

// Read-only iCalendar feed that Google Calendar subscribes to ("From URL").
// Public in src/proxy.ts: the link carries a signed token with purpose "ics", which cannot log in.
// ponytail: one-way (Nipëi → Google), Google refreshes every few hours. Two-way sync needs OAuth.

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const ymd = (iso: string) => iso.replace(/-/g, "");
const nextDay = (iso: string) => new Date(Date.parse(iso + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);

/** RFC 5545 line folding: max 75 octets per line, continuation lines start with a space. */
function fold(line: string) {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > (out.length ? 74 : 75)) { out.push(cur); cur = ""; }
    cur += ch;
  }
  return [...out, cur].join("\r\n ");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!verifyToken(url.searchParams.get("token") ?? undefined, "ics")) return new Response("Não autorizado", { status: 401 });
  const equipe = url.searchParams.get("equipe");
  const equipes = getEquipes();
  const nome = (id: string) => equipes.find((e) => e.id === id)?.nome ?? "";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  const ev = (uid: string, start: string, end: string, summary: string, desc: string) => [
    "BEGIN:VEVENT", `UID:${uid}@os.nipeihu.app`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(nextDay(end))}`,
    `SUMMARY:${esc(summary)}`, `DESCRIPTION:${esc(desc)}`, "TRANSP:TRANSPARENT", "END:VEVENT",
  ];

  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nipei OS//Agenda//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(equipe ? `Nipëi · ${nome(equipe)}` : "Nipëi")}`, "X-WR-TIMEZONE:America/Bahia",
    ...getTarefas()
      .filter((t) => t.prazo && t.status !== "done" && (!equipe || t.equipe === equipe))
      .flatMap((t) => ev(t.id, t.prazo, t.prazo, `☐ ${t.title}`, [nome(t.equipe), t.responsible, `${origin}/hoje`].filter(Boolean).join("\n"))),
    // Only events with a full date; month-only ones ("2027-01") would land on a wrong day.
    ...getEventos()
      .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.inicio) && (!equipe || e.equipe === equipe))
      .flatMap((e) => ev(e.id, e.inicio, /^\d{4}-\d{2}-\d{2}$/.test(e.fim) ? e.fim : e.inicio, e.titulo, `${nome(e.equipe)} · ${e.status}`)),
    "END:VCALENDAR",
  ];

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" },
  });
}
