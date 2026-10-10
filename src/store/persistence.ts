import type { Session } from '../api/factory';
import { emptyChatData, type ChatData } from './chatState';

const SESSION_KEY = 'green-chat:session';
const dataKey = (key: string) => `green-chat:data:${key}`;

function read(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(storage: Storage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

function remove(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
  }
}

const isSession = (v: unknown): v is Session => {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  if (s.mode === 'demo') return true;
  const c = s.creds as Record<string, unknown> | undefined;
  return (
    s.mode === 'live' &&
    typeof c?.apiUrl === 'string' &&
    typeof c.idInstance === 'string' &&
    typeof c.apiTokenInstance === 'string'
  );
};

export function saveSession(session: Session, remember: boolean) {
  clearSession();
  write(remember ? localStorage : sessionStorage, SESSION_KEY, session);
}

export function loadSession(): Session | null {
  const v = read(sessionStorage, SESSION_KEY) ?? read(localStorage, SESSION_KEY);
  return isSession(v) ? v : null;
}

export function clearSession() {
  remove(sessionStorage, SESSION_KEY);
  remove(localStorage, SESSION_KEY);
}

export function loadChatData(key: string): ChatData {
  const v = read(localStorage, dataKey(key)) as Partial<ChatData> | null;
  if (!v || typeof v.chats !== 'object' || typeof v.messages !== 'object') return emptyChatData();
  return {
    chats: v.chats ?? {},
    messages: v.messages ?? {},
    activeChatId: typeof v.activeChatId === 'string' && v.chats?.[v.activeChatId] ? v.activeChatId : null,
  };
}

export function saveChatData(key: string, data: ChatData) {
  write(localStorage, dataKey(key), data);
}

export function clearChatData(key: string) {
  remove(localStorage, dataKey(key));
}
