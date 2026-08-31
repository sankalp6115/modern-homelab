export default function ToastContainer({ toasts }) {
    return (
        <div className="alert-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`alert alert-${toast.type}`}>
                    <span>{toast.message}</span>
                    <button className="alert-close" onClick={() => { }}>×</button>
                </div>
            ))}
        </div>
    );
}