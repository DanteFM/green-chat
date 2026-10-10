import { GreenApiError, errorFromResponse, isAbortError } from './errors';
import type {
  CheckAccountResult,
  Credentials,
  InstanceState,
  MessengerApi,
  Notification,
  SendMessageResult,
} from './types';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const MIN_RECEIVE_TIMEOUT = 5;
const MAX_RECEIVE_TIMEOUT = 60;

export class GreenApiHttpClient implements MessengerApi {
  private readonly creds: Credentials;
  private readonly fetchImpl: FetchLike;

  constructor(creds: Credentials, fetchImpl: FetchLike = (input, init) => fetch(input, init)) {
    this.creds = creds;
    this.fetchImpl = fetchImpl;
  }

  private url(method: string, tail = ''): string {
    const base = this.creds.apiUrl.trim().replace(/\/+$/, '');
    const id = encodeURIComponent(this.creds.idInstance.trim());
    const token = encodeURIComponent(this.creds.apiTokenInstance.trim());
    return `${base}/waInstance${id}/${method}/${token}${tail}`;
  }

  private async request(
    method: 'GET' | 'POST' | 'DELETE',
    url: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<unknown> {
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    } catch (e) {
      if (isAbortError(e)) throw e;
      throw new GreenApiError('Network request failed', 'network');
    }

    const text = await res.text();
    if (!res.ok) throw errorFromResponse(res.status, text);
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new GreenApiError('Сервис вернул не JSON', 'unknown', res.status);
    }
  }

  async getStateInstance(signal?: AbortSignal): Promise<InstanceState> {
    const data = (await this.request('GET', this.url('getStateInstance'), undefined, signal)) as {
      stateInstance?: unknown;
    } | null;
    return { stateInstance: typeof data?.stateInstance === 'string' ? data.stateInstance : undefined };
  }

  async checkAccount(phone: string, signal?: AbortSignal): Promise<CheckAccountResult> {
    const data = (await this.request(
      'POST',
      this.url('checkAccount'),
      { phoneNumber: Number(phone) },
      signal,
    )) as Record<string, unknown> | null;

    // Ошибки метода приходят и телом `{ status: false, reason }`, и HTTP-кодами.
    if (data && data.status === false) {
      const nested = data.data as { reason?: string } | undefined;
      const reason = String(data.reason ?? nested?.reason ?? '');
      if (reason === 'rate_limit_exceeded' || /rate limited/i.test(reason)) {
        throw new GreenApiError(reason, 'rate-limit');
      }
      if (/starting or not authorized/i.test(reason)) {
        throw new GreenApiError(reason, 'instance-not-ready');
      }
      throw new GreenApiError(reason || 'Не удалось проверить номер', 'unknown');
    }

    const chatId = data?.chatId == null ? '' : String(data.chatId);
    return {
      exist: Boolean(data?.exist) && chatId !== '',
      chatId,
      username: typeof data?.username === 'string' ? data.username : undefined,
      phoneNumber: typeof data?.phoneNumber === 'number' ? data.phoneNumber : undefined,
    };
  }

  async sendMessage(chatId: string, text: string, signal?: AbortSignal): Promise<SendMessageResult> {
    const data = (await this.request(
      'POST',
      this.url('sendMessage'),
      { chatId, message: text },
      signal,
    )) as { idMessage?: unknown } | null;
    if (data?.idMessage == null) {
      throw new GreenApiError('Ответ без idMessage', 'unknown');
    }
    return { idMessage: String(data.idMessage) };
  }

  async receiveNotification(timeoutSec: number, signal?: AbortSignal): Promise<Notification | null> {
    const t = Math.min(MAX_RECEIVE_TIMEOUT, Math.max(MIN_RECEIVE_TIMEOUT, Math.round(timeoutSec)));
    const data = (await this.request(
      'GET',
      this.url('receiveNotification', `?receiveTimeout=${t}`),
      undefined,
      signal,
    )) as Partial<Notification> | null;

    if (!data || typeof data.receiptId !== 'number' || !data.body) return null;
    return { receiptId: data.receiptId, body: data.body };
  }

  async deleteNotification(receiptId: number, signal?: AbortSignal): Promise<boolean> {
    const data = (await this.request(
      'DELETE',
      this.url('deleteNotification', `/${receiptId}`),
      undefined,
      signal,
    )) as { result?: unknown } | null;
    return data?.result === true;
  }
}
