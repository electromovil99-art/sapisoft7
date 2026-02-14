import { io, Socket } from 'socket.io-client';

// *** URL DEL SERVIDOR REMOTO ***
export const BACKEND_URL = 'https://api.sapi-soft.com';

// Mock Socket to ensure app stability in offline/dev modes
const createMockSocket = () => {
    console.log("[SocketService] Initializing in Safe Mode (Mock).");
    return {
        on: (event: string, cb: any) => {},
        off: (event: string, cb: any) => {},
        emit: (event: string, data?: any) => {
            console.log(`[MockSocket] Event suppressed: ${event}`, data);
        },
        connect: () => {
            console.log('[MockSocket] Connect called (Simulated)');
        },
        disconnect: () => {
            console.log('[MockSocket] Disconnect called (Simulated)');
        },
        connected: false,
        id: 'mock-socket-' + Date.now(),
    } as unknown as Socket;
};

let socketInstance: Socket | null = null;

try {
    // Attempt to initialize the real socket but do not connect automatically
    socketInstance = io(BACKEND_URL, { 
        transports: ['websocket', 'polling'],
        withCredentials: true,
        forceNew: true,
        reconnectionAttempts: 3,
        timeout: 5000, 
        autoConnect: false,
        extraHeaders: { "ngrok-skip-browser-warning": "true" } 
    });
} catch (error) {
    console.warn("Socket initialization warning (using mock):", error);
    socketInstance = createMockSocket();
}

// Ensure we always export a valid object
export const socket = socketInstance || createMockSocket();

export const checkConnection = () => {
    if (!socket) return;
    
    if (socket.id?.startsWith('mock-')) {
        alert("Modo Seguro: La conexión al servidor está desactivada en este entorno.");
        return;
    }

    if (socket.connected) {
        alert(`✅ Conectado a ${BACKEND_URL}`);
    } else {
        alert(`⚠️ Desconectado. Intentando reconectar...`);
        try {
            socket.connect();
        } catch (e) {
            console.error("Manual reconnection failed", e);
        }
    }
};