// frontend/src/components/layout/LeftSidebar.jsx
import React, { useState, useEffect } from "react";
import Logo from "../chat/Logo";
import SettingsModal from "../chat/SettingsModal";

export default function LeftSidebar({ handleLogout }) {
    const [showSettings, setShowSettings] = useState(false);
    const [theme, setTheme] = useState("light");

    // ===== Theme Logic =====
    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        applyTheme(newTheme);
    };

    const applyTheme = (selectedTheme) => {
        // Удаляем все темы
        document.body.classList.remove("light", "dark", "preload");

        // Применяем новую тему
        document.body.classList.add(selectedTheme);

        // Сохраняем в localStorage
        localStorage.setItem("theme", selectedTheme);
    };

    // Инициализация темы при монтировании
    useEffect(() => {
        // Добавляем preload для предотвращения анимации при загрузке
        document.body.classList.add("preload");

        // Получаем сохранённую тему или системную
        const savedTheme = localStorage.getItem("theme");
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";

        const initialTheme = savedTheme || systemTheme;

        setTheme(initialTheme);
        applyTheme(initialTheme);

        // Убираем preload после короткой задержки
        setTimeout(() => {
            document.body.classList.remove("preload");
        }, 100);

        // Слушаем изменения системной темы
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleSystemThemeChange = (e) => {
            if (!localStorage.getItem("theme")) {
                const newTheme = e.matches ? "dark" : "light";
                setTheme(newTheme);
                applyTheme(newTheme);
            }
        };

        mediaQuery.addEventListener("change", handleSystemThemeChange);

        return () => {
            mediaQuery.removeEventListener("change", handleSystemThemeChange);
        };
    }, []);

    // Обработчик клика по Settings
    const handleSettingsClick = (e) => {
        e.preventDefault();
        setShowSettings(true);
    };

    // Обработчик клика по Logout
    const handleLogoutClick = (e) => {
        e.preventDefault();
        if (window.confirm("Вы уверены, что хотите выйти?")) {
            handleLogout();
        }
    };

    return (
        <>
            <div className="side-menu flex-lg-column me-lg-1 ms-lg-0">
                <Logo />

                <div className="flex-lg-column my-auto">
                    <ul className="nav side-menu-nav justify-content-center">
                        <li className="nav-item" title="Профиль">
                            <a className="nav-link" href="#" onClick={(e) => e.preventDefault()}>
                                <i className="bi bi-person"></i>
                            </a>
                        </li>

                        <li className="nav-item" title="Настройки">
                            <a className="nav-link" href="#" onClick={handleSettingsClick}>
                                <i className="bi bi-gear"></i>
                            </a>
                        </li>

                        {/* Mobile Dropdown */}
                        <li className="nav-item dropdown profile-user-dropdown d-inline-block d-lg-none">
                            <a
                                className="nav-link dropdown-toggle no-caret"
                                href="#"
                                data-bs-toggle="dropdown"
                                aria-haspopup="true"
                                aria-expanded="false"
                            >
                                <i className="bi bi-three-dots"></i>
                            </a>
                            <div className="dropdown-menu">
                                <a className="dropdown-item" href="#" onClick={(e) => e.preventDefault()}>
                                    <i className="bi bi-person float-end text-muted"></i>
                                    Профиль
                                </a>
                                <a className="dropdown-item" href="#" onClick={handleSettingsClick}>
                                    <i className="bi bi-gear float-end text-muted"></i>
                                    Настройки
                                </a>
                                <div className="dropdown-divider"></div>
                                <a className="dropdown-item text-danger" href="#" onClick={handleLogoutClick}>
                                    <i className="bi bi-box-arrow-right float-end"></i>
                                    Выход
                                </a>
                            </div>
                        </li>
                    </ul>
                </div>

                {/* Desktop Bottom Menu */}
                <div className="flex-lg-column d-none d-lg-block">
                    <ul className="nav side-menu-nav justify-content-center">
                        <li className="nav-item btn-group dropup profile-user-dropdown">
                            <a
                                className="nav-link dropdown-toggle no-caret"
                                href="#"
                                data-bs-toggle="dropdown"
                                aria-haspopup="true"
                                aria-expanded="false"
                                title="Меню"
                            >
                                <i className="bi bi-three-dots"></i>
                            </a>
                            <div className="dropdown-menu">
                                <a className="dropdown-item" href="#" onClick={(e) => e.preventDefault()}>
                                    <i className="bi bi-person float-end text-muted"></i>
                                    Профиль
                                </a>
                                <a className="dropdown-item" href="#" onClick={handleSettingsClick}>
                                    <i className="bi bi-gear float-end text-muted"></i>
                                    Настройки
                                </a>
                                <div className="dropdown-divider"></div>
                                <a className="dropdown-item text-danger" href="#" onClick={handleLogoutClick}>
                                    <i className="bi bi-box-arrow-right float-end"></i>
                                    Выход
                                </a>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Settings Modal */}
            <SettingsModal
                show={showSettings}
                onClose={() => setShowSettings(false)}
                theme={theme}
                toggleTheme={toggleTheme}
            />
        </>
    );
}