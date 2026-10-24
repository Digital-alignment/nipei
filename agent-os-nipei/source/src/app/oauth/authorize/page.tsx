import { redirect } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { currentUser } from "@/lib/v2/data";
import { getCliente } from "@/lib/v2/oauthMcp";
import { decidirAction } from "./acoes";

export const dynamic = "force-dynamic";
type Q = { client_id?: string; redirect_uri?: string; response_type?: string; code_challenge?: string; code_challenge_method?: string; state?: string };

// Consent for an MCP app (Claude, ChatGPT, Gemini…) to act as the logged-in person. It never sees a password:
// the person logs in to Nipëi as usual and then approves here.
export default async function Autorizar({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const cliente = getCliente(q.client_id ?? "");
  const erro = !cliente ? "App desconhecido. Remova o conector e adicione de novo."
    : !q.redirect_uri || !cliente.redirects.includes(q.redirect_uri) ? "Endereço de retorno não autorizado para este app."
    : q.response_type !== "code" || q.code_challenge_method !== "S256" || !q.code_challenge ? "Pedido inválido (é preciso PKCE S256)." : "";
  const me = await currentUser();
  if (!erro && !me) redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${new URLSearchParams(q as Record<string, string>)}`)}`);
  const nome = me?.pessoa?.name.split(" (")[0] ?? me?.username;

  return (
    <div className="v2 min-h-screen flex items-center justify-center px-4 py-10 bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 grid gap-4">
        <div className="flex items-center gap-2"><ShieldCheck size={20} className="text-green-600" /><h1 className="text-lg font-semibold">Conectar ao Nipëi</h1></div>
        {erro ? <p className="text-sm text-red-600 dark:text-red-400">{erro}</p> : (
          <>
            <p className="text-sm"><strong>{cliente!.nome}</strong> quer usar o Nipëi como <strong>{nome}</strong>.</p>
            <ul className="grid gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
              {["Ver o que você já vê no Nipëi: tarefas, agenda, equipes, projetos, conhecimento", "Criar e mudar tarefas, eventos e comentários em seu nome (o app pede sua confirmação antes)", "Ler e atualizar a memória do assistente sobre você", "Nada além das suas permissões; você desconecta quando quiser em Perfil → Conexões"].map((x) => (
                <li key={x} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-neutral-400" />{x}</li>
              ))}
            </ul>
            <form action={decidirAction} className="flex gap-2 pt-1">
              {Object.entries({ client_id: q.client_id, redirect_uri: q.redirect_uri, code_challenge: q.code_challenge, state: q.state ?? "" }).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <BotaoEnviar name="decisao" value="permitir" enviando="…" className="flex-1 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-medium">Permitir</BotaoEnviar>
              <BotaoEnviar name="decisao" value="negar" enviando="…" className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm">Cancelar</BotaoEnviar>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
