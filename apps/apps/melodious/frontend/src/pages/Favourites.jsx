import React, { use, useMemo } from 'react';
import { PlayerContext } from '../contexts/PlayerContext';
import { getAssetUrl } from '../utils/assets';
import '../styles/playlist-detail.css'; // Reusing table styles

const Favourites = () => {
    const {
        songs,
        playSong,
        isPlaying,
        currentSong
    } = use(PlayerContext);

    // Filter songs that are favorited
    const favouriteSongs = useMemo(() => {
        return songs.filter(s => s.isFavorite);
    }, [songs]);

    return (
        <div className="playlist-detail-container">
            <section className="playlist-hero" style={{ background: 'linear-gradient(to bottom, #4a0e17, #000)' }}>
                <div className="playlist-hero-content">
                    <div className="hero-poster" style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px' }}>
                        <img
                            src="/assets/images/ui/heart.png"
                            alt="Favourites"
                            style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,0,0,0.4))' }}
                            onError={(e) => {
                                if (e.target.dataset.errorHandled) return;
                                e.target.dataset.errorHandled = true;
                                e.target.src = getAssetUrl('album-arts/default.jpg');
                            }}
                        />
                    </div>
                    <div className="hero-info">
                        <span className="info-badge">Collection</span>
                        <h1 className="playlist-name">Favourites</h1>
                        <p className="playlist-meta">
                            {favouriteSongs.length} Tracks
                        </p>
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
                        {favouriteSongs.map((song, index) => {
                            const isActive = song.id === currentSong?.id;
                            return (
                                <tr
                                    key={song.id}
                                    className={`row ${isActive ? 'active-row' : ''}`}
                                    data-song-id={song.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => playSong(favouriteSongs.indexOf(song), favouriteSongs)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            playSong(favouriteSongs.indexOf(song), favouriteSongs);
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
                                    <td className="table-album">{song.album || "—"}</td>
                                    <td className="table-length">
                                        {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {favouriteSongs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        Your favorited songs will appear here. Right-click any song and select "Favourite".
                    </div>
                )}
            </div>
        </div>
    );
};

export default Favourites;
