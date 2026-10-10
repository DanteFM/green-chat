import { GreenApiError } from './errors';
import type {
  CheckAccountResult,
  InstanceState,
  MessengerApi,
  Notification,
  NotificationBody,
  SendMessageResult,
} from './types';

export interface MockOptions {
  latencyMs?: number;
  replyDelayMs?: [number, number];
  greetingAfterMs?: number | null;
}

const NAMES = ['Анна Иванова', 'Сергей Петров', 'Екатерина Сидорова', 'Дмитрий Кузнецов', 'Елена Медведева'];
const REPLIES = [
  'Привет! Получил твоё сообщение 👋',
  'Интересно, расскажи подробнее',
  'Окей, понял',
  'Давай обсудим это позже',
  'Звучит хорошо!',
];
export const GREETING_CHAT_ID = '10000042';

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('aborted', 'AbortError'));
    const t = setTimeout(done, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException('aborted', 'AbortError'));
    };
    function done() {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });

/**
 * Мок GREEN-API для демо и тестов. Ведёт себя как настоящий сервис:
 * уведомление лежит в очереди, пока его не удалят, а ответ собеседника приходит с задержкой.
 */
export class MockApi implements MessengerApi {
  private readonly latencyMs: number;
  private readonly replyDelayMs: [number, number];
  private queue: Notification[] = [];
  private receiptSeq = 1000;
  private messageSeq = 0;
  private replySeq = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private wake = new Set<() => void>();
  private disposed = false;

  constructor({ latencyMs = 250, replyDelayMs = [1200, 2600], greetingAfterMs = 8000 }: MockOptions = {}) {
    this.latencyMs = latencyMs;
    this.replyDelayMs = replyDelayMs;
    if (greetingAfterMs !== null) {
      this.later(greetingAfterMs, () =>
        this.pushIncoming(
          GREETING_CHAT_ID,
          'Сидни Суини',
          'Привет! Это правда я, Сидни Суини из Америки.',
        ),
      );
    }
  }

  async getStateInstance(signal?: AbortSignal): Promise<InstanceState> {
    await sleep(this.latencyMs, signal);
    return { stateInstance: 'authorized' };
  }

  async checkAccount(phone: string, signal?: AbortSignal): Promise<CheckAccountResult> {
    await sleep(this.latencyMs, signal);
    if (!/^\d{8,15}$/.test(phone)) {
      throw new GreenApiError("Validation failed. Details: Wrong format. 'phoneNumber' must contain only digits", 'validation', 400);
    }
    if (phone.endsWith('0')) return { exist: false, chatId: '' };
    return {
      exist: true,
      chatId: String(10_000_000 + Number(phone.slice(-7))),
      phoneNumber: Number(phone),
    };
  }

  async sendMessage(chatId: string, text: string, signal?: AbortSignal): Promise<SendMessageResult> {
    await sleep(this.latencyMs, signal);
    if (!text.trim()) throw new GreenApiError("Validation failed. Details: 'message' is required", 'validation', 400);

    const idMessage = `mock-${Date.now()}-${++this.messageSeq}`;
    this.push({ typeWebhook: 'outgoingMessageStatus', idMessage, timestamp: this.nowSec() });

    const [min, max] = this.replyDelayMs;
    const reply = REPLIES[this.replySeq++ % REPLIES.length]!;
    const name = NAMES[Number(chatId) % NAMES.length]!;
    this.later(min + Math.random() * (max - min), () => this.pushIncoming(chatId, name, reply));
    return { idMessage };
  }

  async receiveNotification(timeoutSec: number, signal?: AbortSignal): Promise<Notification | null> {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    if (this.queue.length === 0) await this.waitForPush(timeoutSec * 1000, signal);
    return this.queue[0] ?? null;
  }

  async deleteNotification(receiptId: number): Promise<boolean> {
    const before = this.queue.length;
    this.queue = this.queue.filter((n) => n.receiptId !== receiptId);
    return this.queue.length < before;
  }

  dispose(): void {
    this.disposed = true;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.wake.forEach((fn) => fn());
  }

  private nowSec() {
    return Math.floor(Date.now() / 1000);
  }

  private later(ms: number, fn: () => void) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      if (!this.disposed) fn();
    }, ms);
    this.timers.add(t);
  }

  private pushIncoming(chatId: string, name: string, text: string) {
    this.push({
      typeWebhook: 'incomingMessageReceived',
      timestamp: this.nowSec(),
      idMessage: `mock-in-${Date.now()}-${++this.messageSeq}`,
      senderData: { chatId, chatName: name, sender: chatId, senderName: name },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
    });
  }

  private push(body: NotificationBody) {
    this.queue.push({ receiptId: ++this.receiptSeq, body });
    this.wake.forEach((fn) => fn());
  }

  private waitForPush(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const finish = () => {
        clearTimeout(timer);
        this.wake.delete(finish);
        signal?.removeEventListener('abort', onAbort);
        resolve();
      };
      const onAbort = () => {
        clearTimeout(timer);
        this.wake.delete(finish);
        reject(new DOMException('aborted', 'AbortError'));
      };
      const timer = setTimeout(finish, ms);
      this.wake.add(finish);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}
