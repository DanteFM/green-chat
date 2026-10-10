import { useState, type SubmitEvent } from 'react';
import { describeError } from '../api/errors';
import { useApp } from '../store/appStore';

interface Props {
  onDone: () => void;
}

export function NewChatForm({ onDone }: Props) {
  const startChat = useApp((s) => s.startChat);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await startChat(phone);
      onDone();
    } catch (err) {
      setError(describeError(err));
      setBusy(false);
    }
  };

  return (
    <form className="new-chat" onSubmit={submit} noValidate>
      <label className="field">
        <span className="field__label">Номер получателя</span>
        <input
          className="field__input"
          type="tel"
          inputMode="tel"
          autoFocus
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="В международном формате, например 79001234567"
          autoComplete="off"
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn--primary" type="submit" disabled={busy || !phone.trim()}>
        {busy ? 'Проверяем номер…' : 'Создать чат'}
      </button>
    </form>
  );
}
