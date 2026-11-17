import { redirect } from "next/navigation";
import { currentUser } from "@/lib/v2/data";

// Short link to send anyone (WhatsApp, invites): opens their own profile on the "AI apps" card of Conexões.
export default async function Conectar() {
  const me = await currentUser();
  redirect(me?.pessoa ? `/pessoas/${me.pessoa.id}?aba=conexoes#apps-ia` : "/hoje");
}
