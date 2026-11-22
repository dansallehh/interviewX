export interface TabConflictEvent {
  sessionId: string;
  otherTabId: string;
  detectedAt: number;
}

type ConflictListener = (event: TabConflictEvent) => void;

const CHANNEL_NAME = 'interviewx:tab-sync';
const STORAGE_PING_KEY = 'interviewx:tab-ping';

interface TabMessage {
  type: 'claim' | 'ack';
  sessionId: string;
  tabId: string;
  ts: number;
}

export class TabSyncService {
  readonly tabId: string;
  private sessionId: string | null = null;
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<ConflictListener>();
  private boundStorageHandler: (e: StorageEvent) => void;

  constructor(tabId?: string) {
    this.tabId = tabId ?? `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    this.boundStorageHandler = (event: StorageEvent) => {
      if (event.key !== STORAGE_PING_KEY || !event.newValue) return;
      try {
        const msg = JSON.parse(event.newValue) as TabMessage;
        this.handleMessage(msg);
      } catch {
        // Ignore malformed cross-tab messages
      }
    };
  }

  claimSession(sessionId: string): void {
    this.release();
    this.sessionId = sessionId;

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<TabMessage>) => {
        if (event.data) this.handleMessage(event.data);
      };
    }

    window.addEventListener('storage', this.boundStorageHandler);
    this.broadcast({ type: 'claim', sessionId, tabId: this.tabId, ts: Date.now() });
  }

  onConflict(listener: ConflictListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  release(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    window.removeEventListener('storage', this.boundStorageHandler);
    this.sessionId = null;
  }

  private broadcast(msg: TabMessage): void {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch {
        // Ignore closed channel
      }
    }
    try {
      window.localStorage.setItem(STORAGE_PING_KEY, JSON.stringify(msg));
    } catch {
      // Ignore restricted storage
    }
  }

  private handleMessage(msg: TabMessage): void {
    if (!this.sessionId || msg.tabId === this.tabId || msg.sessionId !== this.sessionId) {
      return;
    }

    if (msg.type === 'claim') {
      // Notify the newcomer tab that this tab already holds the session
      this.broadcast({
        type: 'ack',
        sessionId: this.sessionId,
        tabId: this.tabId,
        ts: Date.now(),
      });
    }

    const conflict: TabConflictEvent = {
      sessionId: this.sessionId,
      otherTabId: msg.tabId,
      detectedAt: Date.now(),
    };
    this.listeners.forEach((fn) => fn(conflict));
  }
}
