import { NextResponse } from "next/server";
import { currentUser } from "@/lib/v2/data";
import { MODELO } from "@/lib/v2/importarFinancas";

// "Baixar modelo" of Importar planilha (DS 10.25): the CSV columns the importer reads, with 3 example rows.
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentUser();
  if (!me?.gestao) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(String.fromCharCode(0xfeff) + MODELO, { headers: {
    "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="modelo-financas-nipei.csv"', "Cache-Control": "no-store",
  } });
}
