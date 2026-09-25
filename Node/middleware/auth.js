const jwt = require('jsonwebtoken');

const CLAVE_SECRETA = process.env.JWT_SECRET || 'change-me-portfolio-only';

// Actua como un centinela que intercepta cada peticion al servidor para validar
// la autenticidad del token y permitir el paso solo a usuarios identificados.
const verificarToken = (req, res, next) => {
    const cabeceraAutorizacion = req.headers['authorization'];

    if (!cabeceraAutorizacion) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    // Formato esperado: "Bearer <token>"
    const token = cabeceraAutorizacion.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Formato de token inválido' });
    }

    try {
        const decodificado = jwt.verify(token, CLAVE_SECRETA);
        req.usuario = decodificado; // Contiene { id, email }
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }
};

module.exports = { verificarToken, CLAVE_SECRETA };
