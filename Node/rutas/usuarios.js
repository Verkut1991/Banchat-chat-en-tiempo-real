const express = require('express');
const enrutador = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { verificarToken, CLAVE_SECRETA } = require('../middleware/auth');
const { obtenerDB } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de Multer
const almacenamiento = multer.diskStorage({
    destination: (req, file, cb) => {
        const directorio = 'uploads/perfiles/';
        if (!fs.existsSync(directorio)) {
            fs.mkdirSync(directorio, { recursive: true });
        }
        cb(null, directorio);
    },
    filename: (req, file, cb) => {
        const sufijoUnico = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + sufijoUnico + path.extname(file.originalname));
    }
});

const subirRecurso = multer({ storage: almacenamiento });

// POST /usuarios/registro - Registrar nuevo usuario
// Tramita el alta de nuevos integrantes en el sistema cifrando su clave de acceso
// y sentando las bases de su nueva identidad digital en la plataforma.
enrutador.post('/registro', async (req, res) => {
    const { nombre, email, contrasena } = req.body;

    if (!nombre || !email || !contrasena) {
        return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    }

    try {
        const db = obtenerDB();
        const coleccion = db.collection('usuarios_tlg');

        // Verificar si el email ya existe
        const existente = await coleccion.findOne({ email });
        if (existente) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Hash de la contraseña
        const sal = await bcrypt.genSalt(10);
        const contrasenaHash = await bcrypt.hash(contrasena, sal);

        const nuevoUsuario = {
            name: nombre,
            email,
            password: contrasenaHash,
            bio: '',
            photo: '',
            createdAt: new Date().toISOString()
        };

        const resultado = await coleccion.insertOne(nuevoUsuario);

        // No devolver la contraseña en la respuesta
        const usuarioSinPass = {
            id: resultado.insertedId.toString(),
            nombre: nuevoUsuario.name || 'Usuario',
            email: nuevoUsuario.email,
            biografia: nuevoUsuario.bio,
            foto: nuevoUsuario.photo,
            fechaRegistro: nuevoUsuario.createdAt
        };

        res.status(201).json(usuarioSinPass);
    } catch (err) {
        console.error('Error en registro:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Valida las credenciales presentadas por el usuario y le entrega una llave maestra 
// en forma de token para que pueda navegar por las zonas protegidas del chat.
enrutador.post('/login', async (req, res) => {
    const { email, contrasena } = req.body;

    if (!email || !contrasena) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    try {
        const db = obtenerDB();
        const usuario = await db.collection('usuarios_tlg').findOne({ email });

        if (!usuario) {
            return res.status(400).json({ error: 'Email o contraseña incorrectos' });
        }

        const hashContrasena = usuario.password || usuario.contrasena;
        if (!hashContrasena) {
            return res.status(500).json({ error: 'Error en la configuración de la cuenta (falta contraseña)' });
        }

        const contrasenaValida = await bcrypt.compare(contrasena, hashContrasena);
        if (!contrasenaValida) {
            return res.status(400).json({ error: 'Email o contraseña incorrectos' });
        }

        // Generar token JWT
        const token = jwt.sign(
            { id: usuario._id.toString(), email: usuario.email },
            CLAVE_SECRETA,
            { expiresIn: '24h' }
        );

        const usuarioSinPass = {
            id: usuario._id.toString(),
            nombre: usuario.name || usuario.nombre || 'Usuario',
            email: usuario.email,
            biografia: usuario.bio || usuario.biografia || '',
            foto: usuario.photo || usuario.foto || '',
            fechaRegistro: usuario.createdAt || usuario.fechaRegistro
        };

        res.json({ token, usuario: usuarioSinPass });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Recupera del almacen de datos toda la informacion personal del usuario que realiza
// la consulta basandose exclusivamente en su identidad verificada por el token.
enrutador.get('/perfil', verificarToken, async (req, res) => {
    try {
        const db = obtenerDB();
        const usuario = await db.collection('usuarios_tlg').findOne({ _id: new ObjectId(req.usuario.id) });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const respuesta = {
            id: usuario._id.toString(),
            nombre: usuario.name || usuario.nombre || 'Usuario',
            email: usuario.email,
            biografia: usuario.bio || usuario.biografia || '',
            foto: usuario.photo || usuario.foto || '',
            fechaRegistro: usuario.createdAt || usuario.fechaRegistro
        };
        res.json(respuesta);
    } catch (err) {
        console.error('Error cargando perfil:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Recibe y guarda los cambios que el usuario desea aplicar sobre su imagen publica
// procesando tanto el texto de su biografia como el archivo de su nueva fotografia.
enrutador.put('/perfil', verificarToken, subirRecurso.single('foto'), async (req, res) => {
    try {
        console.log('--- DEPURACION SUBIDA ---');
        console.log('req.file:', req.file);
        console.log('req.body:', req.body);
        const db = obtenerDB();
        const { nombre, biografia } = req.body;

        const actualizacion = {};
        if (nombre !== undefined) actualizacion.name = nombre;
        if (biografia !== undefined) actualizacion.bio = biografia;

        // Si se subió un archivo, guardar la ruta
        if (req.file) {
            const rutaRelativa = '/' + req.file.path.replace(/\\/g, '/');
            actualizacion.photo = rutaRelativa;
            console.log('Actualizando foto a:', rutaRelativa);
        }

        if (Object.keys(actualizacion).length === 0) {
            return res.status(400).json({ error: 'No se enviaron datos para actualizar' });
        }

        await db.collection('usuarios_tlg').updateOne(
            { _id: new ObjectId(req.usuario.id) },
            { $set: actualizacion }
        );

        const usuario = await db.collection('usuarios_tlg').findOne({ _id: new ObjectId(req.usuario.id) });
        const respuesta = {
            id: usuario._id.toString(),
            nombre: usuario.name || usuario.nombre || 'Usuario',
            email: usuario.email,
            biografia: usuario.bio || usuario.biografia || '',
            foto: usuario.photo || usuario.foto || '',
            fechaRegistro: usuario.createdAt || usuario.fechaRegistro
        };
        res.json(respuesta);
    } catch (err) {
        console.error('Error actualizando perfil:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Genera una lista completa con todos los perfiles registrados en el sistema para que
// sirva de base en las funciones de busqueda y descubrimiento de la aplicacion.
enrutador.get('/', verificarToken, async (req, res) => {
    try {
        const db = obtenerDB();
        const usuarios = await db.collection('usuarios_tlg')
            .find({}, { projection: { password: 0, contrasena: 0 } })
            .toArray();

        const lista = usuarios.map(u => ({
            id: u._id.toString(),
            nombre: u.name || u.nombre || 'Usuario',
            email: u.email,
            biografia: u.bio || u.biografia || '',
            foto: u.photo || u.foto || '',
            fechaRegistro: u.createdAt || u.fechaRegistro
        }));
        res.json(lista);
    } catch (err) {
        console.error('Error listando usuarios:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Filtra el catalogo de usuarios ignorando mayusculas y minusculas para encontrar
// coincidencias parciales con el nombre que el usuario esta intentando localizar.
enrutador.get('/buscar', verificarToken, async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(400).json({ error: 'Parámetro de búsqueda "q" requerido' });
    }

    try {
        const db = obtenerDB();
        const usuarios = await db.collection('usuarios_tlg')
            .find(
                {
                    $or: [
                        { name: { $regex: q, $options: 'i' } },
                        { nombre: { $regex: q, $options: 'i' } }
                    ]
                },
                { projection: { password: 0, contrasena: 0 } }
            )
            .toArray();

        const lista = usuarios.map(u => ({
            id: u._id.toString(),
            nombre: u.name || u.nombre || 'Usuario',
            email: u.email,
            biografia: u.bio || u.biografia || '',
            foto: u.photo || u.foto || '',
            fechaRegistro: u.createdAt || u.fechaRegistro
        }));
        res.json(lista);
    } catch (err) {
        console.error('Error buscando usuarios:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = enrutador;
