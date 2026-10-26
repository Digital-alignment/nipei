import { Skeleton, SkeletonCartao, SkeletonLista } from "@/components/ds/Estados";

// Shown the instant a link is tapped (and prefetched with it), while the server renders the page:
// the menu stays put and the content area shows its rough shape (design-system skeleton) instead of freezing.
export default function Carregando() {
  return (
    <div aria-busy="true" aria-live="polite" className="grid gap-6">
      <span className="sr-only">Carregando…</span>
      <div className="grid gap-3">
        <Skeleton largura={180} altura={36} />
        <Skeleton largura={280} altura={14} className="max-w-full" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><SkeletonCartao /><SkeletonCartao /><span className="hidden lg:block"><SkeletonCartao /></span></div>
      <SkeletonLista />
    </div>
  );
}
