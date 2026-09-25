const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { conectarDB } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const usuariosEnrutador = require('./rutas/usuarios');
const salasEnrutador = require('./rutas/salas');
const mensajesEnrutador = require('./rutas/mensajes');
const amistadesEnrutador = require('./rutas/amistades');

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

// Middleware para inyectar io en las peticiones
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use('/usuarios', usuariosEnrutador);
app.use('/salas', salasEnrutador);
app.use('/mensajes', mensajesEnrutador);
app.use('/amistades', amistadesEnrutador);

// Servir archivos estáticos (imágenes de perfil)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const usuariosConectados = new Map(); // Mapa: idUsuario -> idSocket

io.on('connection', (socket) => {
    console.log(`Nuevo socket conectado: ${socket.id}`);

    // Vincula la identidad de un usuario con su conexion de red abierta para poder
    // enviarle alertas y mensajes personalizados de forma directa.
    socket.on('registrar_usuario', (idUsuario) => {
        if (idUsuario) {
            usuariosConectados.set(idUsuario, socket.id);
            socket.idUsuario = idUsuario; // Guardar idUsuario en el socket para desconexión
            // Notificar a todos los clientes que un usuario se ha conectado
            io.emit('estado_usuario', { idUsuario, estado: 'online' });
            console.log(`Usuario registrado: ${idUsuario} -> ${socket.id}`);
        }
    });

    // Inscribe el hilo de conexion en un canal especifico permitiendo que el usuario
    // reciba los mensajes que se envian dentro de una sala concreta.
    socket.on('unirse_sala', (idSala) => {
        socket.join(idSala);
        console.log(`Socket ${socket.id} se unió a la sala: ${idSala}`);
    });

    // Avisa a los demas integrantes de una sala que alguien esta redactando un 
    // pensamiento para crear una sensacion de conversacion fluida y activa.
    socket.on('escribiendo', (datos) => {
        // Emitir a todos en la sala excepto al remitente
        socket.to(datos.idSala).emit('escribiendo', { idUsuario: socket.idUsuario, estaEscribiendo: true });
    });

    // Notifica que el usuario ha dejado de pulsar teclas para limpiar el aviso
    // de escritura en las pantallas del resto de participantes.
    socket.on('dejar_de_escribir', (datos) => {
        socket.to(datos.idSala).emit('dejar_de_escribir', { idUsuario: socket.idUsuario, estaEscribiendo: false });
    });

    // Verifica si una identidad especifica tiene una conexion activa con el servidor
    // para informar sobre su disponibilidad en tiempo real.
    socket.on('comprobar_en_linea', (idUsuario) => {
        const estaEnLinea = usuariosConectados.has(idUsuario);
        socket.emit('estado_usuario', { idUsuario, estado: estaEnLinea ? 'online' : 'offline' });
    });

    // Limpia los registros de conexion cuando el enlace de red se rompe y avisa
    // al resto de usuarios que esta persona ya no se encuentra en linea.
    socket.on('disconnect', () => {
        if (socket.idUsuario) {
            usuariosConectados.delete(socket.idUsuario);
            io.emit('estado_usuario', { idUsuario: socket.idUsuario, estado: 'offline' });
            console.log(`Usuario ${socket.idUsuario} desconectado.`);
        } else {
            console.log('Socket desconectado:', socket.id);
        }
    });
});

const PUERTO = process.env.PORT ? Number(process.env.PORT) : 3001;

// Conectar a MongoDB y luego iniciar el servidor
conectarDB().then(() => {
    server.listen(PUERTO, () => {
        console.log(`SERVIDOR EJECUTÁNDOSE EN PUERTO ${PUERTO}`);
    });
}).catch((err) => {
    console.error('No se pudo iniciar el servidor:', err);
    process.exit(1);
});
