export type RuntimeStatus = 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR';

export type RuntimeSnapshot = {
  status: RuntimeStatus;
  previewUrl?: string;
  error?: string;
};

export type RuntimeLog = {
  level: 'info' | 'error';
  text: string;
};

export type RuntimeEvent =
  | { type: 'snapshot'; snapshot: RuntimeSnapshot }
  | { type: 'log'; log: RuntimeLog };

/**
 * Runtime boundary for the workspace.
 *
 * A future cloud/Docker adapter can implement this contract while the Run
 * controls, Terminal, and Preview remain unchanged.
 */
export interface RuntimeManager {
  getSnapshot(): RuntimeSnapshot;
  start(): Promise<RuntimeSnapshot>;
  stop(): Promise<RuntimeSnapshot>;
  restart(): Promise<RuntimeSnapshot>;
  subscribe(listener: (event: RuntimeEvent) => void): () => void;
}

const MOCK_PREVIEW_URL = 'http://localhost:5173/';

export class MockRuntimeManager implements RuntimeManager {
  private snapshot: RuntimeSnapshot = { status: 'STOPPED' };
  private listeners = new Set<(event: RuntimeEvent) => void>();
  private transitionId = 0;

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener: (event: RuntimeEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async start() {
    if (this.snapshot.status === 'RUNNING') return this.snapshot;
    if (this.snapshot.status === 'STARTING') return this.snapshot;

    const transitionId = ++this.transitionId;
    this.updateSnapshot({ status: 'STARTING' });
    this.emitLog({ level: 'info', text: 'Starting mock runtime…' });
    await this.wait(850);

    if (transitionId !== this.transitionId) return this.snapshot;

    this.updateSnapshot({ status: 'RUNNING', previewUrl: MOCK_PREVIEW_URL });
    this.emitLog({ level: 'info', text: 'Runtime is ready' });
    this.emitLog({ level: 'info', text: `Preview available at ${MOCK_PREVIEW_URL}` });
    return this.snapshot;
  }

  async stop() {
    ++this.transitionId;
    if (this.snapshot.status === 'STOPPED') return this.snapshot;

    this.emitLog({ level: 'info', text: 'Stopping runtime…' });
    this.updateSnapshot({ status: 'STOPPED' });
    this.emitLog({ level: 'info', text: 'Runtime stopped' });
    return this.snapshot;
  }

  async restart() {
    await this.stop();
    return this.start();
  }

  private updateSnapshot(snapshot: RuntimeSnapshot) {
    this.snapshot = snapshot;
    this.emit({ type: 'snapshot', snapshot });
  }

  private emitLog(log: RuntimeLog) {
    this.emit({ type: 'log', log });
  }

  private emit(event: RuntimeEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  private wait(duration: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, duration);
    });
  }
}