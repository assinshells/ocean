// File: src/components/layout/LeftSidebar.jsx
import React from 'react';

// Props: collapsed (bool), onToggleCollapse (fn), handleLogout (fn), currentUser
export default function LeftSidebar({ collapsed, onToggleCollapse, handleLogout, currentUser }) {
    return (
        <>
            {/* Mobile: top header */}
            <header className="md:hidden bg-gray-900 text-white flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                    <button aria-label="Open menu" onClick={() => onToggleCollapse(false)} className="text-2xl">
                        ☰
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🔥</span>
                        <span className="font-medium">Лого</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-200">{currentUser?.username}</div>
                    <button className="btn btn-sm btn-outline-light" onClick={handleLogout}>Выход</button>
                </div>
            </header>

            {/* Desktop: left sidebar */}
            <nav
                className={`hidden md:flex flex-col fixed left-0 top-0 h-screen bg-gray-900 text-white p-4 z-40 transition-all duration-300 
          ${collapsed ? 'w-20' : 'w-64'}`}
                aria-label="Main menu"
            >
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2 cursor-default">
                        <span className="text-2xl">🔥</span>
                        {!collapsed && <span className="ml-2 text-lg">Лого</span>}
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => onToggleCollapse(!collapsed)} className="border px-2 py-1 rounded text-sm bg-gray-800 hover:bg-gray-700">
                            {collapsed ? '→' : '←'}
                        </button>
                    </div>
                </div>

                <ul className="flex flex-col flex-1">
                    <li className="flex items-center mb-4 cursor-pointer hover:bg-gray-800 p-2 rounded">
                        <span className="text-xl">🏠</span>
                        {!collapsed && <span className="ml-2">Главная</span>}
                    </li>
                    <li className="flex items-center mb-4 cursor-pointer hover:bg-gray-800 p-2 rounded">
                        <span className="text-xl">📄</span>
                        {!collapsed && <span className="ml-2">Документы</span>}
                    </li>
                    <li className="flex items-center mb-4 cursor-pointer hover:bg-gray-800 p-2 rounded">
                        <span className="text-xl">📊</span>
                        {!collapsed && <span className="ml-2">Аналитика</span>}
                    </li>
                </ul>

                <div className="mt-auto">
                    <div className="flex items-center mb-4 cursor-pointer hover:bg-gray-800 p-2 rounded">
                        <span className="text-xl">⚙️</span>
                        {!collapsed && <span className="ml-2">Настройки</span>}
                    </div>
                    <div className="flex items-center cursor-pointer hover:bg-gray-800 p-2 rounded" onClick={handleLogout}>
                        <span className="text-xl">🚪</span>
                        {!collapsed && <span className="ml-2">Выход</span>}
                    </div>
                </div>
            </nav>
        </>
    );
}