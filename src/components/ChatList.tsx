import { useMemo } from 'react';
import { formatListTime } from '../lib/format';
import { lastMessage, sortedChats } from '../store/chatState';
import { useApp } from '../store/appStore';
import { Avatar } from './Avatar';

export function ChatList() {
  const data = useApp((s) => s.data);
  const openChat = useApp((s) => s.openChat);
  const chats = useMemo(() => sortedChats(data), [data]);

  if (chats.length === 0) {
    return (
      <p className="empty-note">
        Чатов пока нет. Нажмите «+» и введите номер получателя: чат появится здесь, а входящие сообщения
        от новых собеседников добавятся автоматически.
      </p>
    );
  }

  return (
    <ul className="chat-list" aria-label="Чаты">
      {chats.map((chat) => {
        const last = lastMessage(data, chat.id);
        const active = data.activeChatId === chat.id;
        return (
          <li key={chat.id}>
            <button
              type="button"
              className={`chat-item${active ? ' chat-item--active' : ''}`}
              onClick={() => openChat(chat.id)}
              aria-current={active ? 'true' : undefined}
            >
              <Avatar id={chat.id} title={chat.title} />
              <span className="chat-item__body">
                <span className="chat-item__row">
                  <span className="chat-item__title">{chat.title}</span>
                  {last && <time className="chat-item__time">{formatListTime(last.timestamp)}</time>}
                </span>
                <span className="chat-item__row">
                  <span className="chat-item__preview">
                    {last ? `${last.direction === 'out' ? 'Вы: ' : ''}${last.text}` : 'Нет сообщений'}
                  </span>
                  {chat.unread > 0 && (
                    <span className="badge" aria-label={`Непрочитанных: ${chat.unread}`}>
                      {chat.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
