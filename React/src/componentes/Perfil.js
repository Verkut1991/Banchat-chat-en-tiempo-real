import React, { useState, useEffect } from 'react';

import { API_URL } from '../config';

import { useAuth } from '../context/AuthContext';

// Esta vista permite al usuario gestionar su identidad publica dentro de la aplicacion
// centralizando la edicion de sus datos personales y su imagen de presentacion.
function Perfil() {
    const { actualizarUsuario } = useAuth();
    const [perfil, setPerfil] = useState(null);
    const [nombre, setNombre] = useState('');
    const [biografia, setBiografia] = useState('');
    const [foto, setFoto] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [editando, setEditando] = useState(false);

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        cargarPerfil();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Consulta al servidor para traer los datos mas recientes del usuario logueado
    // asegurando que la interfaz muestre siempre la informacion actualizada del perfil.
    const cargarPerfil = async () => {
        try {
            const res = await fetch(`${API_URL}/usuarios/perfil`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setPerfil(data);
            setNombre(data.nombre || '');
            setBiografia(data.biografia || '');
            setFoto(data.foto || '');
        } catch (err) {
            console.error('Error cargando perfil:', err);
        }
    };

    // Detecta la seleccion de una nueva imagen desde el dispositivo y genera una
    // vista previa local para que el usuario pueda ver el cambio antes de confirmar.
    const manejarCambioArchivo = (e) => {
        const archivo = e.target.files[0];
        if (archivo) {
            setSelectedFile(archivo);
            setPreviewUrl(URL.createObjectURL(archivo));
        }
    };

    // Empaqueta los cambios realizados en el perfil, incluyendo la posible nueva foto,
    // y los transmite al servidor para que el cambio sea permanente en la base de datos.
    const guardarPerfil = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('nombre', nombre);
            formData.append('biografia', biografia);
            if (selectedFile) {
                formData.append('foto', selectedFile);
            }

            const res = await fetch(`${API_URL}/usuarios/perfil`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const datos = await res.json();
            setPerfil(datos);
            actualizarUsuario(datos);
            setMensaje('Perfil actualizado correctamente');
            setEditando(false);
            setPreviewUrl('');
            setSelectedFile(null);
            setTimeout(() => setMensaje(''), 2000);
        } catch (err) {
            setMensaje('Error al actualizar el perfil');
        }
    };

    // Construye la direccion web necesaria para que el navegador localice y dibuje
    // correctamente la imagen de perfil almacenada en el servidor.
    const obtenerUrlAvatar = (usuarioFoto) => {
        if (!usuarioFoto) return null;
        if (usuarioFoto.startsWith('http')) return usuarioFoto;
        return `${API_URL}${usuarioFoto}`;
    };

    if (!perfil) return <div className="loading">Cargando perfil...</div>;

    const urlFotoActual = previewUrl || obtenerUrlAvatar(foto);

    return (
        <div className="perfil-container">
            <h2>Mi Perfil</h2>
            <div className="perfil-card">
                <div className="perfil-avatar">
                    {urlFotoActual ? (
                        <img src={urlFotoActual} alt="Avatar" />
                    ) : (
                        <div className="avatar-placeholder">
                            {(perfil?.nombre || perfil?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                {editando ? (
                    <form onSubmit={guardarPerfil} className="perfil-form">
                        <label>Nombre</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                        />
                        <label>Biografía</label>
                        <textarea
                            value={biografia}
                            onChange={(e) => setBiografia(e.target.value)}
                            placeholder="Escribe algo sobre ti..."
                        />
                        <label>Foto de perfil</label>
                        <input
                            type="file"
                            accept="image/png, image/jpeg"
                            onChange={manejarCambioArchivo}
                        />
                        <div className="perfil-buttons">
                            <button type="submit">Guardar</button>
                            <button type="button" className="btn-cancelar" onClick={() => {
                                setEditando(false);
                                setSelectedFile(null);
                                setPreviewUrl('');
                            }}>Cancelar</button>
                        </div>
                    </form>
                ) : (
                    <div className="perfil-info">
                        <h3>{perfil.nombre}</h3>
                        <p className="perfil-email">{perfil.email}</p>
                        <p className="perfil-bio">{perfil.biografia || 'Sin biografía'}</p>
                        <button onClick={() => setEditando(true)}>Editar Perfil</button>
                    </div>
                )}

                {mensaje && <p className="success-msg">{mensaje}</p>}
            </div>
        </div>
    );
}

export default Perfil;
