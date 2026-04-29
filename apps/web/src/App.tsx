import { AppLayout } from './app/AppLayout.js';
import { AppStateProvider } from './state/appState.js';

export default function App() {
  return (
    <AppStateProvider>
      <AppLayout />
    </AppStateProvider>
  );
}
