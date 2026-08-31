import { useState } from 'react';
import { api } from '../api/api';

export default function VideoAnalyzer({ fetchQueue, addToast }) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [videoData, setVideoData] = useState(null);
    const [mediaType, setMediaType] = useState('video');
    const [quality, setQuality] = useState('best');

    const analyze = async () => {
        if (!url.trim()) return addToast('Please enter a YouTube URL');
        setLoading(true);
        setVideoData(null);

        try {
            const data = await api.getInfo(url);
            setVideoData(data);
            setQuality('best');
        } catch (err) {
            addToast(err.message);
        } finally {
            setLoading(false);
        }
    };

    const enqueue = async () => {
        if (!videoData) return;
        try {
            await api.enqueue({ url, quality, type: mediaType });
            addToast('Video added to queue!', 'success');
            setUrl('');
            setVideoData(null);
            fetchQueue();
        } catch (err) {
            addToast(err.message);
        }
    };

    return (
        <div>
            <div className="input-group" style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                    <label>Single YouTube URL</label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        onKeyPress={(e) => e.key === 'Enter' && analyze()}
                    />
                </div>
                <button className="btn" style={{ width: 'auto', padding: '14px 28px' }} onClick={analyze} disabled={loading}>
                    {loading ? 'Analyzing...' : 'Analyze'}
                </button>
            </div>

            {/* Info Box */}
            {videoData && (
                <div className="info-box show">
                    <div className="info-meta">
                        <h3>{videoData.title}</h3>
                        {videoData.type === 'playlist' ? (
                            <p>Playlist • {videoData.video_count} videos</p>
                        ) : (
                            <p>{Math.floor(videoData.duration / 60)} minutes</p>
                        )}
                    </div>
                </div>
            )}

            {/* Options */}
            {videoData && (
                <div>
                    <div className="row">
                        <div className="input-group">
                            <label>Format Type</label>
                            <select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
                                <option value="video">Video + Audio (MP4)</option>
                                <option value="audio">Audio Only (MP3)</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Quality</label>
                            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                                <option value="best">Best Available</option>
                                {/* You can populate more options dynamically if needed */}
                            </select>
                        </div>
                    </div>

                    <button className="btn" onClick={enqueue}>
                        📥 Queue Video
                    </button>
                </div>
            )}
        </div>
    );
}