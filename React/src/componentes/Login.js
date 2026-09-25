import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

// Representa el portal de acceso donde el usuario debe demostrar su identidad
// mediante sus credenciales para obtener permiso de entrada al sistema.
function Login() {
    const { iniciarSesion } = useAuth();
    const [email, setEmail] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const navegar = useNavigate();

    // Procesa el intento de acceso validando que los datos existan antes de
    // consultar al servidor y autorizar la entrada del usuario a su cuenta.
    const manejarEnvio = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !contrasena.trim()) {
            setError('Por favor, rellena todos los campos');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/usuarios/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, contrasena })
            });

            const datos = await res.json();

            if (!res.ok) {
                setError(datos.error);
                return;
            }

            iniciarSesion(datos.usuario, datos.token);
            navegar('/');
        } catch (err) {
            setError(err.message || 'Error al conectar con el servidor');
        }
    };

    return (
        <div className="auth-container">
            <h2>Iniciar Sesión</h2>
            <form onSubmit={manejarEnvio}>
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
                <button type="submit">Entrar</button>
            </form>
            <p className="auth-link">
                ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
            </p>
        </div>
    );
}

export default Login;
