import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown for long documents (headings, tables, quotes), readable on screen and in print. */
export default function Md({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2
      [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:break-after-avoid
      [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-1 [&_blockquote]:text-sm [&_blockquote]:font-normal [&_blockquote]:not-italic [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-amber-400 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-600 dark:[&_blockquote]:text-neutral-400
      [&_table]:w-full [&_table]:my-3 [&_table]:text-xs [&_th]:text-left [&_th]:border-b [&_th]:border-neutral-300 [&_th]:py-1 [&_th]:pr-2
      [&_td]:border-b [&_td]:border-neutral-100 dark:[&_td]:border-neutral-800 [&_td]:py-1 [&_td]:pr-2 [&_td]:align-top">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}>{children}</ReactMarkdown>
    </div>
  );
}
