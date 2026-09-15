import MemoryPanel from "@/components/MemoryPanel";

export default function IngestionRoute() {
  return (
    <div className="min-h-[calc(100vh-220px)]">
      <MemoryPanel initialTab="ingestion" />
    </div>
  );
}
