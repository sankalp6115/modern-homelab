import React, { use } from 'react';
import { PlayerContext } from '../../contexts/PlayerContext';

const RightPanel = () => {
  const { currentSongIndex, getNextSongInfo, activeQueue, currentSong, songs } = use(PlayerContext);

  const nextSong = getNextSongInfo();

  return (
    <aside className="right-panel">
      <section className="playlist_poster">
        <div className="playlist-info">
          <span className="playlist-title">Urban Rock</span>
          <span className="playlist-owner"></span>
          <span className="playlist-length">{(activeQueue && activeQueue.length > 0) ? activeQueue.length : (songs?.length || 0)} Songs</span>
        </div>
      </section>

      <div className="side-menu">
        <img
          src={currentSong?.albumArt || "/assets/playlist-posters/playlist-poster2.jpg"} alt="Current Album Art" id="rightAlbumArt"
        />
        <div className="song-info">
          <div className="song-title">{currentSong?.title || "No Song Selected"}</div>
          <div className="artist-name">{currentSong?.artists?.join(', ') || "Unknown Artist"}</div>
        </div>

        <div className="nextSong">
          <img
            src={nextSong?.albumArt || "/assets/images/backgrounds/playlist-poster.jpg1"}
            className="nextSongAlbumArt"
            alt="Next Album Art"
          />
          <div className="nextSongText">
            <div className="nextSongTitle">{nextSong?.title || "No Upcoming Song"}</div>
            <span>Upcoming</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightPanel;
