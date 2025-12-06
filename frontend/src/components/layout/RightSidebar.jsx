// File: src/components/layout/RightSidebar.jsx
import React from 'react';

export default function RightSidebar({ users = [], currentUser = {}, isOpen, onClose }) {
    // isOpen / onClose are used for mobile drawer. On md+ the sidebar is always visible (fixed)
    return (
        <>
            {/* Desktop fixed right sidebar */}
            <aside className="hidden md:flex flex-col fixed right-0 top-0 h-screen bg-white border-l z-30 w-64 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h5 className="mb-0">Пользователи онлайн</h5>
                    <span className="badge bg-primary rounded-pill">{users.length}</span>
                </div>

                <div className="flex-1 overflow-auto">
                    {users.length === 0 && (
                        <div className="text-center text-muted p-3">
                            <i className="bi bi-info-circle"></i>
                            <p className="mb-0 mt-2">Нет пользователей онлайн</p>
                        </div>
                    )}

                    {users.map((user) => (
                        <div key={user._id} className={`flex items-center gap-3 p-2 rounded hover:bg-gray-100 ${user._id === currentUser?._id ? 'bg-gray-100' : ''}`}>
                            <div className="user-avatar text-2xl">
                                <i className="bi bi-person-circle"></i>
                            </div>
                            <div>
                                <div className="font-medium">{user.username}</div>
                                <div className="text-sm text-success">В сети</div>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Mobile FAB */}
            <button
                className="md:hidden fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center bg-primary text-white"
                aria-label="Открыть пользователей"
                onClick={() => {
                    // custom event - parent should toggle mobile drawer
                    const ev = new CustomEvent('toggleRightDrawer');
                    window.dispatchEvent(ev);
                }}
            >
                <i className="bi bi-people-fill"></i>
            </button>

            {/* Mobile drawer (slides from right) - controlled by parent's isOpen prop via portal-like element */}
            <div className={`fixed inset-0 z-40 md:hidden pointer-events-none ${isOpen ? 'pointer-events-auto' : ''}`} aria-hidden={!isOpen}>
                <div
                    className={`absolute inset-0 bg-black bg-opacity-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={onClose}
                />

                <div className={`absolute right-0 top-0 h-full bg-white w-80 transform transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-4 border-b flex items-center justify-between">
                        <h5 className="mb-0">Пользователи</h5>
                        <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Закрыть</button>
                    </div>
                    <div className="p-4 overflow-auto h-full">
                        {users.length === 0 && (
                            <div className="text-center text-muted p-3">
                                <i className="bi bi-info-circle"></i>
                                <p className="mb-0 mt-2">Нет пользователей онлайн</p>
                            </div>
                        )}

                        {users.map((user) => (
                            <div key={user._id} className={`flex items-center gap-3 p-2 rounded hover:bg-gray-100 ${user._id === currentUser?._id ? 'bg-gray-100' : ''}`}>
                                <div className="user-avatar text-2xl">
                                    <i className="bi bi-person-circle"></i>
                                </div>
                                <div>
                                    <div className="font-medium">{user.username}</div>
                                    <div className="text-sm text-success">В сети</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}