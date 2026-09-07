export type TerminalLineKind = 'command' | 'stdout' | 'stderr' | 'system';

export type TerminalLine = {
  id: string;
  kind: TerminalLineKind;
  text: string;
};

export type TerminalOutput = {
  kind: Exclude<TerminalLineKind, 'command'>;
  text: string;
};

export type TerminalResult = {
  output: TerminalOutput[];
  exitCode: number;
  clear?: boolean;
};

export type TerminalSize = {
  cols: number;
  rows: number;
};

/**
 * Transport boundary for the terminal UI.
 *
 * A future WebSocket implementation can satisfy this contract without
 * changing TerminalPanel or the rest of the workspace shell.
 */
export interface TerminalService {
  execute(command: string): Promise<TerminalResult>;
  resize(size: TerminalSize): Promise<void> | void;
}

export const initialTerminalTranscript: TerminalLine[] = [
  { id: 'seed-command-install', kind: 'command', text: 'npm install' },
  { id: 'seed-output-install', kind: 'stdout', text: 'added 42 packages in 1.2s' },
  { id: 'seed-command-dev', kind: 'command', text: 'npm run dev' },
  { id: 'seed-output-dev-ready', kind: 'stdout', text: 'VITE v7.3.6 ready in 142 ms' },
  { id: 'seed-output-dev-local', kind: 'stdout', text: '➜  Local: http://localhost:5173/' },
  { id: 'seed-command-build', kind: 'command', text: 'npm run build' },
  { id: 'seed-output-build', kind: 'stdout', text: '✓ built in 1.84s' },
];

export class MockTerminalService implements TerminalService {
  async execute(command: string): Promise<TerminalResult> {
    const normalized = command.trim();

    if (!normalized) {
      return { output: [], exitCode: 0 };
    }

    if (normalized === 'clear') {
      return { output: [], exitCode: 0, clear: true };
    }

    if (normalized === 'npm install') {
      return {
        output: [
          { kind: 'stdout', text: '⠋ resolving packages...' },
          { kind: 'stdout', text: 'added 42 packages in 1.2s' },
        ],
        exitCode: 0,
      };
    }

    if (normalized === 'npm run dev') {
      return {
        output: [
          { kind: 'stdout', text: '> the-guild-new-era@0.4.2 dev' },
          { kind: 'stdout', text: '> vite' },
          { kind: 'stdout', text: 'VITE v7.3.6 ready in 142 ms' },
          { kind: 'stdout', text: '➜  Local: http://localhost:5173/' },
        ],
        exitCode: 0,
      };
    }

    if (normalized === 'npm run build') {
      return {
        output: [
          { kind: 'stdout', text: '> the-guild-new-era@0.4.2 build' },
          { kind: 'stdout', text: '> vite build' },
          { kind: 'stdout', text: '✓ built in 1.84s' },
        ],
        exitCode: 0,
      };
    }

    if (normalized === 'help') {
      return {
        output: [
          { kind: 'system', text: 'Available mock commands:' },
          { kind: 'system', text: '  npm install     Install project dependencies' },
          { kind: 'system', text: '  npm run dev     Start the local preview' },
          { kind: 'system', text: '  npm run build   Build the project' },
          { kind: 'system', text: '  clear           Clear terminal output' },
        ],
        exitCode: 0,
      };
    }

    return {
      output: [{ kind: 'stderr', text: `zsh: command not found: ${normalized}` }],
      exitCode: 127,
    };
  }

  resize(_size: TerminalSize) {
    // The mock service does not have a process to resize yet.
  }
}