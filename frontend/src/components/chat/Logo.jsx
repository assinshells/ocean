import React from "react";
import reactLogo from '../../assets/react.svg'


export default function Logo() {
    return (
        <div className="navbar-brand-box">
            <a className="logo logo-dark">
                <span className="logo-sm">
                    <img src={reactLogo} alt="" height="30" />
                </span>
            </a>
            <a className="logo logo-light">
                <span className="logo-sm">
                    <img src={reactLogo} alt="" height="30" />
                </span>
            </a>
        </div>
    );
}