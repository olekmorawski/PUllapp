import { useEffect, useRef, useState } from 'react';

export const useSocket = (): WebSocket | null => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket('ws://<YOUR-IP>:3000/ws'); // change <YOUR-IP>
        socketRef.current = ws;
        setSocket(ws);

        ws.onopen = () => console.log('✅ Connected to WebSocket');
        ws.onclose = () => console.warn('⚠️ WebSocket Disconnected');
        ws.onerror = (err) => console.error('❌ WebSocket Error:', err);

        ws.onmessage = (event) => {
            console.log('📨 Message from server:', event.data);
            // Optional: you can use this to update state in your app
        };

        return () => {
            ws.close();
        };
    }, []);

    return socket;
};
