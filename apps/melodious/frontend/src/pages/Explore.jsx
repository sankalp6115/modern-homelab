import React, { use, useEffect, useRef } from 'react';
import { PlayerContext } from '../contexts/PlayerContext';

const Explore = () => {
  const { songs, playSong, currentSongIndex, isPlaying, searchResults, currentSong } = use(PlayerContext);
  const containerRef = useRef(null);
  const highlightRef = useRef(null);

  useEffect(() => {
    if (searchResults.length > 0 && containerRef.current) {
      const firstMatchId = searchResults[0];
      const row = containerRef.current.querySelector(`[data-id="${firstMatchId}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [searchResults]);

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

  return (
    <div
      id="songList"
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
            <th>#</th><th></th><th>Title</th><th>Artist</th><th>Album</th><th className="table-genre-header">Genre</th><th className="table-length-header">⏱︎</th>
          </tr>
        </thead>
        <tbody>
          {songs.map((song, index) => {
            const isActive = song.id === currentSong?.id;
            return (
              <tr
                key={song.id || index}
                data-id={song.id}
                data-song-id={song.id}
                className={`row ${isActive ? 'active-row' : ''} ${searchResults.includes(song.id) ? 'searchActive' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => playSong(index, songs)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    playSong(index, songs);
                  }
                }}
                onMouseEnter={handleMouseEnterRow}
              >
                <td className="table-index">{index + 1}</td>
                <td className="table-art">
                  <img src={song.albumArt} loading="lazy" className={`album-art ${isPlaying && isActive ? 'active-album-art' : ''}`} alt="album-art" />
                </td>
                <td className="table-title">{song.title}</td>
                <td className="table-artist" > {song.artists?.join(", ") || "Unknown"}</td>
                <td className="table-album">{song.album || "—"}</td>
                <td className="table-genre">{song.genre || "—"}</td>
                <td className="table-length" > {`${Math.floor((song.duration || 0) / 60)}:${String((song.duration || 0) % 60).padStart(2, "0")}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Explore;
