import React, { useEffect, useState, use, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { PlayerContext } from '../contexts/PlayerContext';
import '../styles/artists.css';
import { getAssetUrl } from '../utils/assets';
import { buildApiUrl } from '../utils/api';


const ArtistDetail = () => {
    const { id } = useParams();
    const { playSong, isPlaying, currentSongIndex, activeQueue, currentSong } = use(PlayerContext);
    const [artist, setArtist] = useState(null);
    const [headerBg, setHeaderBg] = useState('linear-gradient(to right, #333, #111)');
    const imgRef = useRef(null);

    const fileInputRef = useRef(null);

    useEffect(() => {
        fetch(buildApiUrl(`/api/artists/${id}`))
            .then(res => res.json())
            .then(data => {
                const sanitizedSongs = data.songs.map(song => ({
                    ...song,
                    file: buildApiUrl(`/api/songs/stream/${encodeURIComponent(song.file)}`),
                    albumArt: getAssetUrl(song.albumArt),
                    artists: Array.isArray(song.artists) ? song.artists : [song.artists]
                }));
                setArtist({ ...data, image: getAssetUrl(data.image), songs: sanitizedSongs });
            })
            .catch(err => console.error("Failed to fetch artist details:", err));
    }, [id]);

    const handleImgLoad = () => {
        if (imgRef.current && window.ColorThief) {
            try {
                const colorThief = new window.ColorThief();
                const [r, g, b] = colorThief.getColor(imgRef.current);
                setHeaderBg(`linear-gradient(to right, rgb(${r},${g},${b}), rgb(${Math.max(r - 60, 0)}, ${Math.max(g - 60, 0)}, ${Math.max(b - 60, 0)}))`);
            } catch (e) {
                console.error("ColorThief failed", e);
            }
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(buildApiUrl(`/api/artists/${id}/image`), {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                const timestamp = new Date().getTime();
                setArtist(prev => ({ ...prev, image: `${getAssetUrl(data.image)}?t=${timestamp}` }));
            } else {
                console.error("Failed to upload image");
            }
        } catch (error) {
            console.error("Error uploading image:", error);
        }
    };

    if (!artist) return <div className="loading">Loading Artist…</div>;

    return (
        <div className="artist-detail-container">
            <section className="artist-hero" style={{ background: headerBg }}>
                <div className="artist-hero-content">
                    <div
                        className="artist-big-poster"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ cursor: 'pointer', position: 'relative' }}
                        title="Click to update artist image"
                    >
                        <img
                            ref={imgRef}
                            src={artist.image || `/assets/artist-images/default.jpg`}
                            alt={artist.name}
                            onLoad={handleImgLoad}
                            onError={(e) => {
                                if (e.target.dataset.errorHandled) return;
                                e.target.dataset.errorHandled = true;
                                e.target.src = getAssetUrl('artist-images/default.jpg');
                            }}
                            crossOrigin="anonymous"
                        />
                        <div className="upload-overlay" style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s',
                            color: 'white', fontWeight: 'bold'
                        }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
                            Update Image
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/jpeg, image/png, image/webp"
                            onChange={handleImageUpload}
                        />
                    </div>
                    <div className="hero-info">
                        <span className="info-badge">Verified Artist</span>
                        <h1 className="artist-name-big">{artist.name}</h1>
                        <p className="artist-meta">
                            80,000+ Monthly Listeners • {artist.songs.length} Tracks In Library
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
                            <th>Album</th>
                            <th>Genre</th>
                            <th>⏱︎</th>
                        </tr>
                    </thead>
                    <tbody>
                        {artist.songs.map((song, index) => {
                            const isActive = song.id === currentSong?.id;
                            return (
                                <tr
                                    key={song.id}
                                    className={`row ${isActive ? 'active-row' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => playSong(index, artist.songs)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            playSong(index, artist.songs);
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
                                    <td className="table-album">{song.album}</td>
                                    <td className="table-genre">{song.genre}</td>
                                    <td className="table-length">
                                        {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
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

export default ArtistDetail;
