export type SendStatus = 'pending' | 'sent' | 'failed';

export interface Chat {
  id: string;
  title: string;
  /** Пока имени нет, в заголовке номер. Имя из входящего сообщения его заменит */
  placeholderTitle: boolean;
  phone?: string;
  unread: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  chatId: string;
  text: string;
  direction: 'in' | 'out';
  timestamp: number;
  status?: SendStatus;
}

export interface ChatData {
  chats: Record<string, Chat>;
  messages: Record<string, Message[]>;
  activeChatId: string | null;
}

export const emptyChatData = (): ChatData => ({ chats: {}, messages: {}, activeChatId: null });

export interface ChatInput {
  id: string;
  title: string;
  placeholderTitle?: boolean;
  phone?: string;
}

export function upsertChat(data: ChatData, input: ChatInput, now = Date.now()): ChatData {
  const existing = data.chats[input.id];
  const placeholderTitle = input.placeholderTitle ?? false;

  if (!existing) {
    const chat: Chat = {
      id: input.id,
      title: input.title,
      placeholderTitle,
      phone: input.phone,
      unread: 0,
      updatedAt: now,
    };
    return { ...data, chats: { ...data.chats, [chat.id]: chat }, messages: { ...data.messages, [chat.id]: [] } };
  }

  // Настоящее имя заменяет заглушку
  const upgrade = existing.placeholderTitle && !placeholderTitle;
  const next: Chat = {
    ...existing,
    title: upgrade ? input.title : existing.title,
    placeholderTitle: upgrade ? false : existing.placeholderTitle,
    phone: existing.phone ?? input.phone,
  };
  return { ...data, chats: { ...data.chats, [next.id]: next } };
}

/** Добавляет сообщение. Дубликат  игнорируется */
export function addMessage(data: ChatData, msg: Message): ChatData {
  const chat = data.chats[msg.chatId];
  if (!chat) return data;
  const list = data.messages[msg.chatId] ?? [];
  if (list.some((m) => m.id === msg.id)) return data;

  const isOpen = data.activeChatId === msg.chatId;
  const nextChat: Chat = {
    ...chat,
    updatedAt: Math.max(chat.updatedAt, msg.timestamp),
    unread: msg.direction === 'in' && !isOpen ? chat.unread + 1 : chat.unread,
  };
  return {
    ...data,
    chats: { ...data.chats, [chat.id]: nextChat },
    messages: { ...data.messages, [chat.id]: [...list, msg] },
  };
}

/** Меняет временные поля сообщения на настоящие после отправки */
export function patchMessage(
  data: ChatData,
  chatId: string,
  id: string,
  patch: Partial<Pick<Message, 'id' | 'status'>>,
): ChatData {
  const list = data.messages[chatId];
  if (!list?.some((m) => m.id === id)) return data;
  const taken = patch.id !== undefined && patch.id !== id && list.some((m) => m.id === patch.id);
  const next = taken
    ? list.filter((m) => m.id !== id) // настоящий id уже пришёл другим путём: временную копию убираем
    : list.map((m) => (m.id === id ? { ...m, ...patch } : m));
  return { ...data, messages: { ...data.messages, [chatId]: next } };
}

export function openChat(data: ChatData, chatId: string | null): ChatData {
  if (chatId === null) return { ...data, activeChatId: null };
  const chat = data.chats[chatId];
  if (!chat) return data;
  return { ...data, activeChatId: chatId, chats: { ...data.chats, [chatId]: { ...chat, unread: 0 } } };
}

export function sortedChats(data: ChatData): Chat[] {
  return Object.values(data.chats).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function lastMessage(data: ChatData, chatId: string): Message | undefined {
  const list = data.messages[chatId];
  return list?.[list.length - 1];
}
