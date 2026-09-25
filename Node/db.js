const { MongoClient } = require('mongodb');

// Lee la URI de Mongo desde el entorno para no publicar credenciales
const MONGO_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB || 'banchat_portfolio';

let db = null;

// Conectar a MongoDB y devolver la instancia de la base de datos
const conectarDB = async () => {
    try {
        const client = await MongoClient.connect(MONGO_URL);
        db = client.db(DB_NAME);
        console.log('Conectado a MongoDB - Base de datos:', DB_NAME);

        await db.collection('usuarios_tlg').createIndex({ email: 1 }, { unique: true });
        await db.collection('amistades_tlg').createIndex({ user1Id: 1, user2Id: 1 });
        await db.collection('solicitudes_tlg').createIndex({ fromUserId: 1, toUserId: 1 });
        await db.collection('mensajes_tlg').createIndex({ room: 1 });

        return db;
    } catch (err) {
        console.error('Error conectando a MongoDB:', err);
        process.exit(1);
    }
};

// Accede a la instancia activa de la base de datos sin reabrir la conexion
const obtenerDB = () => {
    if (!db) {
        throw new Error('Base de datos no inicializada. Llama a conectarDB() primero.');
    }
    return db;
};

module.exports = { conectarDB, obtenerDB };
