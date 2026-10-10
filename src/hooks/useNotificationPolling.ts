import { useEffect } from 'react';
import { describeError, isAbortError } from '../api/errors';
import type { MessengerApi } from '../api/types';
import { sleep } from '../lib/sleep';
import { useApp } from '../store/appStore';

const RECEIVE_TIMEOUT_SEC = 5;
const MAX_BACKOFF_MS = 15_000;

/**
 * Long polling очереди уведомлений: получить -> обработать -> удалить.
 * Удалять нужно каждое уведомление, включая проигнорированные: иначе GREEN-API
 * будет отдавать одно и то же снова и очередь застрянет.
 */
export function useNotificationPolling(api: MessengerApi | null) {
  useEffect(() => {
    if (!api) return;
    const ac = new AbortController();
    const { signal } = ac;
    const app = useApp.getState();

    void (async () => {
      let failures = 0;
      while (!signal.aborted) {
        try {
          const n = await api.receiveNotification(RECEIVE_TIMEOUT_SEC, signal);
          failures = 0;
          app.setConnection('online');
          if (!n) continue;

          try {
            app.handleNotification(n);
          } catch (err) {
            console.error('Не удалось обработать уведомление', err);
          }
          await api.deleteNotification(n.receiptId, signal);
        } catch (e) {
          if (signal.aborted || isAbortError(e)) return;
          failures += 1;
          app.setConnection('error', describeError(e));
          await sleep(Math.min(1000 * 2 ** (failures - 1), MAX_BACKOFF_MS), signal);
        }
      }
    })();

    return () => ac.abort();
  }, [api]);
}
