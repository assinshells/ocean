import React from "react";

export default function SettingsModal({ show, onClose, theme, toggleTheme }) {
    return (
        <div className={`modal fade ${show ? "show d-block" : ""}`} tabIndex="-1">
            <div className="modal-dialog">
                <div className="modal-content">

                    <div className="modal-header">
                        <h5 className="modal-title">Settings</h5>
                        <button className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">
                        <div className="form-check form-switch">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="themeSwitch"
                                checked={theme === "dark"}
                                onChange={toggleTheme}
                            />
                            <label className="form-check-label" htmlFor="themeSwitch">
                                {theme === "dark" ? "Темная тема" : "Светлая тема"}
                            </label>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
