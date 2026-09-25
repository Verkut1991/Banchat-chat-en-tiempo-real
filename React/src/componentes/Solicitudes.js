import React, { useState, useEffect } from 'react';

import { API_URL } from '../config';

// Esta pantalla permite al usuario revisar y gestionar las peticiones de contacto 
// entrantes, decidiendo quien puede formar parte de su agenda personal.
function Solicitudes() {
    const [solicitudes, setSolicitudes] = useState([]);
    const [todosUsuarios, setTodosUsuarios] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const token = localStorage.getItem('token');

    useEffect(() => {
        cargarDatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sincroniza la carga de la informacion de los perfiles y las peticiones 
    // pendientes para mostrar una lista detallada con nombres y fotos.
    const cargarDatos = async () => {
        await Promise.all([cargarSolicitudes(), cargarUsuarios()]);
    };

    // Trae del servidor los datos de todos los usuarios registrados para poder
    // ponerle cara y nombre a los identificadores que envian solicitudes.
    const cargarUsuarios = async () => {
        try {
            const res = await fetch(`${API_URL}/usuarios`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const datos = await res.json();
            setTodosUsuarios(datos);
        } catch (err) {
            console.error('Error cargando usuarios:', err);
        }
    };

    // Recupera la lista de peticiones de amistad que estan esperando una respuesta
    // por parte del usuario para ser procesadas.
    const cargarSolicitudes = async () => {
        try {
            const res = await fetch(`${API_URL}/amistades/solicitudes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const datos = await res.json();
            setSolicitudes(datos);
        } catch (err) {
            console.error('Error cargando solicitudes:', err);
        }
    };

    // Registra la decision del usuario sobre una peticion especifica comunicando
    // al servidor si se acepta el nuevo vinculo o si se prefiere declinarlo.
    const responderSolicitud = async (id, accion) => {
        try {
            const res = await fetch(`${API_URL}/amistades/solicitud/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ accion })
            });

            const datos = await res.json();
            setMensaje(datos.mensaje);
            cargarSolicitudes();
            setTimeout(() => setMensaje(''), 2000);
        } catch (err) {
            setMensaje('Error al responder solicitud');
        }
    };

    // Busca dentro del catalogo local de usuarios la ficha completa de una persona
    // utilizando su codigo de identificacion unico.
    const obtenerUsuario = (id) => todosUsuarios.find(u => u.id === id);

    // Crea la direccion completa de acceso a la imagen de perfil para que pueda 
    // ser dibujada correctamente por el motor de renderizado del navegador.
    const obtenerUrlAvatar = (img) => {
        if (!img) return null;
        return img.startsWith('http') ? img : `${API_URL}${img}`;
    };

    return (
        <div className="lista-container">
            <h2>Solicitudes de Amistad</h2>

            {mensaje && <p className="info-msg">{mensaje}</p>}

            {solicitudes.length === 0 ? (
                <p className="empty-msg">No tienes solicitudes pendientes.</p>
            ) : (
                <div className="seccion">
                    <h3>Pendientes ({solicitudes.length})</h3>
                    {solicitudes.map(sol => {
                        const usuario = obtenerUsuario(sol.deUsuarioId);
                        return (
                            <div key={sol.id} className="usuario-card solicitud-card">
                                <div className="usuario-avatar">
                                    {usuario && usuario.foto ? (
                                        <img src={obtenerUrlAvatar(usuario.foto)} alt={usuario.nombre} />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {(usuario?.nombre || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="usuario-info">
                                    <h4>{usuario ? usuario.nombre : 'Usuario desconocido'}</h4>
                                    <p className="solicitud-fecha">
                                        {new Date(sol.fecha).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="solicitud-acciones">
                                    <button
                                        className="btn-aceptar"
                                        onClick={() => responderSolicitud(sol.id, 'aceptar')}
                                    >
                                        ✓ Aceptar
                                    </button>
                                    <button
                                        className="btn-rechazar"
                                        onClick={() => responderSolicitud(sol.id, 'rechazar')}
                                    >
                                        ✗ Rechazar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default Solicitudes;
