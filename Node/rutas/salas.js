const express = require('express');
const enrutador = express.Router();
const { obtenerDB } = require('../db');

// GET /salas - Listar todas las salas
enrutador.get('/', async (req, res) => {
    try {
        const db = obtenerDB();
        const salas = await db.collection('salas_tlg').find().toArray();
        const lista = salas.map(({ _id, ...resto }) => ({ id: _id.toString(), ...resto }));
        res.json(lista);
    } catch (err) {
        console.error('Error listando salas:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /salas - Crear una nueva sala
enrutador.post('/', async (req, res) => {
    const { nombre } = req.body;
    if (!nombre) {
        return res.status(400).json({ error: 'El nombre de la sala es obligatorio' });
    }

    try {
        const db = obtenerDB();

        const nuevaSala = { nombre };
        const resultado = await db.collection('salas_tlg').insertOne(nuevaSala);
        nuevaSala.id = resultado.insertedId.toString();

        res.status(201).json(nuevaSala);
    } catch (err) {
        console.error('Error creando sala:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = enrutador;
