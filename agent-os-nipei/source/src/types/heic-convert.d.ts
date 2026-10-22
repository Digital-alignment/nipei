declare module "heic-convert" {
  export default function convert(o: { buffer: Buffer | ArrayBuffer | Uint8Array; format: "JPEG" | "PNG"; quality?: number }): Promise<ArrayBuffer>;
}
