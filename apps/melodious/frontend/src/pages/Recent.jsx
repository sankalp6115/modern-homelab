import React, { use, useMemo } from 'react';
import { PlayerContext } from '../contexts/PlayerContext';
import { getAssetUrl } from '../utils/assets';
import '../styles/playlist-detail.css'; // Reusing table styles

const Recent = () => {
    const {
        songs,
        recentSongIds,
        playSong,
        isPlaying,
        currentSong,
        maxRecents,
        setMaxRecents
    } = use(PlayerContext);

    // Filter and sort songs based on recent IDs
    const recentSongs = useMemo(() => {
        return recentSongIds.flatMap(id => {
            const found = songs.find(s => String(s.id) === String(id));
            return found ? [found] : [];
        });
    }, [recentSongIds, songs]);

    return (
        <div className="playlist-detail-container">
            <section className="playlist-hero" style={{ background: 'linear-gradient(to bottom, #1a1a1a, #000)' }}>
                <div className="playlist-hero-content">
                    <div className="hero-poster">
                        <img
                            src="/assets/images/ui/recent.png"
                            alt="Recents"
                            onError={(e) => {
                                if (e.target.dataset.errorHandled) return;
                                e.target.dataset.errorHandled = true;
                                e.target.src = getAssetUrl('album-arts/default.jpg');
                            }}
                        />
                    </div>
                    <div className="hero-info">
                        <span className="info-badge">History</span>
                        <h1 className="playlist-name">Recently Played</h1>
                        <div className="settings-row" style={{ marginTop: '10px' }}>
                            <label htmlFor="max-recents-select" style={{ color: '#aaa', fontSize: '0.9rem' }}>Show last: </label>
                            <select
                                id="max-recents-select"
                                value={maxRecents}
                                onChange={(e) => setMaxRecents(Number(e.target.value))}
                                style={{
                                    background: '#222',
                                    color: '#fff',
                                    border: '1px solid #444',
                                    borderRadius: '4px',
                                    marginLeft: '10px',
                                    padding: '2px 5px'
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </div>
            </section>

            <div className="song-list-container">
                <table className="song-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th></th>
                            <th>Title</th>
                            <th>Artist</th>
                            <th>Album</th>
                            <th className="table-length-header">⏱︎</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentSongs.map((song, index) => {
                            const isActive = song.id === currentSong?.id;
                            return (
                                <tr
                                    key={song.id}
                                    className={`row ${isActive ? 'active-row' : ''}`}
                                    data-song-id={song.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => playSong(recentSongs.indexOf(song), recentSongs, true)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            playSong(recentSongs.indexOf(song), recentSongs, true);
                                        }
                                    }}
                                >
                                    <td className="table-index">{index + 1}</td>
                                    <td className="table-art">
                                        <img
                                            src={song.albumArt}
                                            loading="lazy"
                                            className={`album-art ${isActive && isPlaying ? 'active-album-art' : ''}`}
                                            alt={song.title}
                                            onError={(e) => {
                                                if (e.target.dataset.errorHandled) return;
                                                e.target.dataset.errorHandled = true;
                                                e.target.src = getAssetUrl('album-arts/default.jpg');
                                            }}
                                        />
                                    </td>
                                    <td className="table-title">{song.title}</td>
                                    <td className="table-artist">{song.artists.join(", ")}</td>
                                    <td className="table-album">{song.album}</td>
                                    <td className="table-length">
                                        {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {recentSongs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        Your listening history will appear here.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Recent;
