import { Fragment, useLayoutEffect, useRef } from 'react';
import { dayKey, formatDay, formatTime } from '../lib/format';
import type { Message } from '../store/chatState';
import { useApp } from '../store/appStore';
import { AlertIcon, CheckIcon, ClockIcon } from './icons';

const NEAR_BOTTOM_PX = 120;
const NO_MESSAGES: Message[] = [];

function Status({ message, onRetry }: { message: Message; onRetry: () => void }) {
  if (message.direction !== 'out') return null;
  if (message.status === 'pending') {
    return <ClockIcon role="img" aria-label="Отправляется" />;
  }
  if (message.status === 'failed') {
    return (
      <button type="button" className="msg__retry" onClick={onRetry}>
        <AlertIcon aria-hidden="true" /> Не отправлено. Повторить
      </button>
    );
  }
  return <CheckIcon role="img" aria-label="Отправлено" />;
}

export function MessageList({ chatId }: { chatId: string }) {
  const messages = useApp((s) => s.data.messages[chatId] ?? NO_MESSAGES);
  const retrySend = useApp((s) => s.retrySend);
  const ref = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const last = messages[messages.length - 1];

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && (stickToBottom.current || last?.direction === 'out')) el.scrollTop = el.scrollHeight;
  }, [messages.length, last?.direction]);

  const onScroll = () => {
    const el = ref.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  if (messages.length === 0) {
    return <div className="messages messages--empty">Напишите первое сообщение</div>;
  }

  return (
    <div className="messages" ref={ref} onScroll={onScroll} role="log" aria-live="polite" aria-label="Сообщения">
      {messages.map((m, i) => {
        const newDay = i === 0 || dayKey(messages[i - 1]!.timestamp) !== dayKey(m.timestamp);
        return (
          <Fragment key={m.id}>
            {newDay && <div className="day-sep">{formatDay(m.timestamp)}</div>}
            <div className={`msg msg--${m.direction}${m.status === 'failed' ? ' msg--failed' : ''}`}>
              <span className="msg__text">{m.text}</span>
              <span className="msg__meta">
                <time>{formatTime(m.timestamp)}</time>
                <Status message={m} onRetry={() => void retrySend(chatId, m.id)} />
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
