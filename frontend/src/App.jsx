// frontend/src/App.jsx
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import SocketDebug from './components/common/SocketDebug';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        {/* ✅ НОВОЕ: Debug панель (только в development) 
        <SocketDebug />*/}
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;