const express = require('express');
const enrutador = express.Router();
const { ObjectId } = require('mongodb');
const { verificarToken } = require('../middleware/auth');
const { obtenerDB } = require('../db');

// POST /amistades/solicitud - Enviar solicitud de amistad
// Registra una voluntad de contacto entre dos usuarios comprobando previamente 
// que no exista ya un vinculo o una peticion pendiente entre ambos.
enrutador.post('/solicitud', verificarToken, async (req, res) => {
    const { paraUsuarioId } = req.body;
    const deUsuarioId = req.usuario.id;

    if (!paraUsuarioId) {
        return res.status(400).json({ error: 'ID del usuario destino requerido' });
    }

    if (deUsuarioId === paraUsuarioId) {
        return res.status(400).json({ error: 'No puedes enviarte una solicitud a ti mismo' });
    }

    try {
        const db = obtenerDB();
        const colSolicitudes = db.collection('solicitudes_tlg');
        const colAmistades = db.collection('amistades_tlg');

        // Verificar si ya existe una solicitud pendiente entre estos usuarios
        const solicitudExistente = await colSolicitudes.findOne({
            status: 'pending',
            $or: [
                { fromUserId: deUsuarioId, toUserId: paraUsuarioId },
                { fromUserId: paraUsuarioId, toUserId: deUsuarioId }
            ]
        });

        if (solicitudExistente) {
            return res.status(400).json({ error: 'Ya existe una solicitud pendiente entre estos usuarios' });
        }

        // Verificar si ya son amigos
        const yaAmigos = await colAmistades.findOne({
            $or: [
                { user1Id: deUsuarioId, user2Id: paraUsuarioId },
                { user1Id: paraUsuarioId, user2Id: deUsuarioId }
            ]
        });

        if (yaAmigos) {
            return res.status(400).json({ error: 'Ya son amigos' });
        }

        const nuevaSolicitud = {
            fromUserId: deUsuarioId,
            toUserId: paraUsuarioId,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        const resultado = await colSolicitudes.insertOne(nuevaSolicitud);
        nuevaSolicitud.id = resultado.insertedId.toString();

        res.status(201).json({
            id: nuevaSolicitud.id,
            deUsuarioId: nuevaSolicitud.fromUserId,
            paraUsuarioId: nuevaSolicitud.toUserId,
            estado: 'pendiente', // Mapear para el frontend
            fecha: nuevaSolicitud.createdAt
        });
    } catch (err) {
        console.error('Error enviando solicitud:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Trae todas las invitaciones de contacto recibidas por el usuario que aun no han 
// sido contestadas para que pueda decidir si aceptarlas o rechazarlas.
enrutador.get('/solicitudes', verificarToken, async (req, res) => {
    try {
        const db = obtenerDB();
        const solicitudes = await db.collection('solicitudes_tlg')
            .find({ toUserId: req.usuario.id, status: 'pending' })
            .toArray();

        const lista = solicitudes.map(({ _id, ...resto }) => ({
            id: _id.toString(),
            deUsuarioId: resto.fromUserId,
            paraUsuarioId: resto.toUserId,
            estado: 'pendiente', // Mapear para frontend
            fecha: resto.createdAt
        }));
        res.json(lista);
    } catch (err) {
        console.error('Error cargando solicitudes:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Procesa la respuesta del usuario a una invitacion permitiendo forjar un nuevo
// vinculo de amistad o simplemente descartar la peticion de forma permanente.
enrutador.put('/solicitud/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const { accion } = req.body; // 'aceptar' o 'rechazar'

    if (!accion || !['aceptar', 'rechazar'].includes(accion)) {
        return res.status(400).json({ error: 'Acción debe ser "aceptar" o "rechazar"' });
    }

    try {
        const db = obtenerDB();
        const colSolicitudes = db.collection('solicitudes_tlg');

        const solicitud = await colSolicitudes.findOne({
            _id: new ObjectId(id),
            toUserId: req.usuario.id,
            status: 'pending'
        });

        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        if (accion === 'aceptar') {
            // Actualizar estado de la solicitud
            await colSolicitudes.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: 'accepted' } }
            );

            // Crear la amistad
            const nuevaAmistad = {
                user1Id: solicitud.fromUserId,
                user2Id: solicitud.toUserId,
                createdAt: new Date().toISOString()
            };

            const resultado = await db.collection('amistades_tlg').insertOne(nuevaAmistad);
            nuevaAmistad.id = resultado.insertedId.toString();

            // Emitir evento para actualizar lista de amigos en tiempo real
            req.io.emit('actualizar_amigos', {
                usuarios: [solicitud.fromUserId, solicitud.toUserId]
            });

            res.json({
                mensaje: 'Solicitud aceptada',
                amistad: {
                    id: nuevaAmistad.id,
                    usuario1Id: nuevaAmistad.user1Id,
                    usuario2Id: nuevaAmistad.user2Id,
                    fecha: nuevaAmistad.createdAt
                }
            });
        } else {
            await colSolicitudes.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: 'rejected' } }
            );
            res.json({ mensaje: 'Solicitud rechazada' });
        }
    } catch (err) {
        console.error('Error respondiendo solicitud:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Genera una lista con todas las personas con las que el usuario mantiene una
// relacion de confianza confirmada permitiendo filtrar los IDs de sus amigos.
enrutador.get('/', verificarToken, async (req, res) => {
    try {
        const db = obtenerDB();
        const misAmistades = await db.collection('amistades_tlg')
            .find({
                $or: [
                    { user1Id: req.usuario.id },
                    { user2Id: req.usuario.id }
                ]
            })
            .toArray();

        const amistades = misAmistades.map(({ _id, ...resto }) => ({
            id: _id.toString(),
            usuario1Id: resto.user1Id,
            usuario2Id: resto.user2Id,
            fecha: resto.createdAt
        }));

        // Devolver los IDs de los amigos
        const amigosIds = amistades.map(a =>
            a.usuario1Id === req.usuario.id ? a.usuario2Id : a.usuario1Id
        );

        res.json({ amistades, amigosIds });
    } catch (err) {
        console.error('Error listando amigos:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Elimina el vinculo de amistad entre dos personas notificando al sistema global
// para que la desconexion se refleje instantaneamente en las pantallas de ambos.
enrutador.delete('/:idAmigo', verificarToken, async (req, res) => {
    const { idAmigo } = req.params;
    const idUsuario = req.usuario.id;

    try {
        const db = obtenerDB();
        const resultado = await db.collection('amistades_tlg').deleteOne({
            $or: [
                { user1Id: idUsuario, user2Id: idAmigo },
                { user1Id: idAmigo, user2Id: idUsuario }
            ]
        });

        if (resultado.deletedCount === 0) {
            return res.status(404).json({ error: 'Amistad no encontrada' });
        }

        // Emitir evento para actualizar lista de amigos en tiempo real
        req.io.emit('actualizar_amigos', {
            usuarios: [idUsuario, idAmigo]
        });

        res.json({ mensaje: 'Amistad eliminada' });
    } catch (err) {
        console.error('Error eliminando amistad:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = enrutador;
