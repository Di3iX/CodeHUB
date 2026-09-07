import { ArrowDownToLine, Activity, Globe2, RotateCw, Zap } from 'lucide-react';
import type { RuntimeSnapshot } from '@/lib/runtime-manager';

type PreviewPanelProps = {
  runtime: RuntimeSnapshot;
  previewKey: number;
  onReload: () => void;
  mobile?: boolean;
};

export default function PreviewPanel({ runtime, previewKey, onReload, mobile = false }: PreviewPanelProps) {
  const isRunning = runtime.status === 'RUNNING' && Boolean(runtime.previewUrl);
  const statusClass = runtime.status === 'RUNNING'
    ? 'bg-[#c1e84f]/15 text-[#c1e84f]'
    : runtime.status === 'STARTING'
      ? 'bg-[#56d2df]/15 text-[#56d2df]'
      : runtime.status === 'ERROR'
        ? 'bg-[#ef8374]/15 text-[#ef8374]'
        : 'bg-[#252d40] text-[#68768c]';

  return (
    <aside className={`${mobile ? 'flex h-full' : 'hidden md:flex'} min-w-0 flex-col bg-[#12182a]`}>
      <PreviewHeader runtime={runtime} statusClass={statusClass} onReload={onReload} />
      <PreviewAddressBar runtime={runtime} />
      <div className="min-h-0 flex-1 overflow-auto p-5">
        {runtime.status === 'STARTING' ? (
          <PreviewState title="Starting preview…" detail="The mock runtime is preparing your project." tone="starting" />
        ) : runtime.status === 'ERROR' ? (
          <PreviewState title="Preview failed" detail={runtime.error ?? 'The runtime reported an unknown error.'} tone="error" />
        ) : isRunning ? (
          <div key={previewKey} className="preview-window preview-frame min-h-[450px] overflow-hidden rounded-xl">
            <div className="flex items-center justify-between border-b border-[#d3d8cd] bg-[#e5e9df] px-4 py-3">
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ef8374]" /><span className="h-2 w-2 rounded-full bg-[#e0bd5f]" /><span className="h-2 w-2 rounded-full bg-[#80bf79]" /></div>
              <span className="font-mono text-[9px] uppercase tracking-[.18em] text-[#76827d]">guild.local</span>
              <span className="w-10" />
            </div>
            <GuildPreview />
          </div>
        ) : (
          <PreviewState title="Preview is stopped" detail="Run the project to start the local preview." tone="stopped" />
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-[#252d40] px-4 py-3 text-[10px] text-[#738095]">
        <Zap size={12} className={isRunning ? 'text-[#c1e84f]' : 'text-[#536178]'} />
        <span>
          {runtime.status === 'RUNNING'
            ? 'Mock preview connected'
            : runtime.status === 'STARTING'
              ? 'Waiting for runtime'
              : runtime.status === 'ERROR'
                ? 'Runtime error'
                : 'Start the project to connect'}
        </span>
        <span className="ml-auto font-mono text-[9px]">1280 × 720</span>
      </div>
    </aside>
  );
}

function PreviewHeader({ runtime, statusClass, onReload }: { runtime: RuntimeSnapshot; statusClass: string; onReload: () => void }) {
  return (
    <div className="panel-header flex h-11 shrink-0 items-center justify-between border-b border-[#252d40] px-4">
      <div className="flex items-center gap-2">
        <Globe2 size={14} className="text-[#56d2df]" />
        <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#98a5b7]">Preview</span>
        <span className={`rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[.12em] ${statusClass}`}>{runtime.status}</span>
      </div>
      <button type="button" onClick={onReload} disabled={runtime.status !== 'RUNNING'} className="rounded p-1.5 text-[#718096] hover:bg-white/[.06] hover:text-[#d9dfdc] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Refresh preview" data-testid="button-refresh-preview"><RotateCw size={14} /></button>
    </div>
  );
}

function PreviewAddressBar({ runtime }: { runtime: RuntimeSnapshot }) {
  const address = runtime.previewUrl ?? 'Preview offline';
  return (
    <div className="flex items-center gap-2 border-b border-[#252d40] px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-[#2d374c] bg-[#0e1324] px-2.5 py-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${runtime.status === 'RUNNING' ? 'bg-[#c1e84f]' : runtime.status === 'STARTING' ? 'bg-[#56d2df]' : 'bg-[#536178]'}`} />
        <span className="truncate font-mono text-[10px] text-[#7e8b9d]">{address}</span>
      </div>
      <button type="button" disabled={runtime.status !== 'RUNNING'} className="rounded border border-[#2d374c] p-1.5 text-[#718096] hover:bg-white/[.06] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Open preview in new window" data-testid="button-open-preview"><ArrowDownToLine size={13} /></button>
    </div>
  );
}

function PreviewState({ title, detail, tone }: { title: string; detail: string; tone: 'stopped' | 'starting' | 'error' }) {
  const color = tone === 'error' ? 'text-[#ef8374]' : tone === 'starting' ? 'text-[#56d2df]' : 'text-[#718096]';
  return (
    <div className="flex min-h-[450px] flex-col items-center justify-center rounded-xl border border-[#2a3347] bg-[#0e1324] p-8 text-center">
      <div className={`mb-4 h-2 w-2 rounded-full ${tone === 'error' ? 'bg-[#ef8374]' : tone === 'starting' ? 'animate-pulse bg-[#56d2df]' : 'bg-[#536178]'}`} />
      <h3 className={`font-mono text-[12px] ${color}`}>{title}</h3>
      <p className="mt-2 max-w-[240px] text-[10px] leading-relaxed text-[#617087]">{detail}</p>
    </div>
  );
}

function GuildPreview() {
  return (
    <div className="px-7 py-8 sm:px-9 sm:py-10">
      <div className="mb-10 flex items-start justify-between">
        <div>
          <p className="mb-3 font-mono text-[9px] font-medium uppercase tracking-[.25em] text-[#6c7b79]">The Guild</p>
          <h2 className="font-sans text-4xl font-semibold tracking-[-.07em] text-[#263440]">New Era<span className="text-[#b0c94b]">.</span></h2>
          <p className="mt-3 max-w-[210px] text-[11px] leading-relaxed text-[#65716f]">A city is a collection of signals. Someone has to listen.</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#aebdb0] bg-[#f1f3ea] text-[11px] font-semibold text-[#61736d]">NG</div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2 rounded-lg bg-[#263440] p-4 text-[#e7eadf]">
          <div className="mb-8 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[.15em] text-[#abbcaf]">Active district</span><Activity size={14} className="text-[#b9d658]" /></div>
          <p className="font-sans text-xl font-medium tracking-[-.04em]">Lantern Row</p>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-[#aebcb0]"><span className="h-1.5 w-1.5 rounded-full bg-[#bed85a]" /> Quiet trade · 04:18</div>
        </div>
        {['Signal Yard', 'North Gate'].map((name, index) => (
          <div key={name} className="rounded-lg border border-[#cad3c7] bg-[#e7ebe0]/80 p-3.5">
            <div className="mb-5 font-mono text-[9px] text-[#84918a]">0{index + 2}</div>
            <div className="text-[11px] font-medium text-[#34463f]">{name}</div>
            <div className="mt-1 text-[9px] text-[#7c8982]">{index ? 'first light' : 'open channel'}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-between border-t border-[#cad3c7] pt-4 font-mono text-[9px] text-[#83908a]"><span>3 districts online</span><span>v0.4.2</span></div>
    </div>
  );
}