import SquadDashboardView from "@/components/SquadDashboardView";
import type { SquadId } from "@/lib/nipeiStore";

export default async function SquadDashboardRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SquadDashboardView squadId={id as SquadId} />;
}
