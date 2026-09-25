const express = require('express');
const enrutador = express.Router();
const { obtenerDB } = require('../db');

// GET /mensajes/:idSala - Obtener mensajes de una sala
// Recupera cronologicamente todos los mensajes intercambiados dentro de una sala
// permitiendo reconstruir el flujo de la conversacion para los participantes.
enrutador.get('/:idSala', async (req, res) => {
    try {
        const db = obtenerDB();
        const { idSala } = req.params;

        const mensajes = await db.collection('mensajes_tlg')
            .find({ room: idSala })
            .sort({ timestamp: 1 }) // Ordenar por fecha de inserción
            .toArray();

        const lista = mensajes.map(({ _id, ...resto }) => ({
            id: _id.toString(),
            idSala: resto.room,
            idAutor: resto.authorId,
            nombreAutor: resto.authorName,
            texto: resto.text,
            hora: resto.time,
            marcaDeTiempo: resto.timestamp
        }));
        res.json(lista);
    } catch (err) {
        console.error('Error obteniendo mensajes:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Registra un nuevo mensaje en la base de datos y lo propaga inmediatamente 
// a todos los usuarios conectados en esa sala mediante el sistema de sockets.
enrutador.post('/', async (req, res) => {
    const { idSala, idAutor, nombreAutor, texto, hora } = req.body;

    if (!idSala || !idAutor || !texto) {
        return res.status(400).json({ error: 'idSala, idAutor y texto son obligatorios' });
    }

    try {
        const db = obtenerDB();

        const nuevoMensaje = {
            room: idSala,
            authorId: idAutor,
            authorName: nombreAutor || 'Anónimo',
            text: texto,
            time: hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date().toISOString()
        };

        const resultado = await db.collection('mensajes_tlg').insertOne(nuevoMensaje);

        const respuesta = {
            id: resultado.insertedId.toString(),
            idSala: nuevoMensaje.room,
            idAutor: nuevoMensaje.authorId,
            nombreAutor: nuevoMensaje.authorName,
            texto: nuevoMensaje.text,
            hora: nuevoMensaje.time,
            marcaDeTiempo: nuevoMensaje.timestamp
        };

        // Emitir a la sala
        if (req.io) {
            req.io.to(idSala).emit('mensaje_chat', respuesta);
            console.log(`Mensaje emitido a sala ${idSala}:`, respuesta);
        }

        res.status(201).json(respuesta);
    } catch (err) {
        console.error('Error enviando mensaje:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = enrutador;
