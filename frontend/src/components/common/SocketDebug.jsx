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
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const logEvent = (eventName, data = null) => {
            setEvents(prev => [...prev.slice(-9), {
                name: eventName,
                time: new Date().toLocaleTimeString(),
                data: data ? JSON.stringify(data).substring(0, 50) : null
            }]);
        };

        socketService.on('connect', () => logEvent('connect'));
        socketService.on('disconnect', (reason) => logEvent('disconnect', { reason }));
        socketService.on('connect_error', (err) => logEvent('connect_error', { message: err.message }));
        socketService.on('reconnect', (attempt) => logEvent('reconnect', { attempt }));
        socketService.on('message:new', () => logEvent('message:new'));
        socketService.on('messages:history', (data) => logEvent('messages:history', { count: data?.length }));
        socketService.on('users:online', (data) => logEvent('users:online', { count: data?.length }));

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

        const interval = setInterval(updateSocketInfo, 500);
        updateSocketInfo();

        return () => {
            clearInterval(interval);
            socketService.off('connect');
            socketService.off('disconnect');
            socketService.off('connect_error');
            socketService.off('reconnect');
            socketService.off('message:new');
            socketService.off('messages:history');
            socketService.off('users:online');
        };
    }, []);

    if (import.meta.env.PROD) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.9)',
                color: 'white',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
                zIndex: 10000,
                minWidth: '280px',
                maxHeight: isExpanded ? '600px' : '200px',
                overflow: 'hidden',
                transition: 'max-height 0.3s ease',
            }}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
                paddingBottom: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.2)'
            }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                    🔧 Socket Debug
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                    }}
                >
                    {isExpanded ? '▼' : '▲'}
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>
                    <strong>User:</strong> {user?.username || 'Not logged in'}
                </div>
                <div>
                    <strong>Auth Connected:</strong>{' '}
                    <span style={{
                        color: socketConnected ? '#28a745' : '#dc3545',
                        fontWeight: 'bold'
                    }}>
                        {socketConnected ? '✓ Yes' : '✗ No'}
                    </span>
                </div>
                <div>
                    <strong>Socket Connected:</strong>{' '}
                    <span style={{
                        color: socketInfo.connected ? '#28a745' : '#dc3545',
                        fontWeight: 'bold'
                    }}>
                        {socketInfo.connected ? '✓ Yes' : '✗ No'}
                    </span>
                </div>
                <div>
                    <strong>Socket ID:</strong> {socketInfo.id || 'N/A'}
                </div>
                <div>
                    <strong>Transport:</strong> {socketInfo.transport || 'N/A'}
                </div>
                <div>
                    <strong>Reconnect:</strong> {socketInfo.reconnectAttempts}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>
                    <strong>Token:</strong> {localStorage.getItem('token') ? '✓' : '✗'}
                </div>
            </div>

            {isExpanded && events.length > 0 && (
                <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '10px',
                    maxHeight: '300px',
                    overflowY: 'auto'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '11px' }}>
                        📝 Recent Events ({events.length}):
                    </div>
                    {events.map((event, i) => (
                        <div
                            key={i}
                            style={{
                                opacity: 0.8,
                                padding: '3px 0',
                                borderBottom: i < events.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                            }}
                        >
                            <div style={{ color: '#aaa' }}>{event.time}</div>
                            <div>
                                <span style={{
                                    color: event.name.includes('error') ? '#dc3545' :
                                        event.name.includes('connect') ? '#28a745' :
                                            '#17a2b8'
                                }}>
                                    {event.name}
                                </span>
                                {event.data && (
                                    <span style={{ color: '#999', marginLeft: '5px' }}>
                                        {event.data}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isExpanded && (
                <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '10px'
                }}>
                    <button
                        onClick={() => {
                            console.log('=== SOCKET DEBUG INFO ===');
                            console.log('User:', user);
                            console.log('Socket Connected:', socketConnected);
                            console.log('Socket Info:', socketInfo);
                            console.log('Socket Instance:', socketService.getSocket());
                            console.log('Recent Events:', events);
                            console.log('========================');
                        }}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            width: '100%'
                        }}
                    >
                        📋 Log to Console
                    </button>
                </div>
            )}
        </div>
    );
};

export default SocketDebug;