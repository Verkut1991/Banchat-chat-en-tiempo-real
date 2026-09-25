import React, { useState, useEffect } from 'react';

import { API_URL } from '../config';

// Muestra un directorio global de todas las personas registradas permitiendo descubrir
// nuevas conexiones y expandir el circulo de contactos del usuario.
function ListaUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [mensaje, setMensaje] = useState('');
    const token = localStorage.getItem('token');
    const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');

    useEffect(() => {
        cargarUsuarios();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Recupera del servidor la lista completa de personas exceptuando a quien esta mirando
    // para evitar que el usuario se encuentre a si mismo en la busqueda global.
    const cargarUsuarios = async () => {
        try {
            const res = await fetch(`${API_URL}/usuarios`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const datos = await res.json();
            setUsuarios(datos.filter(u => u.id !== usuarioActual.id));
        } catch (err) {
            console.error('Error cargando usuarios:', err);
        }
    };

    // Filtra la lista de personas basandose en un termino de busqueda para localizar
    // rapidamente a alguien especifico por su nombre o alias registrado.
    const buscarUsuarios = async () => {
        if (!busqueda.trim()) {
            cargarUsuarios();
            return;
        }
        try {
            const res = await fetch(`${API_URL}/usuarios/buscar?q=${encodeURIComponent(busqueda)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const datos = await res.json();
            setUsuarios(datos.filter(u => u.id !== usuarioActual.id));
        } catch (err) {
            console.error('Error buscando usuarios:', err);
        }
    };

    // Envia una invitacion formal de contacto a otra persona para iniciar el proceso
    // que permitira a ambos intercambiar mensajes de forma privada en el futuro.
    const enviarSolicitud = async (paraUsuarioId) => {
        try {
            const res = await fetch(`${API_URL}/amistades/solicitud`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ paraUsuarioId })
            });

            const datos = await res.json();
            if (!res.ok) {
                setMensaje(datos.error);
            } else {
                setMensaje('Solicitud enviada correctamente');
            }
            setTimeout(() => setMensaje(''), 2000);
        } catch (err) {
            setMensaje('Error al enviar solicitud');
        }
    };

    // Asegura que la ruta de la imagen sea accesible para el navegador traduciendo
    // los datos almacenados en una direccion web valida y funcional.
    const obtenerUrlAvatar = (img) => {
        if (!img) return null;
        return img.startsWith('http') ? img : `${API_URL}${img}`;
    };

    return (
        <div className="lista-container">
            <h2>Usuarios</h2>

            <div className="busqueda-bar">
                <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && buscarUsuarios()}
                />
                <button onClick={buscarUsuarios}>Buscar</button>
            </div>

            {mensaje && <p className="info-msg">{mensaje}</p>}

            <div className="usuarios-lista">
                {usuarios.length === 0 ? (
                    <p className="empty-msg">No se encontraron usuarios</p>
                ) : (
                    usuarios.map(usuario => (
                        <div key={usuario.id} className="usuario-card">
                            <div className="usuario-avatar">
                                {usuario.foto ? (
                                    <img src={obtenerUrlAvatar(usuario.foto)} alt={usuario.nombre} />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {(usuario.nombre || 'U').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="usuario-info">
                                <h4>{usuario.nombre || 'Usuario'}</h4>
                                <p>{usuario.email}</p>
                            </div>
                            <button
                                className="btn-solicitud"
                                onClick={() => enviarSolicitud(usuario.id)}
                            >
                                Añadir amigo
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ListaUsuarios;
