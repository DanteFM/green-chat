import { create } from 'zustand';
import { createApi, sessionKey, type Session } from '../api/factory';
import { describeError, GreenApiError } from '../api/errors';
import { GREETING_CHAT_ID } from '../api/mock';
import type { MessengerApi, Notification } from '../api/types';
import { parseIncomingMessage } from '../lib/notifications';
import { formatPhone, isValidPhone, normalizePhone } from '../lib/phone';
import {
  addMessage,
  emptyChatData,
  openChat as openChatIn,
  patchMessage,
  upsertChat,
  type ChatData,
} from './chatState';
import {
  clearChatData,
  clearSession,
  loadChatData,
  loadSession,
  saveChatData,
  saveSession,
} from './persistence';

export type Connection = 'idle' | 'online' | 'error';

export interface LoginOptions {
  remember?: boolean;
  api?: MessengerApi;
  notice?: string;
}

interface AppState {
  session: Session | null;
  api: MessengerApi | null;
  data: ChatData;
  connection: Connection;
  connectionError: string | null;
  notice: string | null;

  restore: () => void;
  login: (session: Session, options?: LoginOptions) => void;
  logout: () => void;
  openChat: (chatId: string | null) => void;
  startChat: (phone: string) => Promise<string>;
  sendText: (chatId: string, text: string) => Promise<void>;
  retrySend: (chatId: string, messageId: string) => Promise<void>;
  handleNotification: (n: Notification) => void;
  setConnection: (connection: Connection, error?: string | null) => void;
  dismissNotice: () => void;
}

const initial = {
  session: null,
  api: null,
  data: emptyChatData(),
  connection: 'idle' as Connection,
  connectionError: null,
  notice: null,
};

let localSeq = 0;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useApp = create<AppState>()((set, get) => {
  const startSession = (session: Session, options: LoginOptions = {}) => {
    const data = loadChatData(sessionKey(session));
    // Приветствие от нового контакта в демо один раз
    const api =
      options.api ??
      createApi(session, { greetingAfterMs: data.chats[GREETING_CHAT_ID] ? null : undefined });
    set({ ...initial, session, api, data, notice: options.notice ?? null });
  };

  const deliver = async (chatId: string, localId: string, text: string) => {
    const api = get().api;
    if (!api) return;
    try {
      const { idMessage } = await api.sendMessage(chatId, text);
      set((s) => ({ data: patchMessage(s.data, chatId, localId, { id: idMessage, status: 'sent' }), notice: null }));
    } catch (e) {
      set((s) => ({
        data: patchMessage(s.data, chatId, localId, { status: 'failed' }),
        notice: `Сообщение не отправлено. ${describeError(e)}`,
      }));
    }
  };

  return {
    ...initial,

    restore() {
      const session = loadSession();
      if (session) startSession(session);
    },

    login(session, options = {}) {
      saveSession(session, options.remember ?? false);
      startSession(session, options);
    },

    logout() {
      const { api, session } = get();
      api?.dispose?.();
      clearTimeout(saveTimer);
      if (session) clearChatData(sessionKey(session));
      clearSession();
      set({ ...initial, data: emptyChatData() });
    },

    openChat(chatId) {
      set((s) => ({ data: openChatIn(s.data, chatId) }));
    },

    async startChat(rawPhone) {
      const { api } = get();
      if (!api) throw new GreenApiError('Нет активной сессии', 'unknown');

      const phone = normalizePhone(rawPhone);
      if (!isValidPhone(phone)) {
        throw new GreenApiError('Введите номер в международном формате: от 8 до 15 цифр.', 'validation');
      }

      // Для знакомого номера CheckAccount не вызываем
      const known = Object.values(get().data.chats).find((c) => c.phone === phone);
      if (known) {
        get().openChat(known.id);
        return known.id;
      }

      const res = await api.checkAccount(phone);
      if (!res.exist) {
        throw new GreenApiError(
          'Аккаунт Telegram с таким номером не найден или скрыт настройками приватности.',
          'validation',
        );
      }
      set((s) => ({
        data: openChatIn(
          upsertChat(s.data, { id: res.chatId, title: res.username || formatPhone(phone), placeholderTitle: true, phone }),
          res.chatId,
        ),
      }));
      return res.chatId;
    },

    async sendText(chatId, rawText) {
      const text = rawText.trim();
      if (!text || !get().data.chats[chatId]) return;
      const localId = `local-${Date.now()}-${++localSeq}`;
      set((s) => ({
        data: addMessage(s.data, { id: localId, chatId, text, direction: 'out', timestamp: Date.now(), status: 'pending' }),
      }));
      await deliver(chatId, localId, text);
    },

    async retrySend(chatId, messageId) {
      const msg = get().data.messages[chatId]?.find((m) => m.id === messageId);
      if (!msg || msg.status !== 'failed') return;
      set((s) => ({ data: patchMessage(s.data, chatId, messageId, { status: 'pending' }) }));
      await deliver(chatId, messageId, msg.text);
    },

    handleNotification(n) {
      const msg = parseIncomingMessage(n);
      if (!msg) return;
      set((s) => {
        const withChat = upsertChat(s.data, {
          id: msg.chatId,
          title: msg.name ?? (msg.phone ? formatPhone(msg.phone) : `Чат ${msg.chatId}`),
          placeholderTitle: !msg.name,
          phone: msg.phone,
        });
        return {
          data: addMessage(withChat, {
            id: msg.id,
            chatId: msg.chatId,
            text: msg.text,
            direction: 'in',
            timestamp: msg.timestamp,
          }),
        };
      });
    },

    setConnection(connection, error = null) {
      const s = get();
      if (s.connection === connection && s.connectionError === error) return;
      set({ connection, connectionError: error });
    },

    dismissNotice() {
      set({ notice: null });
    },
  };
});

// Сохраняем чаты с небольшой задержкой, чтобы не писать в localStorage на каждое нажатие.
useApp.subscribe((state, prev) => {
  if (!state.session || state.data === prev.data) return;
  const key = sessionKey(state.session);
  const data = state.data;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveChatData(key, data), 150);
});
