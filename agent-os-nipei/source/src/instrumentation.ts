import type { Instrumentation } from "next";

// Next.js calls this for every unhandled server error (pages, server actions, route handlers).
// It goes to the admin panel's error log (lib/v2/erros.ts). Node runtime only: the log is a file.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { registrarErro } = await import("@/lib/v2/erros");
  const e = err as Error & { digest?: string };
  registrarErro(`${request.method} ${request.path.split("?")[0]} (${context.routeType})`, e, e.digest);
};
