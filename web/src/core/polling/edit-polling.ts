import type { Edit } from '../api/contracts';

export const TERMINAL_EDIT_STATUSES = [
  'completed',
  'failed',
  'cancelled',
] as const;
export function isTerminalEdit(edit: Pick<Edit, 'status'>): boolean {
  return TERMINAL_EDIT_STATUSES.some((status) => status === edit.status);
}

export function nextPollDelay(input: {
  status?: Edit['status'];
  hidden: boolean;
  online: boolean;
  failures: number;
}): number | false {
  if (input.status && isTerminalEdit({ status: input.status })) return false;
  if (!input.online) return false;
  const base = input.hidden ? 10_000 : 2_000;
  return Math.min(60_000, base * 2 ** Math.min(input.failures, 5));
}

export interface EditPollingOptions {
  fetchEdit: (signal: AbortSignal) => Promise<Edit>;
  onEdit: (edit: Edit) => void;
  onReconnect?: (reconnecting: boolean) => void;
  document?: Document;
  window?: Window;
}

export function observeEdit(options: EditPollingOptions): () => void {
  const doc = options.document ?? globalThis.document;
  const win = options.window ?? globalThis.window;
  let active = true;
  let running = false;
  let failures = 0;
  let status: Edit['status'] | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    const delay = nextPollDelay({
      status,
      hidden: doc.hidden,
      online: win.navigator.onLine,
      failures,
    });
    if (active && delay !== false)
      timer = setTimeout(() => {
        void poll();
      }, delay);
  }

  async function poll() {
    if (
      !active ||
      running ||
      (status && isTerminalEdit({ status })) ||
      !win.navigator.onLine
    )
      return;
    running = true;
    controller = new AbortController();
    try {
      const edit = await options.fetchEdit(controller.signal);
      if (!active) return;
      status = edit.status;
      failures = 0;
      options.onReconnect?.(false);
      options.onEdit(edit);
    } catch {
      if (active && !controller.signal.aborted) {
        failures += 1;
        options.onReconnect?.(true);
      }
    } finally {
      running = false;
      if (active) schedule();
    }
  }

  function wake() {
    if (!active || !win.navigator.onLine) return;
    if (timer) clearTimeout(timer);
    timer = undefined;
    void poll();
  }
  function onVisibilityChange() {
    if (doc.hidden) schedule();
    else wake();
  }
  function onOnline() {
    wake();
  }
  doc.addEventListener('visibilitychange', onVisibilityChange);
  win.addEventListener('online', onOnline);
  win.addEventListener('offline', schedule);
  void poll();
  return () => {
    active = false;
    if (timer) clearTimeout(timer);
    controller?.abort();
    doc.removeEventListener('visibilitychange', onVisibilityChange);
    win.removeEventListener('online', onOnline);
    win.removeEventListener('offline', schedule);
  };
}
