import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

// Actua como el centro de control superior proporcionando acceso rapido al perfil
// personal, la busqueda de personas y la gestion de la cuenta.
function Navegacion() {
    const { usuario, cerrarSesion } = useAuth();
    const navegar = useNavigate();

    // Resuelve la ubicacion exacta de la imagen de perfil del usuario para asegurar
    // que se visualice correctamente en el encabezado de la navegacion.
    const obtenerUrlAvatar = (img) => {
        if (!img) return null;
        return img.startsWith('http') ? img : `${API_URL}${img}`;
    };

    // Ejecuta las tareas de limpieza de datos locales y redirige al usuario hacia
    // la pantalla de bienvenida para finalizar su sesion de forma segura.
    const alCerrarSesion = () => {
        cerrarSesion();
        navegar('/login');
    };

    return (
        <div className="sidebar-header">
            <div className="user-avatar" onClick={() => navegar('/perfil')} title="Mi Perfil">
                {usuario?.foto ? (
                    <img src={obtenerUrlAvatar(usuario.foto)} alt="Perfil" />
                ) : (
                    <div className="avatar-placeholder">
                        {(usuario?.nombre || usuario?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            <div className="sidebar-actions">
                <button className="icon-btn" onClick={() => navegar('/usuarios')} title="Nuevo Chat / Usuarios">
                    <span role="img" aria-label="Nuevo Chat">➕</span>
                </button>
                <button className="icon-btn" onClick={() => navegar('/solicitudes')} title="Solicitudes">
                    <span role="img" aria-label="Solicitudes">🔔</span>
                </button>
                <button className="icon-btn" onClick={alCerrarSesion} title="Cerrar Sesión">
                    <span role="img" aria-label="Salir">🚪</span>
                </button>
            </div>
        </div>
    );
}

export default Navegacion;
