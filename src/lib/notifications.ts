import type { Notification } from '../api/types';

export interface IncomingMessage {
  id: string;
  chatId: string;
  name?: string;
  phone?: string;
  text: string;
  timestamp: number;
}

export function parseIncomingMessage(n: Notification, now = Date.now()): IncomingMessage | null {
  const { body } = n;
  if (body.typeWebhook !== 'incomingMessageReceived') return null;

  const chatId = body.senderData?.chatId;
  const data = body.messageData;
  if (!chatId || !data) return null;

  // Для сообщений со ссылкой extendedTextMessageData.
  const text = data.textMessageData?.textMessage ?? data.extendedTextMessageData?.text;
  if (!text) return null;

  const sender = body.senderData;
  const name = sender?.senderContactName || sender?.senderName || sender?.chatName || undefined;
  const timestamp = body.timestamp ? body.timestamp * 1000 : now;

  return {
    id: body.idMessage ?? `${chatId}:${timestamp}:${n.receiptId}`,
    chatId,
    name,
    phone: sender?.senderPhoneNumber ? String(sender.senderPhoneNumber) : undefined,
    text,
    timestamp,
  };
}
