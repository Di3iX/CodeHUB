import { Archive, Copy, GripHorizontal, Terminal as TerminalIcon, X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { TerminalLine } from '@/lib/terminal-service';

type TerminalPanelProps = {
  lines: TerminalLine[];
  history: string[];
  isRunning: boolean;
  desktop?: boolean;
  height?: number;
  onExecute: (command: string) => Promise<void>;
  onClear: () => void;
  onCopy: () => void;
  onResize?: (height: number) => void;
  onClose?: () => void;
};

export default function TerminalPanel({
  lines,
  history,
  isRunning,
  desktop = false,
  height = 218,
  onExecute,
  onClear,
  onCopy,
  onResize,
  onClose,
}: TerminalPanelProps) {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const command = input.trim();
    if (!command || isExecuting) return;

    setInput('');
    setHistoryIndex(-1);
    setIsExecuting(true);
    try {
      await onExecute(command);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!history.length) return;
      const nextIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(nextIndex);
      setInput(history[history.length - 1 - nextIndex] ?? '');
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setInput('');
        return;
      }
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setInput(history[history.length - 1 - nextIndex] ?? '');
    }
  };

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!desktop || !onResize) return;
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = height;

    const handleMove = (moveEvent: PointerEvent) => {
      const nextHeight = Math.min(480, Math.max(140, startHeight + startY - moveEvent.clientY));
      onResize(nextHeight);
    };
    const stopResize = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', stopResize);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', stopResize);
  };

  return (
    <section className={`${desktop ? 'hidden md:flex' : 'mobile-only'} terminal-panel min-h-0 flex-col bg-[#0e1324]`}>
      {desktop && (
        <div
          className="terminal-resize-handle flex h-2 shrink-0 cursor-row-resize items-center justify-center border-t border-[#252d40]"
          onPointerDown={startResize}
          role="separator"
          aria-label="Resize terminal"
          aria-orientation="horizontal"
          data-testid="terminal-resize-handle"
        >
          <GripHorizontal size={13} className="text-[#4b5970]" />
        </div>
      )}
      <div className="panel-header flex h-10 shrink-0 items-center justify-between border-b border-[#252d40] px-4">
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} className="text-[#56d2df]" />
          <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#98a5b7]">Terminal</span>
          <span className="rounded bg-[#202b3f] px-1.5 py-0.5 font-mono text-[8px] text-[#718096]">zsh</span>
          <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? 'bg-[#c1e84f]' : 'bg-[#536178]'}`} title={isRunning ? 'Preview running' : 'Preview idle'} />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onCopy} className="rounded p-1.5 text-[#6c7a90] hover:bg-white/[.06] hover:text-[#d9dfdc]" aria-label="Copy terminal output" data-testid="button-copy-terminal"><Copy size={13} /></button>
          <button type="button" onClick={onClear} className="rounded p-1.5 text-[#6c7a90] hover:bg-white/[.06] hover:text-[#d9dfdc]" aria-label="Clear terminal" data-testid="button-clear-terminal"><Archive size={13} /></button>
          {onClose && <button type="button" onClick={onClose} className="rounded p-1.5 text-[#6c7a90] hover:bg-white/[.06] hover:text-[#d9dfdc]" aria-label="Close terminal" data-testid="button-close-terminal"><X size={14} /></button>}
        </div>
      </div>
      <div ref={outputRef} className="min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-[11px] leading-[1.8]" data-testid="terminal-output">
        {lines.map((line) => (
          <div key={line.id} className={`terminal-line ${line.kind === 'command' ? 'terminal-command' : ''} ${line.kind === 'stderr' ? 'terminal-error' : ''} ${line.kind === 'system' ? 'terminal-system' : ''}`}>
            {line.kind === 'command' ? <><span className="prompt">$</span> {line.text}</> : line.text}
          </div>
        ))}
        {isExecuting && <div className="terminal-line"><span className="prompt">·</span> running mock command…</div>}
      </div>
      <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-2 border-t border-[#252d40] px-4 py-2.5 font-mono text-[11px]">
        <span className="prompt">$</span>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleInputKeyDown}
          className="min-w-0 flex-1 bg-transparent text-[#d6ded9] outline-none placeholder:text-[#536178]"
          placeholder="Type a command…"
          aria-label="Terminal command"
          autoComplete="off"
          spellCheck={false}
          disabled={isExecuting}
          data-testid="input-terminal-command"
        />
        <span className="text-[9px] text-[#4e5d73]">Enter</span>
      </form>
    </section>
  );
}