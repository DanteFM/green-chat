import { GreenApiHttpClient } from './http';
import { MockApi, type MockOptions } from './mock';
import type { Credentials, MessengerApi } from './types';

export type Session = { mode: 'demo' } | { mode: 'live'; creds: Credentials };

export function createApi(session: Session, mockOptions?: MockOptions): MessengerApi {
  return session.mode === 'demo' ? new MockApi(mockOptions) : new GreenApiHttpClient(session.creds);
}

/** Ключ, по которому хранятся чаты: у каждого инстанса (и демо) своя история. */
export function sessionKey(session: Session): string {
  return session.mode === 'demo' ? 'demo' : `live:${session.creds.idInstance.trim()}`;
}
