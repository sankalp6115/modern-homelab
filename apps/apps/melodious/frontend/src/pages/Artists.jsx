import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/artists.css';
import { getAssetUrl } from '../utils/assets';
import { buildApiUrl } from '../utils/api';

const Artists = () => {
    const [artists, setArtists] = useState([]);

    useEffect(() => {
        fetch(buildApiUrl('/api/artists'))
            .then(res => res.json())
            .then(data => setArtists(data))
            .catch(err => console.error("Failed to fetch artists:", err));
    }, []);

    const featuredArtists = artists.filter(a => a.image && a.image.trim() !== "");
    const otherArtists = artists.filter(a => !a.image || a.image.trim() === "");

    return (
        <div className="artists-container">
            <h2 className="heading artist-heading">Featured Artists</h2>
            <div className="artists-grid">
                {featuredArtists.map(artist => (
                    <Link to={`/artist/${artist.id}`} className="artist-card" key={artist.id}>
                        <div className="artist-poster">
                            <img
                                src={getAssetUrl(artist.image)}
                                alt={artist.name}
                                onError={(e) => {
                                    if (e.target.dataset.errorHandled) return;
                                    e.target.dataset.errorHandled = true;
                                    e.target.src = getAssetUrl('/assets/artist-images/default.jpg');
                                }}
                            />
                        </div>
                        <span className="artist-title">{artist.name}</span>
                    </Link>
                ))}
            </div>

            {otherArtists.length > 0 && (
                <>
                    <h2 className="heading artist-heading mt-40">Other Artists</h2>
                    <div className="other-artists-list">
                        {otherArtists.map(artist => (
                            <Link to={`/artist/${artist.id}`} className="other-artist-item" key={artist.id}>
                                <span className="dot">•</span>
                                <span className="name">{artist.name}</span>
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
export default Artists;
