// frontend/src/components/layout/LeftSidebar.jsx
import React, { useState, useEffect } from "react";
import Logo from "../chat/Logo";
import SettingsModal from "../chat/SettingsModal";

export default function SideMenu({ handleLogout }) {
    const [showSettings, setShowSettings] = useState(false);
    const [theme, setTheme] = useState("light");

    // ===== Theme Logic =====
    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);

        document.body.classList.remove("light", "dark");
        document.body.classList.add(newTheme);

        localStorage.setItem("theme", newTheme);
    };

    useEffect(() => {
        const saved = localStorage.getItem("theme") || "light";
        setTheme(saved);
        document.body.classList.add(saved);
    }, []);

    return (
        <>
            <div className="side-menu flex-lg-column me-lg-1 ms-lg-0">
                <Logo />
                <div className="flex-lg-column my-auto">
                    <ul className="nav side-menu-nav justify-content-center">
                        <li className="nav-item">
                            <a className="nav-link" href="#">
                                <i className="bi bi-person"></i>
                            </a>
                        </li>

                        <li className="nav-item">
                            <a className="nav-link" href="#" onClick={() => setShowSettings(true)}>
                                <i className="bi bi-gear"></i>
                            </a>
                        </li>
                        <li className="nav-item dropdown profile-user-dropdown d-inline-block d-lg-none">
                            <a className="nav-link dropdown-toggle no-caret" href="#" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                <i className="bi bi-three-dots"></i>
                            </a>
                            <div className="dropdown-menu">
                                <a className="dropdown-item" href="#">Profile <i className="bi bi-person float-end text-muted"></i></a>
                                <a className="dropdown-item" href="#" onClick={() => setShowSettings(true)}>Setting <i className="bi bi-gear float-end text-muted"></i></a>
                                <div className="dropdown-divider"></div>
                                <a className="dropdown-item" href="#" onClick={handleLogout}>Log out <i className="bi bi-box-arrow-right float-end text-muted"></i></a>
                            </div>
                        </li>
                    </ul>
                </div>

                <div className="flex-lg-column d-none d-lg-block">
                    <ul className="nav side-menu-nav justify-content-center">
                        <li className="nav-item btn-group dropup profile-user-dropdown">
                            <a className="nav-link dropdown-toggle no-caret" href="#" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                <i className="bi bi-three-dots"></i>
                            </a>
                            <div className="dropdown-menu ">
                                <a className="dropdown-item" href="#">Profile <i className="bi bi-person float-end text-muted"></i></a>
                                <a className="dropdown-item" href="#" onClick={() => setShowSettings(true)}>Setting <i className="bi bi-gear float-end text-muted"></i></a>
                                <div className="dropdown-divider"></div>
                                <a className="dropdown-item" href="#" onClick={handleLogout}>Log out <i className="bi bi-box-arrow-right float-end text-muted"></i></a>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
            <SettingsModal
                show={showSettings}
                onClose={() => setShowSettings(false)}
                theme={theme}
                toggleTheme={toggleTheme}
            />
        </>
    );
}