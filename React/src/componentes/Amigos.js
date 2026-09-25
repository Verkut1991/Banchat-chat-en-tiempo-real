import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import socket from '../socket';
import { useAuth } from '../context/AuthContext';

// Representa el panel lateral de contactos donde se listan todas las relaciones confirmadas
// listas para iniciar o continuar una conversacion instantanea.
function Amigos() {
    const { usuario: usuarioActual } = useAuth();
    const [amigos, setAmigos] = useState([]);
    const [todosUsuarios, setTodosUsuarios] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const token = localStorage.getItem('token');
    const navegar = useNavigate();

    // Calcula el identificador unico de la sala compartida y redirige a la vista de chat
    // llevando consigo la informacion basica del contacto para personalizar la cabecera.
    const manejarChat = (amigo) => {
        if (!amigo || !usuarioActual?.id) return;
        const idSala = [usuarioActual.id, amigo.id].sort().join('_');
        navegar('/chat', { state: { idSala, nombreSala: amigo.nombre, fotoSala: amigo.foto } });
    };

    useEffect(() => {
        cargarDatos();

        socket.connect();
        socket.on('connect', () => {
            if (usuarioActual?.id) {
                socket.emit('registrar_usuario', usuarioActual.id);
            }
        });

        if (socket.connected && usuarioActual?.id) {
            socket.emit('registrar_usuario', usuarioActual.id);
        }

        const manejarRefresco = (datos) => {
            // Si el usuario actual está implicado en la actualización, refrescar
            if (datos.usuarios.includes(usuarioActual.id)) {
                cargarAmigos();
            }
        };

        socket.on('actualizar_amigos', manejarRefresco);

        return () => {
            socket.off('actualizar_amigos', manejarRefresco);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Coordina la descarga simultanea de todos los usuarios registrados y de la lista
    // propia de amigos para tener toda el area de contactos poblada al momento.
    const cargarDatos = async () => {
        await Promise.all([cargarAmigos(), cargarUsuarios()]);
    };

    // Obtiene una fotografia instantanea de todas las personas registradas para poder
    // identificar a los amigos por su nombre real y no solo por un codigo numerico.
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

    // Solicita al servidor los identificadores de aquellas personas que han aceptado
    // una relacion de amistad con el usuario para poder mostrarlos en el panel.
    const cargarAmigos = async () => {
        try {
            const res = await fetch(`${API_URL}/amistades`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const datos = await res.json();
            setAmigos(datos.amigosIds || []);
        } catch (err) {
            console.error('Error cargando amigos:', err);
        }
    };

    // Rompe el vinculo de amistad con otro usuario tras una confirmacion manual
    // eliminando la posibilidad de chatear y limpiando la lista de contactos compartida.
    const eliminarAmigo = async (e, amigoId) => {
        e.stopPropagation(); // Evitar que se abra el chat
        if (!window.confirm('¿Estás seguro de que quieres eliminar a este amigo?')) return;

        try {
            const res = await fetch(`${API_URL}/amistades/${amigoId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                cargarAmigos();
            } else {
                const datos = await res.json();
                alert(datos.error || 'Error al eliminar amigo');
            }
        } catch (err) {
            console.error('Error eliminando amigo:', err);
        }
    };

    // Localiza los datos completos de un usuario dentro del almacen global basandose
    // exclusivamente en su identificador unico de sistema.
    const obtenerUsuario = (id) => todosUsuarios.find(u => u.id === id);

    // Filter friends
    const amigosFiltrados = amigos
        .map(id => obtenerUsuario(id))
        .filter(amigo => amigo && (amigo.nombre || '').toLowerCase().includes(busqueda.toLowerCase()));

    // Traduce los datos de la imagen guardada en una url completa que el navegador
    // pueda cargar y renderizar en el circulo del avatar.
    const obtenerUrlAvatar = (img) => {
        if (!img) return null;
        return img.startsWith('http') ? img : `${API_URL}${img}`;
    };

    return (
        <>
            <div className="sidebar-search">
                <div className="search-input-container">
                    <span role="img" aria-label="search">🔍</span>
                    <input
                        type="text"
                        name="search"
                        id="search"
                        placeholder="Buscar o empezar un nuevo chat"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            <div className="sidebar-list">
                {amigosFiltrados.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                        {amigos.length === 0 ? "Aún no tienes amigos." : "No se encontraron resultados."}
                    </div>
                ) : (
                    amigosFiltrados.map(amigo => (
                        <div key={amigo.id} className="chat-item" onClick={() => manejarChat(amigo)}>
                            <div className="chat-item-avatar">
                                {amigo.foto ? (
                                    <img src={obtenerUrlAvatar(amigo.foto)} alt={amigo.nombre} />
                                ) : (
                                    <div className="avatar-placeholder" style={{ borderRadius: '50%' }}>
                                        {(amigo.nombre || 'A').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="chat-item-info">
                                <div className="chat-item-header">
                                    <span className="chat-name">{amigo.nombre || 'Amigo'}</span>
                                    <button
                                        className="btn-eliminar-amigo"
                                        onClick={(e) => eliminarAmigo(e, amigo.id)}
                                        title="Eliminar amigo"
                                    >
                                        &times;
                                    </button>
                                </div>
                                <div className="chat-last-msg">Haz click para chatear</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}

export default Amigos;
