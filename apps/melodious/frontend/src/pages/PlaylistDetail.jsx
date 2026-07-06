import React, { useEffect, useState, use, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { PlayerContext } from '../contexts/PlayerContext';
import { getAssetUrl } from '../utils/assets';
import '../styles/playlist-detail.css';


const PlaylistDetail = () => {
    const { id } = useParams();
    const { playSong, isPlaying, currentSongIndex, activeQueue, currentSong } = use(PlayerContext);
    const [playlist, setPlaylist] = useState(null);
    const [headerBg, setHeaderBg] = useState('linear-gradient(to right, #333, #111)');
    const imgRef = useRef(null);
    const containerRef = useRef(null);
    const highlightRef = useRef(null);

    const fetchPlaylistDetails = React.useCallback(() => {
        fetch(`/api/playlists/${id}`)
            .then(res => res.json())
            .then(data => {
                const sanitizedSongs = data.songs.map(song => ({
                    ...song,
                    file: `/api/songs/stream/${encodeURIComponent(song.file)}`,
                    albumArt: getAssetUrl(song.albumArt),
                    artists: Array.isArray(song.artists) ? song.artists : [song.artists]
                }));
                setPlaylist({ ...data, poster: getAssetUrl(data.poster), songs: sanitizedSongs });
            })
            .catch(err => console.error("Failed to fetch playlist:", err));
    }, [id]);

    useEffect(() => {
        fetchPlaylistDetails();
    }, [fetchPlaylistDetails]);

    useEffect(() => {
        const handleRefresh = (e) => {
            // Refresh if no playlist ID is specified, or if it matches current
            if (!e.detail || String(e.detail.playlistId) === String(id)) {
                fetchPlaylistDetails();
            }
        };
        window.addEventListener('refresh-playlist', handleRefresh);
        return () => window.removeEventListener('refresh-playlist', handleRefresh);
    }, [id, fetchPlaylistDetails]);

    const handleImgLoad = () => {
        if (imgRef.current && window.ColorThief) {
            try {
                const colorThief = new window.ColorThief();
                const [r, g, b] = colorThief.getColor(imgRef.current);
                const dominantColor = `rgb(${r}, ${g}, ${b})`;
                const darkerColor = `rgb(${Math.max(r - 50, 0)}, ${Math.max(g - 50, 0)}, ${Math.max(b - 50, 0)})`;
                setHeaderBg(`linear-gradient(to right, ${dominantColor}, ${darkerColor})`);
            } catch (e) {
                console.error("Color extraction failed", e);
            }
        }
    };

    const handleMouseEnterRow = (e) => {
        const tr = e.currentTarget;
        const highlight = highlightRef.current;
        if (!highlight || !containerRef.current) return;

        const tableEl = containerRef.current.querySelector(".song-table");
        if (!tableEl) return;

        let top = tr.offsetTop;
        let parent = tr.offsetParent;
        while (parent && parent !== containerRef.current) {
            top += parent.offsetTop;
            parent = parent.offsetParent;
        }

        const height = tr.offsetHeight;
        let left = tableEl.offsetLeft;
        let parentLeft = tableEl.offsetParent;
        while (parentLeft && parentLeft !== containerRef.current) {
            left += parentLeft.offsetLeft;
            parentLeft = parentLeft.offsetParent;
        }
        const width = tableEl.offsetWidth;

        highlight.style.top = `${top}px`;
        highlight.style.left = `${left}px`;
        highlight.style.height = `${height}px`;
        highlight.style.width = `${width}px`;
        highlight.style.opacity = '1';
    };

    const handleMouseLeave = () => {
        const highlight = highlightRef.current;
        if (highlight) {
            highlight.style.opacity = '0';
        }
    };

    if (!playlist) return <div className="loading">Loading Playlist…</div>;

    return (
        <div className="playlist-detail-container">
            <section className="playlist-hero" style={{ background: headerBg }}>
                <div className="playlist-hero-content">
                    <div className="hero-poster">
                        <img
                            ref={imgRef}
                            src={playlist.poster}
                            alt={playlist.name}
                            onLoad={handleImgLoad}
                            onError={(e) => {
                                if (e.target.dataset.errorHandled) return;
                                e.target.dataset.errorHandled = true;
                                e.target.src = getAssetUrl(`playlist-posters/fallback/playlist-poster1.jpeg`);
                            }}
                            crossOrigin="anonymous"
                        />
                    </div>
                    <div className="hero-info">
                        <span className="info-badge">Playlist</span>
                        <h1 className="playlist-name">{playlist.name}</h1>
                        <p className="playlist-meta">
                            80,000+ Monthly Listeners • {playlist.songs.length} Tracks
                        </p>
                    </div>
                </div>
            </section>

            {/* Song Table */}
            <div
                className="song-list-container"
                ref={containerRef}
                onMouseLeave={handleMouseLeave}
            >
                <div
                    className="hover-highlight"
                    ref={highlightRef}
                    style={{
                        opacity: 0,
                        pointerEvents: 'none',
                    }}
                />
                <table className="song-table">
                    <thead onMouseEnter={handleMouseLeave}>
                        <tr>
                            <th>#</th>
                            <th></th>
                            <th>Title</th>
                            <th>Artist</th>
                            <th>Album</th>
                            <th className="table-length-header">⏱︎</th>
                            <th>Rating</th>
                        </tr>
                    </thead>
                    <tbody>
                        {playlist.songs.map((song, index) => {
                            const isActive = song.id === currentSong?.id;
                            return (
                                <tr
                                    key={song.id}
                                    className={`row ${isActive ? 'active-row' : ''}`}
                                    data-song-id={song.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => playSong(index, playlist.songs)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            playSong(index, playlist.songs);
                                        }
                                    }}
                                    onMouseEnter={handleMouseEnterRow}
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
                                    <td className="star-rating">
                                        {"★".repeat(Math.floor(song.rating))}
                                        {song.rating % 1 > 0 ? "⯨" : ""}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PlaylistDetail;
