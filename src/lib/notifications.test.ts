import { describe, expect, it } from 'vitest';
import { parseIncomingMessage } from './notifications';
import type { Notification } from '../api/types';

const incoming = (over: Partial<Notification['body']> = {}): Notification => ({
  receiptId: 5,
  body: {
    typeWebhook: 'incomingMessageReceived',
    timestamp: 1763115112,
    idMessage: 'm1',
    senderData: {
      chatId: '10000000',
      chatName: 'Василиса',
      senderName: 'Сидни Суини',
      senderPhoneNumber: 79876543210,
    },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
    ...over,
  },
});

describe('parseIncomingMessage', () => {
  it('разбирает входящее текстовое сообщение', () => {
    expect(parseIncomingMessage(incoming())).toEqual({
      id: 'm1',
      chatId: '10000000',
      name: 'Сидни Суини',
      phone: '79876543210',
      text: 'Привет',
      timestamp: 1763115112000,
    });
  });

  it('понимает сообщение со ссылкой (extendedTextMessageData)', () => {
    const n = incoming({ messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'https://x.y' } } });
    expect(parseIncomingMessage(n)?.text).toBe('https://x.y');
  });

  it.each(['outgoingMessageStatus', 'outgoingAPIMessageReceived', 'stateInstanceChanged'])(
    'игнорирует %s',
    (typeWebhook) => {
      expect(parseIncomingMessage(incoming({ typeWebhook }))).toBeNull();
    },
  );

  it('игнорирует сообщения без текста (картинки, стикеры)', () => {
    const n = incoming({ messageData: { typeMessage: 'imageMessage' } });
    expect(parseIncomingMessage(n)).toBeNull();
  });

  it('подставляет время получения и составной id, если их нет в уведомлении', () => {
    const n = incoming({ timestamp: undefined, idMessage: undefined });
    const parsed = parseIncomingMessage(n, 42_000);
    expect(parsed?.timestamp).toBe(42_000);
    expect(parsed?.id).toBe('10000000:42000:5');
  });
});
