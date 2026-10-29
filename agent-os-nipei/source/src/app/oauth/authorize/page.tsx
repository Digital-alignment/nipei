import { redirect } from "next/navigation";
import Aviso from "@/components/ds/Aviso";
import Cartao from "@/components/ds/Cartao";
import Icone from "@/components/ds/Icone";
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
    <div className="v2 flex min-h-screen items-center justify-center bg-bg px-4 py-10 text-t1">
      <Cartao className="grid w-full max-w-md gap-4 p-6">
        <h1 className="titulo-secao flex items-center gap-2"><Icone nome="cadeado" tamanho={20} className="text-ac-text" />Conectar ao Nipëi</h1>
        {erro ? <Aviso estado="erro" titulo={erro} /> : (
          <>
            <p className="corpo"><strong>{cliente!.nome}</strong> quer usar o Nipëi como <strong>{nome}</strong>.</p>
            <ul className="corpo grid gap-1.5 text-t2">
              {["Ver o que você já vê no Nipëi: tarefas, agenda, equipes, projetos, conhecimento", "Criar e mudar tarefas, eventos e comentários em seu nome (o app pede sua confirmação antes)", "Ler e atualizar a memória do assistente sobre você", "Nada além das suas permissões; você desconecta quando quiser em Perfil → Conexões"].map((x) => (
                <li key={x} className="flex gap-2"><Icone nome="sucesso" tamanho={16} className="mt-0.5 shrink-0 text-ac-text" />{x}</li>
              ))}
            </ul>
            <form action={decidirAction} className="flex flex-wrap gap-2 pt-1">
              {Object.entries({ client_id: q.client_id, redirect_uri: q.redirect_uri, code_challenge: q.code_challenge, state: q.state ?? "" }).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <BotaoEnviar name="decisao" value="permitir" enviando="…" icone="confirmar" variante="primario" className="flex-1">Permitir</BotaoEnviar>
              <BotaoEnviar name="decisao" value="negar" enviando="…" icone="fechar" variante="fantasma">Cancelar</BotaoEnviar>
            </form>
          </>
        )}
      </Cartao>
    </div>
  );
}
