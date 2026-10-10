import { useApp } from '../store/appStore';
import { CloseIcon } from './icons';

export function Banner() {
  const connectionError = useApp((s) => s.connectionError);
  const notice = useApp((s) => s.notice);
  const dismiss = useApp((s) => s.dismissNotice);

  const text = connectionError ?? notice;
  if (!text) return null;

  return (
    <div className="banner" role="alert">
      <span>{text}</span>
      {!connectionError && (
        <button type="button" className="icon-btn icon-btn--small" onClick={dismiss} aria-label="Закрыть сообщение">
          <CloseIcon width={16} height={16} />
        </button>
      )}
    </div>
  );
}
