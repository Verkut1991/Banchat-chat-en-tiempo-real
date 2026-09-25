import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';

// Ofrece un formulario para que los nuevos visitantes puedan dar de alta su perfil
// y formar parte de la comunidad de usuarios del chat.
function Registro() {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const navegar = useNavigate();

    // Recoge la informacion del nuevo usuario y la envia al servidor asegurando
    // que los datos cumplan con las reglas minimas de seguridad y formato.
    const manejarEnvio = async (e) => {
        e.preventDefault();
        setError('');
        setExito('');

        if (!nombre.trim() || !email.trim() || !contrasena.trim()) {
            setError('Todos los campos son obligatorios');
            return;
        }

        if (contrasena.length < 4) {
            setError('La contraseña debe tener al menos 4 caracteres');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/usuarios/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email, contrasena })
            });

            const datos = await res.json();

            if (!res.ok) {
                setError(datos.error);
                return;
            }

            setExito('¡Registro exitoso! Redirigiendo al login...');
            setTimeout(() => navegar('/login'), 1500);
        } catch (err) {
            setError('Error de conexión con el servidor');
        }
    };

    return (
        <div className="auth-container">
            <h2>Crear Cuenta</h2>
            <form onSubmit={manejarEnvio}>
                <input
                    type="text"
                    name="nombre"
                    id="nombre"
                    placeholder="Nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                />
                <input
                    type="email"
                    name="email"
                    id="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    name="password"
                    id="password"
                    placeholder="Contraseña"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    required
                />
                {error && <p className="error-msg">{error}</p>}
                {exito && <p className="success-msg">{exito}</p>}
                <button type="submit">Registrarse</button>
            </form>
            <p className="auth-link">
                ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            </p>
        </div>
    );
}

export default Registro;
