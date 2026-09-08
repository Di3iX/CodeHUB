import { FileDiff } from 'lucide-react';
import type { GithubChange } from '@/services/github/types';

type DiffViewerProps = {
  change: GithubChange | null;
};

function DiffLines({ content, prefix, tone }: { content: string | null; prefix: string; tone: string }) {
  if (content === null) {
    return <div className="px-3 py-2 font-mono text-[10px] text-[#66738a]">File does not exist in this revision.</div>;
  }

  return (
    <pre className="m-0 overflow-auto p-3 font-mono text-[10px] leading-5">
      {content.split('\n').map((line, index) => (
        <div key={`${prefix}-${index}`} className={tone}>
          <span className="mr-2 select-none opacity-60">{prefix}</span>
          {line || ' '}
        </div>
      ))}
    </pre>
  );
}

export default function DiffViewer({ change }: DiffViewerProps) {
  if (!change) {
    return (
      <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 border-t border-[#252d40] px-5 text-center">
        <FileDiff size={18} className="text-[#56647a]" />
        <p className="font-mono text-[10px] text-[#657289]">Select a changed file to inspect its diff.</p>
      </div>
    );
  }

  return (
    <section className="border-t border-[#252d40]" aria-label="Diff viewer">
      <div className="flex items-center justify-between border-b border-[#252d40] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileDiff size={14} className="text-[#56d2df]" />
          <span className="truncate font-mono text-[10px] text-[#d8dfda]">{change.path}</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[.14em] text-[#657289]">{change.status}</span>
      </div>
      <div className="grid max-h-[260px] grid-cols-2 divide-x divide-[#252d40] overflow-auto">
        <div className="min-w-0 bg-[#211820]">
          <div className="border-b border-[#3a2930] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.12em] text-[#b77d83]">Before</div>
          <DiffLines content={change.before} prefix="−" tone="text-[#d49a9f]" />
        </div>
        <div className="min-w-0 bg-[#17251f]">
          <div className="border-b border-[#283b31] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.12em] text-[#9cc47a]">After</div>
          <DiffLines content={change.after} prefix="+" tone="text-[#b6d898]" />
        </div>
      </div>
    </section>
  );
}