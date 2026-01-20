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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProductProvider>
        <FinanceProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/s2admin" element={<Admin />} />
              <Route path="/supadmin" element={<SupadminDashboard />} />
              <Route path="/inventory" element={<Inventory />} />
            </Routes>
          </Router>
        </FinanceProvider>
      </ProductProvider>
    </AuthProvider>
  );
};

export default App;
