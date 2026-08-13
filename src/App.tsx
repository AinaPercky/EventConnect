/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Scan from './pages/Scan.tsx';
import Register from './pages/Register.tsx';
import { LayoutDashboard, ScanLine, LogOut, Menu, X } from 'lucide-react';
import React, { useState } from 'react';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn, logOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Chargement...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Accès Organisateur</h1>
          <p className="text-slate-600 mb-8">Veuillez vous connecter pour gérer l'évènement.</p>
          <button 
            onClick={signIn}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Connexion Google
          </button>
        </div>
      </div>
    );
  }

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="h-screen bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row overflow-hidden relative">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-800 p-4 text-white shrink-0 z-40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Event<span className="text-blue-400">Connect</span></h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex w-full md:w-64 bg-slate-800 text-white flex-col shrink-0 absolute md:relative z-50 h-[calc(100vh-60px)] md:h-full top-[60px] md:top-0`}>
        <div className="p-6 border-b border-slate-700 hidden md:block">
          <h1 className="text-xl font-bold tracking-tight text-white">Event<span className="text-blue-400">Connect</span></h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Event Management</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link 
            to="/" 
            onClick={closeMenu}
            className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${location.pathname === '/' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 cursor-pointer'}`}
          >
            <div className={`w-2 h-2 rounded-full mr-3 ${location.pathname === '/' ? 'bg-white' : 'bg-slate-500'}`}></div>
            Tableau de bord
          </Link>
          <Link 
            to="/scan" 
            onClick={closeMenu}
            className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${location.pathname === '/scan' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 cursor-pointer'}`}
          >
            <div className={`w-2 h-2 rounded-full mr-3 ${location.pathname === '/scan' ? 'bg-white' : 'bg-slate-500'}`}></div>
            Scanner Badge
          </Link>
        </nav>
        <div className="p-6 bg-slate-900 border-t border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-bold text-white">
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate pr-2">
                <p className="text-sm font-medium text-white truncate max-w-[120px]">{user.email}</p>
                <p className="text-xs text-slate-500">Admin</p>
              </div>
            </div>
            <button onClick={logOut} className="text-slate-500 hover:text-white" title="Déconnexion">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30 top-[60px]" 
          onClick={closeMenu}
        />
      )}

      <main className="flex-1 flex flex-col overflow-y-auto relative z-10 bg-slate-50">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route 
            path="/" 
            element={
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            } 
          />
          <Route 
            path="/scan" 
            element={
              <ProtectedLayout>
                <Scan />
              </ProtectedLayout>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
