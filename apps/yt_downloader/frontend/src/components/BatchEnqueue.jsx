import { useState } from 'react';
import { api } from '../api/api';

export default function BatchEnqueue({ fetchQueue, addToast }) {
    const [urls, setUrls] = useState('');
    const [mediaType, setMediaType] = useState('video');
    const [quality, setQuality] = useState('best');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!urls.trim()) return addToast('Please enter at least one URL');

        setLoading(true);
        try {
            await api.enqueue({ url: urls, quality, type: mediaType });
            addToast('Batch URLs enqueued successfully!', 'success');
            setUrls('');
            fetchQueue();
        } catch (err) {
            addToast(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="input-group">
                <label>YouTube URLs (one per line)</label>
                <textarea
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    rows={6}
                />
            </div>

            <div className="row">
                <div className="input-group">
                    <label>Media Type</label>
                    <select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
                        <option value="video">Video + Audio (MP4)</option>
                        <option value="audio">Audio Only (MP3)</option>
                    </select>
                </div>

                <div className="input-group">
                    <label>Max Quality</label>
                    <select value={quality} onChange={(e) => setQuality(e.target.value)} disabled={mediaType === 'audio'}>
                        <option value="best">Best Available Quality</option>
                        <option value="1080p">1080p</option>
                        <option value="720p">720p</option>
                        <option value="480p">480p</option>
                        <option value="360p">360p</option>
                    </select>
                </div>
            </div>

            <button className="btn" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Enqueuing...' : '🚀 Enqueue Downloads'}
            </button>
        </div>
    );
}