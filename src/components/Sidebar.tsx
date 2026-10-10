import { useState } from 'react';
import { useApp } from '../store/appStore';
import { ChatList } from './ChatList';
import { CloseIcon, LogoutIcon, PlusIcon } from './icons';
import { NewChatForm } from './NewChatForm';

const CONNECTION_LABEL = {
  idle: 'Подключение…',
  online: 'На связи',
  error: 'Нет связи',
} as const;

export function Sidebar() {
  const session = useApp((s) => s.session);
  const connection = useApp((s) => s.connection);
  const logout = useApp((s) => s.logout);
  const [creating, setCreating] = useState(false);

  const subtitle = session?.mode === 'demo' ? 'Демо-режим' : `Инстанс ${session?.creds.idInstance ?? ''}`;

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <div className="sidebar__heading">
          <h1 className="sidebar__title">Чаты</h1>
          <span className="sidebar__subtitle">
            <span
              className={`status-dot status-dot--${connection}`}
              role="img"
              aria-label={CONNECTION_LABEL[connection]}
              title={CONNECTION_LABEL[connection]}
            />
            {subtitle}
          </span>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setCreating((v) => !v)}
          aria-label={creating ? 'Закрыть форму' : 'Новый чат'}
          aria-expanded={creating}
        >
          {creating ? <CloseIcon /> : <PlusIcon />}
        </button>
        <button type="button" className="icon-btn" onClick={logout} aria-label="Выйти">
          <LogoutIcon />
        </button>
      </header>

      {creating && <NewChatForm onDone={() => setCreating(false)} />}

      <div className="sidebar__scroll">
        <ChatList />
      </div>
    </aside>
  );
}
