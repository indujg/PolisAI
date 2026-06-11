import type { ReactNode } from "react";

// Minimal Markdown renderer for AI responses (### headings, **bold**, bullets,
// numbered lists) so backend AI text doesn't show raw #/* characters. Not a
// full CommonMark parser — just the subset the AI endpoints emit.

function inlineMd(text: string): ReactNode[] {
  return text.split(/\*\*/).map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : <span key={i}>{part}</span>,
  );
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = String(text ?? "").replace(/\r/g, "").split("\n");
  return (
    <div className={className}>
      {lines.map((raw, i) => {
        const line = raw.replace(/\s+$/, "");
        if (!line.trim()) return <div key={i} className="h-2" />;

        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
          return (
            <p key={i} className="mb-1 mt-2 font-bold text-foreground first:mt-0">
              {inlineMd(heading[2])}
            </p>
          );
        }

        const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/);
        if (numbered) {
          return (
            <p key={i} className="mb-1 mt-2 font-semibold text-foreground">
              <span className="mr-1.5 font-bold">{numbered[1]}.</span>
              {inlineMd(numbered[2])}
            </p>
          );
        }

        const bullet = line.match(/^\s*[-*]\s+(.*)$/);
        if (bullet) {
          return (
            <p key={i} className="mb-1 ml-3 flex gap-2">
              <span aria-hidden className="select-none opacity-60">•</span>
              <span className="flex-1">{inlineMd(bullet[1])}</span>
            </p>
          );
        }

        return (
          <p key={i} className="mb-1.5">
            {inlineMd(line)}
          </p>
        );
      })}
    </div>
  );
}
