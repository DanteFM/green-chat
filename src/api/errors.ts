export type GreenApiErrorKind =
  | 'network'
  | 'auth'
  | 'quota'
  | 'rate-limit'
  | 'webhook-conflict'
  | 'instance-not-ready'
  | 'validation'
  | 'server'
  | 'unknown';

export class GreenApiError extends Error {
  readonly kind: GreenApiErrorKind;
  readonly status?: number;

  constructor(message: string, kind: GreenApiErrorKind, status?: number) {
    super(message);
    this.name = 'GreenApiError';
    this.kind = kind;
    this.status = status;
  }
}

export function isAbortError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError';
}

export function errorFromResponse(status: number, body: string): GreenApiError {
  const text = body.trim().slice(0, 300);
  if (status === 401 || status === 403) return new GreenApiError(text, 'auth', status);
  if (status === 466) return new GreenApiError(text, 'quota', status);
  if (status === 429 || status === 469) return new GreenApiError(text, 'rate-limit', status);
  if (status === 400 && /custom webhook url is set/i.test(body)) {
    return new GreenApiError(text, 'webhook-conflict', status);
  }
  if (status === 400) return new GreenApiError(text, 'validation', status);
  if (status >= 500) return new GreenApiError(text, 'server', status);
  return new GreenApiError(text, 'unknown', status);
}

export function describeError(e: unknown): string {
  if (!(e instanceof GreenApiError)) {
    return e instanceof Error && e.message ? e.message : 'Что-то пошло не так';
  }
  switch (e.kind) {
    case 'network':
      return 'Нет связи с GREEN-API. Проверьте интернет и apiUrl.';
    case 'auth':
      return 'Неверный idInstance или apiTokenInstance.';
    case 'quota':
      return 'Исчерпан лимит бесплатного тарифа Developer (3 чата). Обмен возможен только с уже существующими чатами.';
    case 'rate-limit':
      return 'Слишком много запросов. Подождите немного и повторите.';
    case 'webhook-conflict':
      return 'У инстанса задан webhookUrl. Очистите его в настройках инстанса, подождите минуту и повторите.';
    case 'instance-not-ready':
      return 'Инстанс запускается или не авторизован. Авторизуйте его в личном кабинете.';
    case 'validation':
      return e.message || 'Запрос отклонён: неверные параметры.';
    case 'server':
      return 'Сервис временно недоступен. Повторите через несколько минут.';
    default:
      return e.message || 'Неизвестная ошибка GREEN-API.';
  }
}
