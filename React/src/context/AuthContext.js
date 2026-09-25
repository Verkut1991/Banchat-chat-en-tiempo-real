import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

// Este componente gestiona la persistencia de la sesion del usuario buscando datos guardados 
// en el almacenamiento local al iniciar la aplicacion para mantener el acceso activo.
export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const usuarioGuardado = localStorage.getItem('usuario');

        if (token && usuarioGuardado) {
            try {
                setUsuario(JSON.parse(usuarioGuardado));
            } catch (err) {
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
            }
        }
        setCargando(false);
    }, []);

    // Se encarga de guardar las credenciales y el perfil del usuario en el navegador
    // para que la identidad persista incluso si el usuario refresca la pestaña.
    const iniciarSesion = (datosUsuario, token) => {
        if (token) localStorage.setItem('token', token);
        localStorage.setItem('usuario', JSON.stringify(datosUsuario));
        setUsuario(datosUsuario);
    };

    // Borra cualquier rastro de la identidad del usuario en el dispositivo
    // asegurando que la sesion se cierre de forma completa y segura.
    const cerrarSesion = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setUsuario(null);
    };

    // Permite refrescar la informacion del perfil del usuario en tiempo real
    // sincronizando los cambios locales con la memoria del estado global.
    const actualizarUsuario = (nuevosDatos) => {
        const usuarioActualizado = { ...usuario, ...nuevosDatos };
        localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
        setUsuario(usuarioActualizado);
    };

    return (
        <AuthContext.Provider value={{ usuario, iniciarSesion, cerrarSesion, actualizarUsuario, cargando }}>
            {!cargando && children}
        </AuthContext.Provider>
    );
}

// Facilita el acceso directo a los datos y funciones de autenticacion desde cualquier
// rincon de la interfaz sin necesidad de pasar informacion manualmente por las ramas.
export const useAuth = () => useContext(AuthContext);
