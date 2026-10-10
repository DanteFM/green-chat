import { formatPhone } from '../lib/phone';
import { useApp } from '../store/appStore';
import { Avatar } from './Avatar';
import { Composer } from './Composer';
import { BackIcon } from './icons';
import { MessageList } from './MessageList';

export function ChatWindow() {
  const chat = useApp((s) => (s.data.activeChatId ? s.data.chats[s.data.activeChatId] : undefined));
  const openChat = useApp((s) => s.openChat);
  const sendText = useApp((s) => s.sendText);

  if (!chat) {
    return (
      <section className="chat chat--empty">
        <p>Выберите чат слева или создайте новый по номеру телефона</p>
      </section>
    );
  }

  return (
    <section className="chat">
      <header className="chat__header">
        <button type="button" className="icon-btn chat__back" onClick={() => openChat(null)} aria-label="Назад к чатам">
          <BackIcon />
        </button>
        <Avatar id={chat.id} title={chat.title} size={40} />
        <div className="chat__heading">
          <h2 className="chat__title">{chat.title}</h2>
          <span className="chat__subtitle">{chat.phone ? formatPhone(chat.phone) : `ID ${chat.id}`}</span>
        </div>
      </header>
      {/* key: при смене чата список и поле ввода создаются заново (прокрутка и черновик не «протекают»). */}
      <MessageList key={chat.id} chatId={chat.id} />
      <Composer key={`composer-${chat.id}`} onSend={(text) => void sendText(chat.id, text)} />
    </section>
  );
}
