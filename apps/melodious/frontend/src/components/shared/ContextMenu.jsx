import React, { use, useState, useEffect } from 'react';
import { PlayerContext } from '../../contexts/PlayerContext';
import "../../styles/ContextMenu.css";

const ContextMenu = () => {
    const {
        songs,
        playlists,
        refetchPlaylists,
        refetchSongs,
        playSong,
        addToQueueNext,
        addToQueueLast
    } = use(PlayerContext);

    const [menuData, setMenuData] = useState({
        visible: false,
        type: null,
        x: 0,
        y: 0,
        song: null,
        inPlaylistId: null,
        playlistId: null,
        playlistName: null
    });

    const [deleteModalState, setDeleteModalState] = useState({
        isOpen: false,
        step: 1, // 1 or 2
        song: null
    });

    useEffect(() => {
        const handleContextMenu = (e) => {
            const songRow = e.target.closest('[data-song-id]');
            const playlistCard = e.target.closest('[data-playlist-id]');

            if (songRow) {
                e.preventDefault();
                const songId = songRow.getAttribute('data-song-id');
                const song = songs.find(s => String(s.id) === String(songId));
                const inPlaylistId = songRow.getAttribute('data-in-playlist-id');

                if (song) {
                    setMenuData({
                        visible: true,
                        type: 'song',
                        x: e.clientX,
                        y: e.clientY,
                        song: song,
                        inPlaylistId: inPlaylistId
                    });
                }
            } else if (playlistCard) {
                e.preventDefault();
                const playlistId = playlistCard.getAttribute('data-playlist-id');
                const playlistName = playlistCard.getAttribute('data-playlist-name');

                setMenuData({
                    visible: true,
                    type: 'playlist',
                    x: e.clientX,
                    y: e.clientY,
                    playlistId: playlistId,
                    playlistName: playlistName
                });
            } else {
                // Close menu if clicked elsewhere
                setMenuData(prev => ({ ...prev, visible: false }));
            }
        };

        const handleClick = (e) => {
            // Close menu on normal clicks, unless clicking inside the menu or submenu
            if (!e.target.closest('.context-menu-container')) {
                setMenuData(prev => ({ ...prev, visible: false }));
            }
        };

        window.addEventListener("contextmenu", handleContextMenu);
        window.addEventListener("click", handleClick);

        return () => {
            window.removeEventListener("contextmenu", handleContextMenu);
            window.removeEventListener("click", handleClick);
        };
    }, [songs]);

    const handleToggleFavorite = async () => {
        if (!menuData.song) return;
        const songId = menuData.song.id;

        try {
            const res = await fetch(`/api/songs/${songId}/favorite`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error("Failed to toggle favorite");
            await refetchSongs();
        } catch (err) {
            console.error(err);
            alert("Failed to toggle favorite: " + err.message);
        }
        setMenuData(prev => ({ ...prev, visible: false }));
    };

    const handleAddToPlaylist = async (playlistId) => {
        if (!menuData.song) return;
        const songId = menuData.song.id;

        const formData = new FormData();
        formData.append("song_id", songId);

        try {
            const res = await fetch(`/api/playlists/${playlistId}/songs`, {
                method: 'POST',
                body: formData
            });
            if (!res.ok) throw new Error("Failed to add song to playlist");
            const data = await res.json();
            if (data.status === "already_exists") {
                alert("Song is already in this playlist");
            } else {
                window.dispatchEvent(new CustomEvent('refresh-playlist', { detail: { playlistId } }));
            }
        } catch (err) {
            console.error(err);
            alert("Failed to add song to playlist: " + err.message);
        }
        setMenuData(prev => ({ ...prev, visible: false }));
    };

    const handleRemoveFromPlaylist = async () => {
        if (!menuData.song || !menuData.inPlaylistId) return;
        const songId = menuData.song.id;
        const playlistId = menuData.inPlaylistId;

        try {
            const res = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to remove song from playlist");
            window.dispatchEvent(new CustomEvent('refresh-playlist', { detail: { playlistId } }));
        } catch (err) {
            console.error(err);
            alert("Failed to remove song from playlist: " + err.message);
        }
        setMenuData(prev => ({ ...prev, visible: false }));
    };

    const handleDeletePlaylist = async () => {
        if (!menuData.playlistId) return;
        const playlistId = menuData.playlistId;
        const playlistName = menuData.playlistName;

        if (!window.confirm(`Are you sure you want to delete the playlist "${playlistName}"?`)) {
            setMenuData(prev => ({ ...prev, visible: false }));
            return;
        }

        try {
            const res = await fetch(`/api/playlists/${playlistId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to delete playlist");
            await refetchPlaylists();
        } catch (err) {
            console.error(err);
            alert("Failed to delete playlist: " + err.message);
        }
        setMenuData(prev => ({ ...prev, visible: false }));
    };

    const openDeleteConfirmation = () => {
        if (!menuData.song) return;
        setDeleteModalState({
            isOpen: true,
            step: 1,
            song: menuData.song
        });
        setMenuData(prev => ({ ...prev, visible: false }));
    };

    const handleConfirmDeleteStep1 = () => {
        setDeleteModalState(prev => ({ ...prev, step: 2 }));
    };

    const handleConfirmDeleteStep2 = async () => {
        const song = deleteModalState.song;
        if (!song) return;

        try {
            const res = await fetch(`/api/songs/${song.id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to delete song from library");

            await refetchSongs();
            window.dispatchEvent(new CustomEvent('refresh-playlist'));
            setDeleteModalState({ isOpen: false, step: 1, song: null });
        } catch (err) {
            console.error(err);
            alert("Failed to delete song: " + err.message);
        }
    };

    const closeDeleteModal = () => {
        setDeleteModalState({ isOpen: false, step: 1, song: null });
    };

    if (!menuData.visible && !deleteModalState.isOpen) return null;

    return (
        <>
            {menuData.visible && (
                <div
                    className='context-menu-container'
                    style={{
                        top: menuData.y,
                        left: menuData.x,
                        position: 'fixed'
                    }}
                >
                    {menuData.type === 'song' ? (
                        <>
                            <div className="context-menu-header">
                                {menuData.song.title}
                            </div>
                            <span
                                className='context-menu-option'
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                    playSong(songs.indexOf(menuData.song), songs);
                                    setMenuData(prev => ({ ...prev, visible: false }));
                                }}
                            >
                                <span className="menu-icon"></span> Play Now
                            </span>
                            <span
                                className='context-menu-option'
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                    addToQueueNext(menuData.song);
                                    setMenuData(prev => ({ ...prev, visible: false }));
                                }}
                            >
                                <span className="menu-icon"></span> Play Next
                            </span>
                            <span
                                className='context-menu-option'
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                    addToQueueLast(menuData.song);
                                    setMenuData(prev => ({ ...prev, visible: false }));
                                }}
                            >
                                <span className="menu-icon"></span> Add to Queue
                            </span>

                            {/* Add to Playlist Submenu */}
                            <span className='context-menu-option has-submenu'>
                                <span className="menu-icon"></span> Add to Playlist
                                <div className="context-submenu">
                                    {playlists.map(pl => (
                                        <div
                                            key={pl.id}
                                            className="context-submenu-option"
                                            onClick={() => handleAddToPlaylist(pl.id)}
                                        >
                                            {pl.name}
                                        </div>
                                    ))}
                                    {playlists.length === 0 && (
                                        <div className="context-submenu-option disabled">No Playlists</div>
                                    )}
                                </div>
                            </span>

                            {/* Remove from Playlist (if applicable) */}
                            {menuData.inPlaylistId && (
                                <span
                                    className='context-menu-option'
                                    role="button"
                                    tabIndex={0}
                                    onClick={handleRemoveFromPlaylist}
                                    style={{ color: '#ffb199' }}
                                >
                                    <span className="menu-icon"></span> Remove from Playlist
                                </span>
                            )}

                            {/* Toggle Favourite */}
                            <span
                                className='context-menu-option'
                                role="button"
                                tabIndex={0}
                                onClick={handleToggleFavorite}
                            >
                                <span className="menu-icon">
                                    {/* {menuData.song.isFavorite ? "💔" : "❤️"} */}
                                </span>
                                {menuData.song.isFavorite ? "Unfavourite" : "Favourite"}
                            </span>

                            {/* Remove from library completely */}
                            <span
                                className='context-menu-option'
                                role="button"
                                tabIndex={0}
                                onClick={openDeleteConfirmation}
                                style={{ color: '#ff4d4d', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                <span className="menu-icon">🗑️</span> Remove from Library
                            </span>
                        </>
                    ) : menuData.type === 'playlist' ? (
                        <>
                            <div className="context-menu-header">
                                {menuData.playlistName}
                            </div>
                            <span
                                className='context-menu-option'
                                role="button"
                                tabIndex={0}
                                onClick={handleDeletePlaylist}
                                style={{ color: '#ff4d4d' }}
                            >
                                <span className="menu-icon">🗑️</span> Delete Playlist
                            </span>
                        </>
                    ) : null}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {deleteModalState.isOpen && (
                <div className="modal-overlay" onClick={closeDeleteModal}>
                    <div className="modal-box delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title" style={{ color: '#ff4d4d' }}>
                                {deleteModalState.step === 1 ? "Remove from Library?" : "⚠️ CRITICAL WARNING!"}
                            </span>
                            <button type="button" className="modal-close-btn" onClick={closeDeleteModal}>&times;</button>
                        </div>

                        <div className="modal-body" style={{ color: '#eee', lineHeight: 1.6, fontSize: '0.95rem' }}>
                            {deleteModalState.step === 1 ? (
                                <div>
                                    <p style={{ marginBottom: '12px' }}>Are you sure you want to remove <strong>{deleteModalState.song?.title}</strong> from your library completely?</p>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem' }}>
                                        This action will:
                                    </p>
                                    <ul style={{ paddingLeft: '20px', marginTop: '6px', color: 'rgba(255,255,255,0.6)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <li>Permanently delete the audio file from the server.</li>
                                        <li>Remove this song from all of your playlists.</li>
                                        <li>Remove all associated lyrics and metadata.</li>
                                    </ul>
                                </div>
                            ) : (
                                <div>
                                    <p style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#ff4d4d', marginBottom: '12px' }}>
                                        THIS ACTION IS ABSOLUTELY PERMANENT!
                                    </p>
                                    <p style={{ marginBottom: '12px' }}>
                                        There is no recycle bin or undo capability. The file will be erased from disk immediately.
                                    </p>
                                    <p style={{ fontWeight: '500' }}>
                                        Are you 100% certain you want to destroy this track?
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="modal-btn cancel" onClick={closeDeleteModal}>
                                Cancel
                            </button>
                            {deleteModalState.step === 1 ? (
                                <button type="button"
                                    className="modal-btn confirm"
                                    style={{ background: '#ff4d4d', color: '#fff' }}
                                    onClick={handleConfirmDeleteStep1}
                                >
                                    Yes, Delete Song
                                </button>
                            ) : (
                                <button type="button"
                                    className="modal-btn confirm"
                                    style={{ background: '#e60000', color: '#fff', boxShadow: '0 0 15px rgba(230,0,0,0.4)' }}
                                    onClick={handleConfirmDeleteStep2}
                                >
                                    Yes, PERMANENTLY DESTROY
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ContextMenu;