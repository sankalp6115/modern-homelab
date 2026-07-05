import React, { use, useState, useEffect, useRef } from 'react';
import { PlayerContext, PlayerProgressContext } from '../../contexts/PlayerContext';
import VoiceControl from '../shared/VoiceControl';
import Visualizer from '../shared/Visualizer';
import VolumeControl from '../shared/VolumeControl';

const PlayerControl = () => {
  const {
    songs, currentSongIndex, isPlaying, togglePlayPause,
    nextSong, prevSong, volume, setVolume,
    isShuffled, setIsShuffled,
    isLooped, setIsLooped, playbackRate, setPlaybackRate,
    parsedLyrics, currentSong
  } = use(PlayerContext);

  const {
    currentTime, duration, seek
  } = use(PlayerProgressContext);

  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const lyricsContainerRef = useRef(null);

  // Find the active lyric line
  const activeLyric = parsedLyrics.reduce((prev, curr) => {
    if (curr.time <= currentTime) return curr;
    return prev;
  }, null);

  // Auto-scroll logic
  useEffect(() => {
    if (lyricsOpen && activeLyric && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.querySelector('.lyrics-line.active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLyric, lyricsOpen]);

  const handleProgressChange = (e) => {
    seek(Number(e.target.value));
  };

  const handleVolumeChange = (e) => {
    setVolume(Number(e.target.value));
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
  };

  const currentPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="container">
      <div className="player">
        <div className="albumArt_and_songInfo">
          <div className="player-album-art">
            <img src={currentSong?.albumArt} alt="ui" id="player-album-art-img" />
          </div>
          <div className="player-song-info">
            <div className="player-song-title" id="songTitle">
              {currentSong?.title || 'Song Title'}
            </div>
            <div className="player-artist" id="songArtist">
              {currentSong?.artists?.join(', ') || 'Artist Name'}
            </div>
          </div>
        </div>

        <div className="controls_and_progress">
          <div className="controls">
            <VoiceControl />
            <button type="button"
              className={`control_button ${isLooped ? "activeShuffle" : "inactiveShuffle"}`}
              onClick={() => setIsLooped(!isLooped)}
              id="repeatBtn"
            />
            <button type="button" className="control_button" id="prevBtn" onClick={prevSong}>
              <img src="/assets/images/ui/previous.png" alt="back" />
            </button>
            <button type="button" className="control_button" id="playPauseBtn" onClick={togglePlayPause}>
              <img
                src={isPlaying ? "/assets/images/ui/pause.png" : "/assets/images/ui/play.png"}
                id="play-pause-image"
                alt="start-stop"
              />
            </button>
            <button type="button" className="control_button" id="nextBtn" onClick={nextSong}>
              <img src="/assets/images/ui/next.png" alt="next" />
            </button>
            <button type="button"
              className={`control_button shuffleBtn ${isShuffled ? "active-shuffle" : ""}`}
              id="shuffleBtn"
              onClick={() => setIsShuffled(!isShuffled)}
            >
              <img src="/assets/images/ui/shuffle-enabled.png" alt="shuffle" />
            </button>

            <button type="button" className="lyrics-open" onClick={() => setLyricsOpen(!lyricsOpen)}>
              <img
                src="/assets/images/ui/menu_open.png"
                alt="lyrics"
                className="lyric-open-img"
                style={{ transform: lyricsOpen ? "rotate(0deg)" : "rotate(90deg)", filter: lyricsOpen ? 'none' : 'grayscale(100%)' }}
              />
            </button>
          </div>

          <Visualizer />

          <div className="progress-bar">
            {/* Native hidden range fallback */}
            <input
              type="range"
              id="progressBar"
              className="progressBar"
              value={duration ? currentTime : 0}
              max={duration || 100}
              step="0.1"
              onChange={handleProgressChange}
            />
          </div>
          <div
            className="progress-container"
            id="progress-container"
            role="slider"
            aria-label="Playback progress"
            aria-valuenow={currentTime}
            aria-valuemin={0}
            aria-valuemax={duration || 100}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                seek(Math.min(duration, currentTime + 5));
              } else if (e.key === "ArrowLeft") {
                seek(Math.max(0, currentTime - 5));
              }
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              seek(ratio * duration);
            }}
          >
            <span id="elapsed_time" className="elapsed_time time">{formatTime(currentTime)}</span>
            <div className="progress-bar" id="progress-bar" style={{ width: `${currentPct}%` }}></div>
            <img
              src="/assets/images/icons/progress-indicator.gif"
              alt="Indicator"
              className="progress-indicator"
              id="progress-indicator"
              style={{ left: `${currentPct}%` }}
            />
            <span id="total_time" className="total_time time">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-right-container">
          <div className="volume-control">
            <VolumeControl />
          </div>
          <img src="/assets/images/icons/side_cartoon.gif" className="side_cartoon" alt="cartoon" />
        </div>

        <div className="active-lyric-line">{activeLyric?.text || ""}</div>
        <div className="lyric-open-tooltip">Open Lyrics</div>
      </div>

      {lyricsOpen && (
        <div id="lyrics-container" style={{ display: 'block' }} ref={lyricsContainerRef} role="region" aria-label="Lyrics display">
          {parsedLyrics.length > 0 ? (
            parsedLyrics.map((line) => (
              <div
                key={line.time}
                className={`lyrics-line ${activeLyric === line ? 'active' : ''}`}
                onClick={() => seek(line.time)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    seek(line.time);
                  }
                }}
                style={{ cursor: 'pointer', padding: '10px', transition: '0.3s' }}
                role="button"
                tabIndex={0}
              >
                {line.text}
              </div>
            ))
          ) : (
            <div className="no-lyrics" style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>No lyrics found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerControl;
