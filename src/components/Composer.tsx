import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { SendIcon } from './icons';

const MAX_LENGTH = 4096;
const MAX_ROWS_PX = 140;

interface Props {
  onSend: (text: string) => void;
}

export function Composer({ onSend }: Props) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = text.trim().length > 0;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, [text]);

  const send = () => {
    if (!canSend) return;
    onSend(text);
    setText('');
    ref.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <textarea
        ref={ref}
        className="composer__input"
        rows={1}
        value={text}
        maxLength={MAX_LENGTH}
        placeholder="Сообщение"
        aria-label="Сообщение"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {text.length > MAX_LENGTH - 200 && (
        <span className="composer__counter">
          {text.length}/{MAX_LENGTH}
        </span>
      )}
      <button type="submit" className="send-btn" disabled={!canSend} aria-label="Отправить">
        <SendIcon />
      </button>
    </form>
  );
}
