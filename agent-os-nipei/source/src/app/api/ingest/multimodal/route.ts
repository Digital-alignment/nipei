import { NextResponse } from "next/server";
import { executeMultimodalIngestion, MediaType } from "@/lib/multimodalIngestionEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Multipart Form Data (File Uploads)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const mediaType = (formData.get("mediaType") as MediaType) || "pdf";
      const title = (formData.get("title") as string) || (file ? file.name : "Nueva Ingesta");
      const companySlug = (formData.get("companySlug") as string) || "";
      const companyName = (formData.get("companyName") as string) || "";
      const category = (formData.get("category") as string) || "";
      const model = (formData.get("model") as string) || "google/gemini-2.5-flash";
      const videoUrl = (formData.get("videoUrl") as string) || "";
      const rawTextContent = (formData.get("rawTextContent") as string) || "";

      let fileBuffer: Buffer | undefined;
      let fileName: string | undefined;
      let mimeType: string | undefined;

      if (file) {
        const bytes = await file.arrayBuffer();
        fileBuffer = Buffer.from(bytes);
        fileName = file.name;
        mimeType = file.type;
      }

      const result = await executeMultimodalIngestion({
        mediaType,
        title,
        companySlug,
        companyName,
        category,
        model,
        videoUrl,
        rawTextContent,
        fileBuffer,
        fileName,
        mimeType,
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 });
      }

      return NextResponse.json(result);
    }

    // JSON Payload
    const body = await req.json().catch(() => ({}));
    const mediaType = (body.mediaType as MediaType) || "text_omi";
    const title = (body.title as string) || "Ingesta de Texto / Link";
    const companySlug = (body.companySlug as string) || "";
    const companyName = (body.companyName as string) || "";
    const category = (body.category as string) || "";
    const model = (body.model as string) || "google/gemini-2.5-flash";
    const videoUrl = (body.videoUrl as string) || "";
    const rawTextContent = (body.rawTextContent as string) || body.text || "";

    const result = await executeMultimodalIngestion({
      mediaType,
      title,
      companySlug,
      companyName,
      category,
      model,
      videoUrl,
      rawTextContent,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
