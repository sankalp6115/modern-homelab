import { api } from '../api/api';

export default function QueueItem({ job, fetchQueue, addToast }) {
    const handleCancel = async () => {
        try {
            await api.cancelJob(job.id);
            addToast('Download cancelled', 'success');
            fetchQueue();
        } catch (e) {
            addToast(e.message);
        }
    };

    const handleRemove = async () => {
        try {
            await api.removeJob(job.id);
            fetchQueue();
        } catch (e) {
            addToast(e.message);
        }
    };

    const progress = parseFloat(job.progress) || 0;
    const isActive = ['downloading', 'converting'].includes(job.status);

    return (
        <div className="queue-item">
            <div className="queue-item-meta">
                <div className="queue-item-title">
                    {job.media_type === 'audio' ? '🎵' : '🎥'} {job.title}
                </div>
                <span className={`status-badge badge-${job.status}`}>{job.status}</span>
            </div>

            <div className="progress-container">
                <div className="progress-bar-bg">
                    <div className={`progress-fill ${isActive ? 'pulse' : ''}`} style={{ width: `${progress}%` }} />
                </div>
                <div className="queue-item-details">
                    {job.status === 'downloading' && (
                        <>
                            <span>Speed: {job.speed || '—'}</span>
                            <span>ETA: {job.eta || '—'}</span>
                        </>
                    )}
                    <span>{job.progress || '0%'}</span>
                </div>
            </div>

            <div className="queue-item-actions">
                {['queued', 'resolving'].includes(job.status) && (
                    <button className="btn-sm btn-sm-cancel" onClick={handleCancel}>Cancel</button>
                )}
                {['completed', 'error', 'expired', 'cancelled'].includes(job.status) && (
                    <>
                        {job.status === 'completed' && (
                            <a href={`api/download/${job.id}`} target="_blank" className="btn-sm btn-sm-download">
                                Download File
                            </a>
                        )}
                        <button className="btn-sm btn-sm-remove" onClick={handleRemove}>Dismiss</button>
                    </>
                )}
            </div>
        </div>
    );
}