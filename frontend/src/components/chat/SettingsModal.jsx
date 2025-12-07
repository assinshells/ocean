import React from "react";

export default function SettingsModal({ show, onClose, theme, toggleTheme }) {
    if (!show) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="modal-backdrop fade show"
                onClick={onClose}
                style={{ zIndex: 1040 }}
            ></div>

            {/* Modal */}
            <div
                className="modal fade show d-block"
                tabIndex="-1"
                style={{ zIndex: 1050 }}
                onClick={(e) => {
                    // Закрываем только при клике на backdrop
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">

                        <div className="modal-header">
                            <h5 className="modal-title">
                                <i className="bi bi-gear-fill me-2"></i>
                                Настройки
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onClose}
                                aria-label="Close"
                            ></button>
                        </div>

                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label fw-bold">
                                    <i className="bi bi-palette-fill me-2"></i>
                                    Внешний вид
                                </label>
                                <div className="d-flex gap-3">
                                    {/* Light Theme Button */}
                                    <button
                                        className={`btn flex-fill ${theme === "light" ? "btn-primary" : "btn-outline-secondary"}`}
                                        onClick={() => theme === "dark" && toggleTheme()}
                                    >
                                        <i className="bi bi-sun-fill me-2"></i>
                                        Светлая
                                    </button>

                                    {/* Dark Theme Button */}
                                    <button
                                        className={`btn flex-fill ${theme === "dark" ? "btn-primary" : "btn-outline-secondary"}`}
                                        onClick={() => theme === "light" && toggleTheme()}
                                    >
                                        <i className="bi bi-moon-stars-fill me-2"></i>
                                        Темная
                                    </button>
                                </div>
                            </div>

                            {/* Alternative: Switch Version */}
                            <div className="form-check form-switch">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="themeSwitch"
                                    checked={theme === "dark"}
                                    onChange={toggleTheme}
                                />
                                <label className="form-check-label" htmlFor="themeSwitch">
                                    {theme === "dark" ? (
                                        <>
                                            <i className="bi bi-moon-stars-fill me-2"></i>
                                            Темная тема
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-sun-fill me-2"></i>
                                            Светлая тема
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={onClose}
                            >
                                <i className="bi bi-x-lg me-2"></i>
                                Закрыть
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}