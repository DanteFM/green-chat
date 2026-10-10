import { describe, expect, it } from 'vitest';
import {
  addMessage,
  emptyChatData,
  lastMessage,
  openChat,
  patchMessage,
  sortedChats,
  upsertChat,
  type Message,
} from './chatState';

const msg = (over: Partial<Message> = {}): Message => ({
  id: 'm1',
  chatId: 'c1',
  text: 'hi',
  direction: 'in',
  timestamp: 1000,
  ...over,
});

const withChat = (title = '+79001234567', placeholderTitle = true) =>
  upsertChat(emptyChatData(), { id: 'c1', title, placeholderTitle }, 500);

describe('chatState', () => {
  it('upsertChat: повторный вызов не создаёт дубль и не теряет сообщения', () => {
    let d = withChat();
    d = addMessage(d, msg());
    d = upsertChat(d, { id: 'c1', title: '+79001234567', placeholderTitle: true });
    expect(Object.keys(d.chats)).toHaveLength(1);
    expect(d.messages.c1).toHaveLength(1);
  });

  it('upsertChat: настоящее имя заменяет заглушку, но не наоборот', () => {
    let d = withChat();
    d = upsertChat(d, { id: 'c1', title: 'Анна Орлова' });
    expect(d.chats.c1).toMatchObject({ title: 'Анна Орлова', placeholderTitle: false });

    d = upsertChat(d, { id: 'c1', title: '+7900', placeholderTitle: true });
    expect(d.chats.c1!.title).toBe('Анна Орлова');
  });

  it('addMessage игнорирует дубликаты по id', () => {
    let d = withChat();
    d = addMessage(d, msg());
    d = addMessage(d, msg());
    expect(d.messages.c1).toHaveLength(1);
    expect(d.chats.c1!.unread).toBe(1);
  });

  it('addMessage не создаёт чат сам', () => {
    const d = addMessage(emptyChatData(), msg());
    expect(d.messages).toEqual({});
  });

  it('непрочитанные растут только для входящих в закрытом чате', () => {
    let d = withChat();
    d = addMessage(d, msg({ id: 'a' }));
    d = addMessage(d, msg({ id: 'b', direction: 'out' }));
    expect(d.chats.c1!.unread).toBe(1);

    d = openChat(d, 'c1');
    expect(d.chats.c1!.unread).toBe(0);
    d = addMessage(d, msg({ id: 'c' }));
    expect(d.chats.c1!.unread).toBe(0);
  });

  it('чаты сортируются по последней активности', () => {
    let d = upsertChat(emptyChatData(), { id: 'old', title: 'a' }, 100);
    d = upsertChat(d, { id: 'new', title: 'b' }, 200);
    expect(sortedChats(d).map((c) => c.id)).toEqual(['new', 'old']);

    d = addMessage(d, msg({ chatId: 'old', timestamp: 300 }));
    expect(sortedChats(d).map((c) => c.id)).toEqual(['old', 'new']);
  });

  it('patchMessage: временный id заменяется настоящим, статус обновляется', () => {
    let d = withChat();
    d = addMessage(d, msg({ id: 'tmp', direction: 'out', status: 'pending' }));
    d = patchMessage(d, 'c1', 'tmp', { id: 'real', status: 'sent' });
    expect(lastMessage(d, 'c1')).toMatchObject({ id: 'real', status: 'sent' });
  });

  it('patchMessage: если настоящий id уже есть, временная копия удаляется', () => {
    let d = withChat();
    d = addMessage(d, msg({ id: 'real', direction: 'out', status: 'sent' }));
    d = addMessage(d, msg({ id: 'tmp', direction: 'out', status: 'pending', timestamp: 1100 }));
    d = patchMessage(d, 'c1', 'tmp', { id: 'real', status: 'sent' });
    expect(d.messages.c1!.map((m) => m.id)).toEqual(['real']);
  });

  it('openChat с несуществующим id ничего не ломает', () => {
    const d = withChat();
    expect(openChat(d, 'nope')).toBe(d);
    expect(openChat(openChat(d, 'c1'), null).activeChatId).toBeNull();
  });
});
