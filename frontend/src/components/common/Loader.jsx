// frontend/src/components/common/Loader.jsx
const Loader = ({ message = "Загрузка..." }) => {
    return (
        <div className="d-flex flex-column justify-content-center align-items-center min-vh-100">
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">{message}</p>
        </div>
    );
};

export default Loader;