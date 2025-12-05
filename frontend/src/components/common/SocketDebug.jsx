// frontend/src/components/common/SocketDebug.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import socketService from '../../services/socket';

const SocketDebug = () => {
    const { user, socketConnected } = useAuth();
    const [socketInfo, setSocketInfo] = useState({
        id: null,
        connected: false,
        transport: null,
        reconnectAttempts: 0,
    });
    const [events, setEvents] = useState([]);

    useEffect(() => {
        // ✅ Отслеживаем все события Socket
        const logEvent = (eventName) => {
            setEvents(prev => [...prev.slice(-4), {
                name: eventName,
                time: new Date().toLocaleTimeString()
            }]);
        };

        socketService.on('connect', () => logEvent('connect'));
        socketService.on('disconnect', () => logEvent('disconnect'));
        socketService.on('connect_error', () => logEvent('connect_error'));
        socketService.on('reconnect', () => logEvent('reconnect'));

        const updateSocketInfo = () => {
            const socket = socketService.getSocket();
            const isConnected = socketService.isConnected();

            setSocketInfo({
                id: socket?.id || null,
                connected: isConnected,
                transport: socket?.io?.engine?.transport?.name || null,
                reconnectAttempts: socket?.io?.engine?._reconnectionAttempts || 0,
            });
        };

        const interval = setInterval(updateSocketInfo, 500); // ✅ Чаще обновляем
        updateSocketInfo();

        return () => {
            clearInterval(interval);
            socketService.off('connect');
            socketService.off('disconnect');
            socketService.off('connect_error');
            socketService.off('reconnect');
        };
    }, []);

    // ✅ Показываем только в development
    if (import.meta.env.PROD) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                zIndex: 10000,
                minWidth: '250px',
            }}
        >
            <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
                🔧 Socket Debug
            </div>
            <div>
                User: {user?.username || 'Not logged in'}
            </div>
            <div>
                Auth Connected: {' '}
                <span style={{ color: socketConnected ? '#28a745' : '#dc3545' }}>
                    {socketConnected ? '✓ Yes' : '✗ No'}
                </span>
            </div>
            <div>
                Socket Connected: {' '}
                <span style={{ color: socketInfo.connected ? '#28a745' : '#dc3545' }}>
                    {socketInfo.connected ? '✓ Yes' : '✗ No'}
                </span>
            </div>
            <div>
                Socket ID: {socketInfo.id || 'N/A'}
            </div>
            <div>
                Transport: {socketInfo.transport || 'N/A'}
            </div>
            <div>
                Reconnect Attempts: {socketInfo.reconnectAttempts}
            </div>
            <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.7 }}>
                Token: {localStorage.getItem('token') ? '✓ Present' : '✗ Missing'}
            </div>

            {/* ✅ НОВОЕ: История событий */}
            {events.length > 0 && (
                <div style={{
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '10px',
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
                        Recent Events:
                    </div>
                    {events.map((event, i) => (
                        <div key={i} style={{ opacity: 0.8 }}>
                            {event.time} - {event.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SocketDebug;