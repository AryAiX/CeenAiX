import { RouterProvider } from 'react-router-dom';
import { PreviewPinGate } from './components/PreviewPinGate';
import { AuthProvider } from './lib/auth-context';
import { router } from './lib/router';

function App() {
  return (
    <AuthProvider>
      <PreviewPinGate>
        <RouterProvider router={router} />
      </PreviewPinGate>
    </AuthProvider>
  );
}

export default App;
