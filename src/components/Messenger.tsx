import { useNotificationPolling } from '../hooks/useNotificationPolling';
import { useApp } from '../store/appStore';
import { Banner } from './Banner';
import { ChatWindow } from './ChatWindow';
import { Sidebar } from './Sidebar';

export function Messenger() {
  const api = useApp((s) => s.api);
  const hasActiveChat = useApp((s) => s.data.activeChatId !== null);
  useNotificationPolling(api);

  return (
    <div className="app" data-view={hasActiveChat ? 'chat' : 'list'}>
      <Sidebar />
      <ChatWindow />
      <Banner />
    </div>
  );
}
