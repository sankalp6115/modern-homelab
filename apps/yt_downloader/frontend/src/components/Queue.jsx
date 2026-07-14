import QueueItem from './QueueItem.jsx';
import { useState, useEffect } from 'react';
import { api } from './../api/api.js';

export default function Queue({ queue, fetchQueue, addToast }) {
    const [filter, setFilter] = useState('all');

    const filtered = queue.filter(job => {
        if (filter === 'active') return ['queued', 'resolving', 'downloading', 'converting'].includes(job.status);
        if (filter === 'completed') return job.status === 'completed';
        if (filter === 'error') return ['error', 'expired', 'cancelled'].includes(job.status);
        return true;
    });

    const clearFinished = async () => {
        try {
            const data = await api.clearFinished();
            addToast(`Cleared ${data.count} items`, 'success');
            fetchQueue();
        } catch (e) {
            addToast(e.message);
        }
    };

    return (
        <div className="queue-section">
            <div className="queue-header">
                <h2>Download Queue</h2>
                <div className="queue-controls">
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} className="queue-filter-select">
                        <option value="all">All Downloads</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="error">Failed / Expired</option>
                    </select>
                    <button className="btn-outline" onClick={clearFinished}>Clear Finished</button>
                </div>
            </div>

            <div className="queue-container">
                {filtered.length === 0 ? (
                    <div className="empty-queue">No matching downloads in queue.</div>
                ) : (
                    filtered
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .map(job => (
                            <QueueItem
                                key={job.id}
                                job={job}
                                fetchQueue={fetchQueue}
                                addToast={addToast}
                            />
                        ))
                )}
            </div>
        </div>
    );
}