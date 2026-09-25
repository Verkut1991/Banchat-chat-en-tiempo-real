import './App.css';
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Login from './componentes/Login';
import Registro from './componentes/Registro';
import Chat from './componentes/Chat';
import Perfil from './componentes/Perfil';
import ListaUsuarios from './componentes/ListaUsuarios';
import Amigos from './componentes/Amigos';
import Solicitudes from './componentes/Solicitudes';
import Navegacion from './componentes/Navegacion';

import { AuthProvider, useAuth } from './context/AuthContext';

// Esta funcion actua como el escenario principal donde se montan los elementos visuales del chat
// segun la navegacion del usuario y la visibilidad de los componentes laterales.
function DisenoPrincipal() {
  const ubicacion = useLocation();
  const estaChatActivo = ubicacion.pathname !== '/';

  return (
    <div className={`app-container ${estaChatActivo ? 'mobile-chat-active' : ''}`}>
      {/* Sidebar - always visible on desktop, hidden on mobile if chat active */}
      <div className="sidebar">
        <Navegacion />
        <Amigos />
      </div>

      {/* Area de Contenido Principal */}
      <div className="main-chat">
        <Routes>
          <Route path="/" element={
            <div className="empty-chat-placeholder">
              <h1>BanChat</h1>
              <p>Envía y recibe mensajes.</p>
            </div>
          } />
          <Route path="/chat" element={<Chat />} />
          <Route path="/perfil" element={<div className="chat-messages"><Perfil /></div>} />
          <Route path="/usuarios" element={<div className="chat-messages"><ListaUsuarios /></div>} />
          <Route path="/solicitudes" element={<div className="chat-messages"><Solicitudes /></div>} />
        </Routes>
      </div>
    </div>
  );
}

// Decide que vista mostrar al usuario dependiendo de si ha pasado por el proceso
// de autenticacion o si todavia necesita identificarse ante el sistema.
function ContenidoApp() {
  const { usuario } = useAuth();

  return (
    <div className="App">
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={!usuario ? <div className="auth-wrapper"><Login /></div> : <Navigate to="/" />} />
        <Route path="/registro" element={!usuario ? <div className="auth-wrapper"><Registro /></div> : <Navigate to="/" />} />

        {/* Rutas Protegidas - Diseño Principal */}
        {usuario ? (
          <Route
            path="*"
            element={<DisenoPrincipal />}
          />
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </div>
  );
}

// Punto de entrada de la aplicacion que envuelve toda la logica en los proveedores
// de rutas y de autenticacion para que el estado sea accesible globalmente.
function App() {
  return (
    <Router>
      <AuthProvider>
        <ContenidoApp />
      </AuthProvider>
    </Router>
  );
}

export default App;
