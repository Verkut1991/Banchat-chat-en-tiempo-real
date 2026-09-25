import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { API_URL } from '../config';
import socket from '../socket';

import { useAuth } from '../context/AuthContext';

// Esta es la sala principal donde ocurre toda la interaccion en vivo entre los usuarios
// gestionando tanto el historial de mensajes como la presencia en tiempo real.
function Chat() {
    const { usuario } = useAuth();
    const ubicacion = useLocation();
    const navegar = useNavigate();
    const [sala, setSala] = useState('');
    const [nombreSala, setNombreSala] = useState('');
    const [mensajeActual, setMensajeActual] = useState('');
    const [listaMensajes, setListaMensajes] = useState([]);

    const miId = usuario?.id;
    const miNombre = usuario?.nombre || 'Anónimo';

    const [estadoOtroUsuario, setEstadoOtroUsuario] = useState('offline');
    const [estaEscribiendo, setEstaEscribiendo] = useState(false);
    const refTiempoEscribiendo = useRef(null);

    const refFinalMensajes = useRef(null);

    // Mueve suavemente la vista hacia abajo para que el usuario siempre vea
    // los mensajes mas recientes sin tener que desplazarse manualmente.
    const desplazarAlFinal = () => {
        refFinalMensajes.current?.scrollIntoView({ behavior: "smooth" });
    };

    const [fotoSala, setFotoSala] = useState('');

    // Prepara el entorno del chat para entrar en una conversacion especifica cargando
    // los mensajes anteriores y notificando al sistema de la nueva conexion.
    const logicaUnirseSala = useCallback((idSala, nombre, foto) => {
        if (!idSala) return;
        setSala(idSala);
        setNombreSala(nombre || idSala);
        setFotoSala(foto || '');
        setListaMensajes([]);
        setEstaEscribiendo(false);

        socket.emit('unirse_sala', idSala);

        fetch(`${API_URL}/mensajes/${idSala}`)
            .then(res => res.json())
            .then(datos => {
                const formateados = datos.map(msg => ({
                    ...msg,
                    nombreAutor: msg.nombreAutor || msg.autor,
                    texto: msg.texto || msg.mensaje
                }));
                setListaMensajes(formateados);
            })
            .catch(err => console.error('Error cargando historial:', err));
    }, []);

    useEffect(() => {
        socket.connect();

        socket.on('connect', () => {
            console.log('Conectado al servidor de sockets:', socket.id);
        });

        const manejarRecepcionMensaje = (datos) => {
            if (datos.idSala === sala) {
                setListaMensajes((lista) => [...lista, datos]);
            }
        };

        const manejarEscribiendo = (datos) => {
            if (datos.idUsuario !== miId) {
                setEstaEscribiendo(true);
            }
        };

        const manejarDejaDeEscribir = (datos) => {
            if (datos.idUsuario !== miId) {
                setEstaEscribiendo(false);
            }
        };

        const manejarEstadoUsuario = (datos) => {
            if (sala) {
                const ids = sala.split('_');
                const otroId = ids.find(id => String(id) !== String(miId));
                if (String(datos.idUsuario) === String(otroId)) {
                    setEstadoOtroUsuario(datos.estado);
                }
            }
        };

        socket.on('mensaje_chat', manejarRecepcionMensaje);
        socket.on('escribiendo', manejarEscribiendo);
        socket.on('dejar_de_escribir', manejarDejaDeEscribir);
        socket.on('estado_usuario', manejarEstadoUsuario);

        return () => {
            socket.off('mensaje_chat', manejarRecepcionMensaje);
            socket.off('escribiendo', manejarEscribiendo);
            socket.off('dejar_de_escribir', manejarDejaDeEscribir);
            socket.off('estado_usuario', manejarEstadoUsuario);
        };
    }, [miId, sala]);

    useEffect(() => {
        if (sala && miId) {
            const ids = sala.split('_');
            const otroId = ids.find(id => String(id) !== String(miId));
            if (otroId) {
                // Pequeño retraso para asegurar que el server esté listo
                const timeout = setTimeout(() => {
                    socket.emit('comprobar_en_linea', otroId);
                }, 500);
                return () => clearTimeout(timeout);
            }
        }
    }, [sala, miId]);

    useEffect(() => {
        if (ubicacion.state && ubicacion.state.idSala) {
            const { idSala, nombreSala, fotoSala } = ubicacion.state;
            logicaUnirseSala(idSala, nombreSala, fotoSala);
        }
    }, [ubicacion.state, logicaUnirseSala]);

    useEffect(() => {
        desplazarAlFinal();
    }, [listaMensajes, estaEscribiendo]);

    // Vigilante de la escritura que captura cada pulsacion de tecla para avisar
    // a los demas que el usuario esta redactando un pensamiento.
    const manejarEntrada = (e) => {
        setMensajeActual(e.target.value);

        if (sala) {
            socket.emit('escribiendo', { idSala: sala });
            if (refTiempoEscribiendo.current) clearTimeout(refTiempoEscribiendo.current);
            refTiempoEscribiendo.current = setTimeout(() => {
                socket.emit('dejar_de_escribir', { idSala: sala });
            }, 2000);
        }
    };

    // Empaqueta el texto escrito y lo lanza al servidor para que se guarde 
    // permanentemente y se distribuya al resto de participantes en la sala.
    const enviarMensaje = async () => {
        if (mensajeActual !== '') {
            const datosMensaje = {
                idSala: sala,
                idAutor: miId,
                nombreAutor: miNombre,
                texto: mensajeActual,
                hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            if (refTiempoEscribiendo.current) clearTimeout(refTiempoEscribiendo.current);
            socket.emit('dejar_de_escribir', { idSala: sala });

            try {
                await fetch(`${API_URL}/mensajes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosMensaje)
                });
                setMensajeActual('');
            } catch (err) {
                console.error('Error enviando mensaje:', err);
            }
        }
    };

    // Transforma el nombre de un archivo de imagen en una ruta completa que el
    // navegador pueda entender para mostrar el rostro del usuario.
    const obtenerUrlAvatar = (img) => {
        if (!img) return null;
        return img.startsWith('http') ? img : `${API_URL}${img}`;
    };

    if (!sala) {
        return (
            <div className="empty-chat-placeholder">
                <p>Selecciona un chat para comenzar a escribir.</p>
            </div>
        );
    }

    return (
        <div className="chat-view-container">
            <div className="chat-header">
                <button className="back-button" onClick={() => navegar('/')}>
                    ←
                </button>
                <div className="header-info">
                    {fotoSala ? (
                        <div style={{ width: 40, height: 40, borderRadius: '50%', marginRight: 15, overflow: 'hidden' }}>
                            <img src={obtenerUrlAvatar(fotoSala)} alt={nombreSala} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    ) : (
                        <div style={{ width: 40, height: 40, background: '#dfe5e7', borderRadius: '50%', marginRight: 15, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {(nombreSala || '?').charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="header-text">
                        <div className="header-title">{nombreSala}</div>
                        <div className="header-subtitle" style={{ fontSize: '12px', color: '#667781' }}>
                            {estaEscribiendo ? 'Escribiendo...' : (estadoOtroUsuario === 'online' ? 'En línea' : '')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="chat-body chat-messages">
                <div className="message-container">
                    {listaMensajes.map((msg, indice) => {
                        const esMiMensaje = String(msg.idAutor) === String(miId);
                        return (
                            <div
                                className={`message-bubble ${esMiMensaje ? 'sent' : 'received'}`}
                                key={indice}
                            >
                                <span className="msg-text">{msg.texto}</span>
                                <span className="msg-time">{msg.hora}</span>
                            </div>
                        );
                    })}
                    <div ref={refFinalMensajes} />
                </div>
            </div>

            <div className="chat-input-area">
                <div className="chat-input-wrapper">
                    <input
                        type="text"
                        name="messageInput"
                        id="messageInput"
                        value={mensajeActual}
                        placeholder="Escribe un mensaje"
                        onChange={manejarEntrada}
                        onKeyDown={(evento) => {
                            evento.key === 'Enter' && enviarMensaje();
                        }}
                    />
                </div>
                <button className="send-btn" onClick={enviarMensaje}>
                    ➤
                </button>
            </div>
        </div>
    );
}

export default Chat;
