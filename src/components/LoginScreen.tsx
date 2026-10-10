import { useState, type FormEvent } from 'react';
import { describeError } from '../api/errors';
import { GreenApiHttpClient } from '../api/http';
import { useApp } from '../store/appStore';

const DEFAULT_API_URL = (import.meta.env.VITE_DEFAULT_API_URL as string | undefined) ?? '';

export function LoginScreen() {
  const login = useApp((s) => s.login);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [idInstance, setIdInstance] = useState('');
  const [token, setToken] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const creds = { apiUrl: apiUrl.trim(), idInstance: idInstance.trim(), apiTokenInstance: token.trim() };

    if (!/^(https?:\/\/|\/)\S+$/.test(creds.apiUrl)) {
      return setError('apiUrl должен начинаться с https:// (или с / при работе через прокси).');
    }
    if (!/^\d+$/.test(creds.idInstance)) return setError('idInstance состоит только из цифр.');
    if (!creds.apiTokenInstance) return setError('Введите apiTokenInstance.');

    setBusy(true);
    setError(null);
    try {
      const api = new GreenApiHttpClient(creds);
      const { stateInstance } = await api.getStateInstance();
      const notice =
        stateInstance && stateInstance !== 'authorized'
          ? `Состояние инстанса: ${stateInstance}. Отправка и получение заработают после авторизации в личном кабинете.`
          : undefined;
      login({ mode: 'live', creds }, { remember, api, notice });
    } catch (err) {
      setError(describeError(err));
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <form className="login__card" onSubmit={submit} noValidate>
        <h1 className="login__title">Telegram через GREEN-API</h1>
        <p className="login__hint">Все три значения есть в личном кабинете GREEN-API на странице инстанса.</p>

        <label className="field">
          <span className="field__label">apiUrl</span>
          <input
            className="field__input"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="Скопируйте из личного кабинета"
            autoComplete="off"
            spellCheck={false}
            inputMode="url"
          />
        </label>
        <label className="field">
          <span className="field__label">idInstance</span>
          <input
            className="field__input"
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            placeholder="Только цифры"
            autoComplete="off"
            inputMode="numeric"
          />
        </label>
        <label className="field">
          <span className="field__label">apiTokenInstance</span>
          <input
            className="field__input"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Ключ доступа инстанса"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <label className="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>
            Запомнить на этом устройстве
            <small>Токен сохранится в браузере. Без галочки он живёт до закрытия вкладки.</small>
          </span>
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? 'Проверяем…' : 'Войти'}
        </button>
        <button className="btn btn--ghost" type="button" disabled={busy} onClick={() => login({ mode: 'demo' })}>
          Демо без GREEN-API
        </button>
      </form>
    </main>
  );
}
