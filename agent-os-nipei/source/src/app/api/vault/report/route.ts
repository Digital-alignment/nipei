import { NextResponse } from "next/server";
import { generateCompanyExecutiveReport } from "@/lib/companyReportExporter";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companySlug = searchParams.get("company") || "all";
    const format = searchParams.get("format") || "json";

    const report = await generateCompanyExecutiveReport(companySlug);

    if (format === "markdown" || format === "md") {
      const fileName = `Reporte_Ejecutivo_${report.companySlug}_${new Date().toISOString().slice(0, 10)}.md`;
      return new NextResponse(report.markdownReport, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    if (format === "html") {
      return new NextResponse(report.htmlReport, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    return NextResponse.json(report);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to generate executive report";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
