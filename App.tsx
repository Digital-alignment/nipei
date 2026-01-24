import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProductProvider } from './context/ProductContext';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import SupadminDashboard from './pages/SupadminDashboard';
import SupadminUsers from './pages/SupadminUsers';
import S5Admin from './pages/S5Admin';
import Supaglobal from './pages/Supaglobal';
import UserForm from './pages/UserForm';
import NotificationToast from './components/NotificationToast';
import GuardiaoDashboard from './pages/GuardiaoDashboard';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationToast />
      <ProductProvider>
        <FinanceProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/s2admin" element={<Admin />} />
              <Route path="/s5admin" element={<S5Admin />} />
              <Route path="/supadmin" element={<SupadminDashboard />} />
              <Route path="/supadmin/users" element={<SupadminUsers />} />
              <Route path="/supaglobal" element={<Supaglobal />} />
              <Route path="/guardiao" element={<GuardiaoDashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/u/:slug" element={<UserForm />} />
            </Routes>
          </Router>
        </FinanceProvider>
      </ProductProvider>
    </AuthProvider>
  );
};

export default App;
