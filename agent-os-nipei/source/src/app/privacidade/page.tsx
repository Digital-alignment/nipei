// Public privacy policy (required by Google for the OAuth consent screen). Keep it true to the code:
// scopes in lib/v2/google.ts, storage in lib/v2/conexoes.ts, backup in lib/v2/backup.ts.
export const metadata = { title: "Privacidade · Nipëi OS" };

export default function Privacidade() {
  return (
    <div className="v2 min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 px-4 py-10">
      <article className="max-w-2xl mx-auto grid gap-4 text-sm leading-relaxed">
        <h1 className="text-2xl font-semibold">Política de privacidade · Nipëi OS</h1>
        <p className="text-neutral-500">Última atualização: 24 de outubro de 2026</p>
        <p>O Nipëi OS (os.nipeihu.app) é a plataforma interna de organização da comunidade Nipeihu: tarefas, agenda, equipes e conhecimento. Só pessoas da comunidade com acesso entram.</p>
        <h2 className="text-lg font-semibold mt-2">Dados que guardamos</h2>
        <p>Nome, contato e perfil que a própria pessoa preenche; as tarefas, comentários e eventos da comunidade; e, para quem usa o assistente, a conversa e os itens de memória que a pessoa aprova. Esses dados ficam no servidor da comunidade e não são vendidos nem compartilhados com terceiros para publicidade.</p>
        <h2 className="text-lg font-semibold mt-2">Conta Google (opcional)</h2>
        <p>Cada pessoa pode conectar a própria conta Google na aba Conexões do seu perfil, e desconectar quando quiser (ou em myaccount.google.com/permissions). Pedimos apenas:</p>
        <ul className="list-disc pl-5 grid gap-1">
          <li><strong>Google Drive (drive.file)</strong>: só os arquivos que o próprio Nipëi cria — uma pasta “Nipëi” com a cópia diária dos dados da pessoa e os documentos que ela exportar. Não vemos nenhum outro arquivo do Drive.</li>
          <li><strong>Google Calendar (calendar.events)</strong>: mostrar os compromissos da pessoa na agenda do Nipëi e criar os eventos que ela confirmar.</li>
          <li><strong>E-mail e perfil básico</strong>: identificar qual conta foi conectada e permitir "Entrar com Google".</li>
          <li><strong>Gmail (opcional, só se a pessoa ativar)</strong>: o assistente lê, busca e resume os e-mails para responder à própria pessoa e prepara respostas ou rascunhos; enviar sempre exige a confirmação dela. O conteúdo dos e-mails não é guardado nem colocado na memória do assistente.</li>
        </ul>
        <p>Os tokens de acesso ficam cifrados no servidor e só são usados para as ações acima, pedidas pela própria pessoa. Os eventos do Calendar e os e-mails são lidos na hora e não são guardados.</p>
        <p>O uso e a transferência de informações recebidas das APIs do Google seguem a <a className="underline" href="https://developers.google.com/terms/api-services-user-data-policy">Política de Dados do Usuário dos Serviços de API do Google</a>, incluindo os requisitos de Uso Limitado. Dados do Google não são usados para treinar modelos de IA nem para publicidade.</p>
        <h2 className="text-lg font-semibold mt-2">Registros de acesso e uso</h2>
        <p>Para a segurança e o funcionamento da plataforma registramos quando e como cada pessoa entra (senha, Google ou link no WhatsApp, e o tipo de aparelho), o tempo de uso por seção da plataforma (minutos com a página aberta e em uso), o último dia de uso e as ações feitas (tarefas, assistente, WhatsApp, apps de IA) — sem o conteúdo das mensagens. Esses registros ficam no servidor da comunidade, só o administrador técnico os vê, e cada pessoa vê os próprios últimos acessos na aba Segurança do perfil.</p>
        <h2 className="text-lg font-semibold mt-2">Seus direitos</h2>
        <p>Você pode ver e corrigir seus dados no seu perfil, apagar a memória do assistente a qualquer momento e pedir a exclusão dos seus dados à gestão da comunidade.</p>
        <h2 className="text-lg font-semibold mt-2">Contato</h2>
        <p>8turmalina@gmail.com</p>
      </article>
    </div>
  );
}
