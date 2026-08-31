import React, { useState, useRef, useContext } from 'react';
import { parseID3 } from '../utils/id3Parser';
import { PlayerContext } from '../contexts/PlayerContext';
import {buildApiUrl} from '../utils/api';

import "../styles/upload.css";

const sanitizeFilename = (name) => {
    if (!name) return 'file';
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
};

const Upload = () => {
    const [songs, setSongs] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [toast, setToast] = useState(null);
    const fileInputRef = useRef(null);
    const { refetchSongs } = useContext(PlayerContext);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 4000);
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getAudioDuration = (file) => {
        return new Promise((resolve) => {
            const audio = new Audio();
            const objectUrl = URL.createObjectURL(file);
            audio.src = objectUrl;
            audio.onloadedmetadata = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(Math.round(audio.duration));
            };
            audio.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(0);
            };
        });
    };

    const processFiles = async (files) => {
        const audioFiles = Array.from(files).filter(file => {
            return file.type.startsWith('audio/') || file.name.endsWith('.mp3');
        });

        if (audioFiles.length === 0) {
            showToast('Please select valid MP3 or audio files.', 'error');
            return;
        }

        showToast(`Processing ${audioFiles.length} file(s)…`, 'info');

        const newPlaceholders = audioFiles.map(file => {
            const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
            return {
                id,
                fileName: file.name,
                fileSize: file.size,
                status: 'parsing',
                metadata: null,
                file: file,
                isEditing: false
            };
        });

        setSongs(prev => [...newPlaceholders, ...prev]);

        newPlaceholders.forEach(async (placeholder, index) => {
            const file = audioFiles[index];
            try {
                const metadata = await parseID3(file);

                setSongs(prev => prev.map(song => {
                    if (song.id === placeholder.id) {
                        return {
                            ...song,
                            status: 'success',
                            metadata
                        };
                    }
                    return song;
                }));
            } catch (err) {
                console.error("Failed to parse", file.name, err);
                setSongs(prev => prev.map(song => {
                    if (song.id === placeholder.id) {
                        return {
                            ...song,
                            status: 'error',
                            error: err.message || 'Parsing error'
                        };
                    }
                    return song;
                }));
            }
        });
    };

    // Toggle edit mode for a card
    const toggleEdit = (songId) => {
        setSongs(prev => prev.map(s => {
            if (s.id === songId) {
                return {
                    ...s,
                    isEditing: !s.isEditing
                };
            }
            return s;
        }));
    };

    // Handle field updates
    const handleFieldChange = (songId, field, value) => {
        setSongs(prev => prev.map(s => {
            if (s.id === songId) {
                return {
                    ...s,
                    metadata: {
                        ...s.metadata,
                        [field]: value
                    }
                };
            }
            return s;
        }));
    };

    // Handle custom album art cover uploaded on a card
    const handleArtChange = (songId, e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Revoke the old preview URL if it was a blob URL to avoid leaks
        const song = songs.find(s => s.id === songId);
        if (song?.metadata?.albumArt && song.metadata.albumArt.startsWith('blob:')) {
            URL.revokeObjectURL(song.metadata.albumArt);
        }

        const previewUrl = URL.createObjectURL(file);

        setSongs(prev => prev.map(s => {
            if (s.id === songId) {
                return {
                    ...s,
                    metadata: {
                        ...s.metadata,
                        albumArt: previewUrl,
                        albumArtBlob: file
                    }
                };
            }
            return s;
        }));
    };

    // Real upload logic calling FastAPI endpoint
    const handleUpload = async () => {
        const readySongs = songs.filter(s => s.status === 'success' || s.status === 'upload-error');
        if (readySongs.length === 0) {
            showToast('No parsed/valid songs available for upload.', 'error');
            return;
        }

        showToast(`Starting upload of ${readySongs.length} song(s)…`, 'info');


        for (const song of readySongs) {
            // Update status to uploading
            setSongs(prev => prev.map(s => {
                if (s.id === song.id) {
                    return { ...s, status: 'uploading', isEditing: false };
                }
                return s;
            }));

            try {
                // Get audio duration client-side
                const duration = await getAudioDuration(song.file);

                const formData = new FormData();
                formData.append('file', song.file);
                if (song.metadata.albumArtBlob) {
                    const ext = song.metadata.albumArtBlob.type === 'image/png' ? 'png' : 'jpg';
                    const titleStem = sanitizeFilename(song.metadata.title || 'art');
                    const artName = `${titleStem}_cover.${ext}`;
                    formData.append('art', song.metadata.albumArtBlob, artName);
                }
                formData.append('title', song.metadata.title || 'Unknown Title');
                formData.append('artists', song.metadata.artist || 'Unknown Artist');
                formData.append('album', song.metadata.album || '');
                formData.append('genre', song.metadata.genre || '');
                if (song.metadata.year) {
                    formData.append('year', parseInt(song.metadata.year, 10));
                }
                formData.append('duration', duration);

                const res = await fetch(buildApiUrl('/api/songs/upload'), {
                    method: 'POST',
                    body: formData,
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.detail || `Upload failed with status ${res.status}`);
                }

                // Success
                setSongs(prev => prev.map(s => {
                    if (s.id === song.id) {
                        return { ...s, status: 'uploaded' };
                    }
                    return s;
                }));
            } catch (err) {
                console.error("Upload error for", song.fileName, err);
                setSongs(prev => prev.map(s => {
                    if (s.id === song.id) {
                        return {
                            ...s,
                            status: 'upload-error',
                            error: err.message || 'Upload error'
                        };
                    }
                    return s;
                }));
            }
        }

        // Refetch songs library after uploads
        refetchSongs();
        showToast('Upload process completed.', 'success');
    };

    // Drag and drop event handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    };

    // Click handler to open file dialog
    const handleDropzoneClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
            // Reset input value so same file can be uploaded again
            e.target.value = '';
        }
    };

    // Remove individual card
    const removeSong = (id) => {
        setSongs(prev => {
            const toRemove = prev.find(s => s.id === id);
            // Free Blob URL to prevent memory leaks
            if (toRemove?.metadata?.albumArt) {
                URL.revokeObjectURL(toRemove.metadata.albumArt);
            }
            return prev.filter(s => s.id !== id);
        });
    };

    // Clear all parsed songs
    const clearAll = () => {
        songs.forEach(song => {
            if (song.metadata?.albumArt) {
                URL.revokeObjectURL(song.metadata.albumArt);
            }
        });
        setSongs([]);
        showToast('Cleared all parsed songs.', 'info');
    };

    const hasUploadableSongs = songs.some(s => s.status === 'success' || s.status === 'upload-error');

    return (
        <div className="upload-page-container">
            {toast && (
                <div className={`upload-toast ${toast.type}`}>
                    <div className="toast-content">
                        <span className="toast-icon">
                            {toast.type === 'success' && '✓'}
                            {toast.type === 'error' && '⚠'}
                            {toast.type === 'info' && '🛈'}
                        </span>
                        <span className="toast-msg">{toast.message}</span>
                    </div>
                </div>
            )}

            <header className="upload-header">
                <h1 className="upload-title">Expand your experience</h1>
                <p className="upload-subtitle">Drag & drop your music files to extract, inspect, and verify metadata integrity.</p>
            </header>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="audio/mp3, audio/*"
                style={{ display: 'none' }}
            />

            {/* Drag & Drop Area */}
            <div
                className={`dropzone ${isDragging ? 'dragover' : ''} ${songs.length > 0 ? 'compact' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleDropzoneClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleDropzoneClick();
                    }
                }}
            >
                <div className="dropzone-content">
                    {songs.length > 0 ? (
                        <div className="compact-text">
                            <span className="highlight-text">Drag more songs here</span> or click to add files
                        </div>
                    ) : (
                        <div className="full-text">
                            <img src="https://cdn-icons-png.flaticon.com/512/10181/10181172.png" className="uploadImg" alt="uploadimg" />
                            <h3>Drag and drop one or more audio files here</h3>
                        </div>
                    )}
                </div>
            </div>

            {/* Main List Section */}
            {songs.length > 0 && (
                <div className="songs-inspector-section">
                    <div className="inspector-controls">
                        <span className="total-badge">
                            Files: {songs.length} ({songs.filter(s => s.status === 'uploaded').length} uploaded)
                        </span>
                        <div className="control-buttons">
                            <button type="button" className="btn-secondary" onClick={clearAll}>Clear All</button>
                            <button type="button"
                                className="btn-primary"
                                onClick={handleUpload}
                                disabled={!hasUploadableSongs}
                                style={{ opacity: hasUploadableSongs ? 1 : 0.5, cursor: hasUploadableSongs ? 'pointer' : 'not-allowed' }}
                            >
                                Upload to DB
                            </button>
                        </div>
                    </div>

                    <div className="cards-scroll-container">
                        {songs.map((song) => {
                            // 1. Parsing status
                            if (song.status === 'parsing') {
                                return (
                                    <div className="metadata-card skeleton" key={song.id}>
                                        <div className="album-art-side skeleton-art"></div>
                                        <div className="metadata-details-side">
                                            <div className="skeleton-line title"></div>
                                            <div className="skeleton-line field"></div>
                                            <div className="skeleton-line field"></div>
                                            <div className="skeleton-line field"></div>
                                        </div>
                                    </div>
                                );
                            }

                            // 2. Error parsing status
                            if (song.status === 'error') {
                                return (
                                    <div className="metadata-card error-card" key={song.id}>
                                        <button type="button" className="card-remove-btn" onClick={() => removeSong(song.id)} aria-label="Remove card">×</button>
                                        <div className="album-art-side error-art">⚠</div>
                                        <div className="metadata-details-side">
                                            <h4 className="error-title">{song.fileName}</h4>
                                            <p className="error-text">Failed to parse audio file metadata.</p>
                                            <span className="file-info">{formatBytes(song.fileSize)}</span>
                                        </div>
                                    </div>
                                );
                            }

                            // 3. Success / Uploading / Uploaded status
                            const meta = song.metadata;
                            const missingFields = [];
                            if (!meta.title || meta.title === "Unknown Title") missingFields.push("Title");
                            if (!meta.artist || meta.artist === "Unknown Artist") missingFields.push("Artist");
                            if (!meta.album) missingFields.push("Album");
                            if (!meta.genre) missingFields.push("Genre");
                            if (!meta.year) missingFields.push("Year");
                            if (!meta.albumArt) missingFields.push("Album Art");

                            const isPerfect = missingFields.length === 0;

                            return (
                                <div
                                    className={`metadata-card ${song.status === 'uploading' ? 'uploading-card' :
                                        song.status === 'uploaded' ? 'uploaded-card' :
                                            isPerfect ? 'perfect-card' : 'warning-card'
                                        }`}
                                    key={song.id}
                                >
                                    <div className="card-actions">
                                        {song.status !== 'uploaded' && song.status !== 'uploading' && (
                                            <button type="button" className="card-edit-btn" onClick={() => toggleEdit(song.id)} aria-label="Edit metadata">
                                                {song.isEditing ? 'Save' : 'Edit'}
                                            </button>
                                        )}
                                        <button type="button" className="card-remove-btn" onClick={() => removeSong(song.id)} aria-label="Remove card">×</button>
                                    </div>

                                    {/* Left Side: Album Art */}
                                    <div
                                        className={`album-art-side ${song.isEditing ? 'editable-art' : ''}`}
                                        onClick={() => {
                                            if (song.isEditing) {
                                                document.getElementById(`art-input-${song.id}`).click();
                                            }
                                        }}
                                    >
                                        {meta.albumArt ? (
                                            <img src={meta.albumArt} alt="Album Art" className="album-art-img" />
                                        ) : (
                                            <div className="fallback-art">
                                                <svg className="vinyl-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                                                </svg>
                                            </div>
                                        )}
                                        {!meta.albumArt && <span className="no-art-badge">No Cover</span>}

                                        {song.isEditing && (
                                            <div className="change-art-overlay">
                                                <span>Change Cover</span>
                                            </div>
                                        )}

                                        {song.isEditing && (
                                            <input
                                                type="file"
                                                id={`art-input-${song.id}`}
                                                accept="image/*"
                                                onChange={(e) => handleArtChange(song.id, e)}
                                                style={{ display: 'none' }}
                                            />
                                        )}
                                    </div>

                                    {/* Right Side: Metadata List */}
                                    <div className="metadata-details-side">
                                        <div className="card-header-row">
                                            <h3 className="song-title-text" title={meta.title}>
                                                {meta.title}
                                            </h3>
                                            {song.status === 'uploading' ? (
                                                <span className="status-badge uploading">Uploading…</span>
                                            ) : song.status === 'uploaded' ? (
                                                <span className="status-badge uploaded"> Uploaded</span>
                                            ) : song.status === 'upload-error' ? (
                                                <span className="status-badge upload-error" title={song.error}>Upload Failed</span>
                                            ) : isPerfect ? (
                                                <span className="status-badge perfect">All Metadata</span>
                                            ) : (
                                                <span className="status-badge warning" title={`Missing: ${missingFields.join(', ')}`}>
                                                    {missingFields.length} Missing
                                                </span>
                                            )}
                                        </div>

                                        <ul className="metadata-fields-list">
                                            <li className={!meta.title || meta.title === "Unknown Title" ? "missing-field" : ""}>
                                                <span className="field-label">Title</span>
                                                {song.isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="metadata-field-input"
                                                        value={meta.title || ''}
                                                        onChange={(e) => handleFieldChange(song.id, 'title', e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="field-value">{meta.title}</span>
                                                )}
                                            </li>
                                            <li className={!meta.artist || meta.artist === "Unknown Artist" ? "missing-field" : ""}>
                                                <span className="field-label">Artist</span>
                                                {song.isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="metadata-field-input"
                                                        value={meta.artist || ''}
                                                        onChange={(e) => handleFieldChange(song.id, 'artist', e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="field-value">{meta.artist}</span>
                                                )}
                                            </li>
                                            <li className={!meta.album ? "missing-field" : ""}>
                                                <span className="field-label">Album</span>
                                                {song.isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="metadata-field-input"
                                                        value={meta.album || ''}
                                                        onChange={(e) => handleFieldChange(song.id, 'album', e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="field-value">{meta.album || <span className="empty-placeholder">Not Found</span>}</span>
                                                )}
                                            </li>
                                            <li className={!meta.genre ? "missing-field" : ""}>
                                                <span className="field-label">Genre</span>
                                                {song.isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="metadata-field-input"
                                                        value={meta.genre || ''}
                                                        onChange={(e) => handleFieldChange(song.id, 'genre', e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="field-value">{meta.genre || <span className="empty-placeholder">Not Found</span>}</span>
                                                )}
                                            </li>
                                            <li className={!meta.year ? "missing-field" : ""}>
                                                <span className="field-label">Year</span>
                                                {song.isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="metadata-field-input"
                                                        value={meta.year || ''}
                                                        onChange={(e) => handleFieldChange(song.id, 'year', e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="field-value">{meta.year || <span className="empty-placeholder">Not Found</span>}</span>
                                                )}
                                            </li>
                                        </ul>

                                        <div className="card-footer-row">
                                            <span className="file-info">{formatBytes(song.fileSize)} | {meta.hasMetadata ? "ID3 Tags Found" : "Parsed from Filename"}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Upload;