// Shown the instant a link is tapped (and prefetched with it), while the server renders the page:
// the menu stays put and the content area shows its rough shape instead of freezing.
export default function Carregando() {
  const barra = "rounded-lg bg-neutral-200/70 dark:bg-neutral-800/70";
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <div className={`${barra} h-7 w-40 mb-3`} />
      <div className={`${barra} h-4 w-64 max-w-full mb-6`} />
      <div className="grid grid-cols-4 gap-2 mb-6">{[0, 1, 2, 3].map((i) => <div key={i} className={`${barra} h-16`} />)}</div>
      <div className="grid gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-neutral-200/70 dark:bg-neutral-800/70 shrink-0" />
            <div className="flex-1 grid gap-1.5"><div className={`${barra} h-4`} style={{ width: `${85 - i * 9}%` }} /><div className={`${barra} h-3 w-24`} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
