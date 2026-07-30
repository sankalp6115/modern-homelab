import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayerContext } from '../contexts/PlayerContext';
import { getAssetUrl } from '../utils/assets';
import { buildApiUrl } from '../utils/api';
import '../styles/home.css';

const Home = () => {
  const { playlists, refetchPlaylists } = useContext(PlayerContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const genres = [
    { name: 'Dance Beat', color: '#ff0844' },
    { name: 'Electro Pop', color: '#ffb199' },
    { name: 'Alternative Indie', color: 'chartreuse' },
    { name: 'Hip Hop', color: 'violet' }
  ];

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPlaylistName("");
    setPosterFile(null);
    if (posterPreview) {
      URL.revokeObjectURL(posterPreview);
    }
    setPosterPreview(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setPosterFile(file);
        setPosterPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setPosterFile(file);
      setPosterPreview(URL.createObjectURL(file));
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!playlistName.trim()) return;

    const formData = new FormData();
    formData.append("name", playlistName.trim());
    if (posterFile) {
      formData.append("poster", posterFile);
    }

    try {
      const response = await fetch(buildApiUrl('/api/playlists/'), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create playlist");
      }

      await refetchPlaylists();
      handleCloseModal();
    } catch (err) {
      console.error(err);
      alert("Failed to create playlist: " + err.message);
    }
  };

  return (
    <div className="home-container">
      {/* Hero Background */}
      <div className="home-hero-bg"></div>

      <div className="home-content">
        {/* Your Playlists */}
        <section className="home-section">
          <div className="section-header">
            <h2 className="heading">Your Playlists</h2>
            <button type="button" className="create-playlist-btn" onClick={() => setIsModalOpen(true)}>
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Create Playlist
            </button>
          </div>
          <div className="playlists-grid">
            {playlists.map(pl => (
              <Link
                to={`/playlist/${pl.id}`}
                className="playlist-card-link"
                key={pl.id}
                data-playlist-id={pl.id}
                data-playlist-name={pl.name}
              >
                <div className="playlist-card">
                  <div className="playlist-poster">
                    <img
                      src={getAssetUrl(pl.poster)}
                      alt={pl.name}
                      loading="lazy"
                      onError={(e) => { 
                        if (e.target.dataset.errorHandled) return;
                        e.target.dataset.errorHandled = true;
                        e.target.src = getAssetUrl(`playlist-posters/fallback/playlist-poster1.jpeg`); 
                      }}
                    />
                    <div className="playlist-overlay">
                      <span className="playlist-title">{pl.name}</span>
                    </div>
                  </div>
                  <button type="button" className="playPauseBtn">
                    <img src="/assets/images/ui/play.png" alt="Play" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Top Genres */}
        <section className="home-section">
          <div className="section-header">
            <h2 className="heading">Top Genres</h2>
          </div>
          <div className="genres-flex">
            {genres.map(genre => (
              <div
                className="genre-chip"
                key={genre.name}
                style={{ backgroundColor: genre.color }}
              >
                {genre.name}
              </div>
            ))}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button type="button" className="modal-close-btn" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleCreatePlaylist} className="modal-form">
              <div className="form-group">
                <label className="form-label">Playlist Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder="My Awesome Playlist"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cover Poster</label>
                <div
                  className={`modal-dropzone ${isDragOver ? 'dragover' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('poster-file-input').click()}
                >
                  <input
                    type="file"
                    id="poster-file-input"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {posterPreview ? (
                    <img src={posterPreview} className="preview-img" alt="Poster preview" />
                  ) : (
                    <div className="modal-dropzone-content">
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}></div>
                      Drag & drop an image here, or click to browse
                      <span>If empty, a random poster will be chosen</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-btn cancel" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn confirm" disabled={!playlistName.trim()}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
