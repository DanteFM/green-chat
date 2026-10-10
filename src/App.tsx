import { LoginScreen } from './components/LoginScreen';
import { Messenger } from './components/Messenger';
import { useApp } from './store/appStore';

export default function App() {
  const loggedIn = useApp((s) => s.session !== null);
  return loggedIn ? <Messenger /> : <LoginScreen />;
}
