import io from 'socket.io-client';
import { API_URL } from './config';

// Establece un puente de comunicacion bidireccional que se mantiene a la espera
// de una orden explicita para conectar con el servidor de la aplicacion.
const socket = io(API_URL, {
    autoConnect: false
});

export default socket;
