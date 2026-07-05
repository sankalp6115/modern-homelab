const API_BASE = 'http://localhost:8000';

export const api = {
    async getInfo(url) {
        const res = await fetch(`${API_BASE}/api/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch info');
        return res.json();
    },

    async enqueue(data) {
        const res = await fetch(`${API_BASE}/api/enqueue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Enqueue failed');
        return res.json();
    },

    async getQueue() {
        const res = await fetch(`${API_BASE}/api/queue`);
        if (!res.ok) throw new Error('Failed to fetch queue');
        return res.json();
    },

    async cancelJob(id) {
        const res = await fetch(`${API_BASE}/api/cancel/${id}`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to cancel job');
        return res.json();
    },

    async removeJob(id) {
        const res = await fetch(`${API_BASE}/api/remove/${id}`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to remove job');
        return res.json();
    },

    async clearFinished() {
        const res = await fetch(`${API_BASE}/api/clear`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to clear');
        return res.json();
    },
};