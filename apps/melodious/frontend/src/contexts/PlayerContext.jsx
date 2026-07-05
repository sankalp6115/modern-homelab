import React, { createContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';
import { getAssetUrl } from '../utils/assets';
import { backend, port } from '../backend_url';


export const PlayerContext = createContext();
export const PlayerProgressContext = createContext();

const parseLyrics = (text) => {
  if (!text) return [];
  return text.split("\n").map(line => {
    const match = line.match(/^\[(\d+):(\d+)\.(\d+)\](.*)/);
    if (match) return {
      time: parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / 100,
      text: match[4].trim()
    };
    return null;
  }).filter(l => l);
};

export const PlayerProvider = ({ children }) => {
  const [songs, setSongs] = useState([]);
  const [lyrics, setLyrics] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(() => {
    try {
      const saved = localStorage.getItem("melodious_is_shuffled:v1");
      return saved !== null ? JSON.parse(saved) : false;
    } catch { return false; }
  });
  const [isLooped, setIsLooped] = useState(() => {
    try {
      const saved = localStorage.getItem("melodious_is_looped:v1");
      return saved !== null ? JSON.parse(saved) : false;
    } catch { return false; }
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("melodious_volume:v1");
    return saved !== null ? Number(saved) : 40;
  });
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(() => {
    const saved = localStorage.getItem("melodious_current_time:v1");
    return saved !== null ? Number(saved) : 0;
  });
  const [duration, setDuration] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isOnekoEnabled, setIsOnekoEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("melodious_is_oneko_enabled:v1");
      return saved !== null ? JSON.parse(saved) : true;
    } catch { return true; }
  });
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    localStorage.setItem("melodious_is_oneko_enabled:v1", JSON.stringify(isOnekoEnabled));
  }, [isOnekoEnabled]);
  const [recentSongIds, setRecentSongIds] = useState(() => {
    try {
      const saved = localStorage.getItem("melodious_recent_songs:v1");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [maxRecents, setMaxRecents] = useState(() => {
    const saved = localStorage.getItem("melodious_max_recents:v1");
    return saved ? Number(saved) : 20;
  });

  useEffect(() => {
    localStorage.setItem("melodious_recent_songs:v1", JSON.stringify(recentSongIds));
  }, [recentSongIds]);

  useEffect(() => {
    localStorage.setItem("melodious_max_recents:v1", maxRecents.toString());
  }, [maxRecents]);

  // New Shuffle State
  const [shuffledIndices, setShuffledIndices] = useState([]);
  const [shufflePointer, setShufflePointer] = useState(0);

  // Context-Based Playback (Playlist/Artist specific)
  const [activeQueue, setActiveQueue] = useState([]);

  useEffect(() => {
    const channel = new BroadcastChannel("music_channel");
    channel.onmessage = (event) => {
      const { action, value } = event.data;
      if (action === "toggleOneko") setIsOnekoEnabled(value);
    };
    return () => channel.close();
  }, []);

  const audioRef = useRef(null);

  const [playlists, setPlaylists] = useState([]);

  const refetchPlaylists = React.useCallback(async () => {
    const BACKEND_HOST = backend || window.location.hostname;
    const PORT = port || "8000";
    const BACKEND = `http://${BACKEND_HOST}:${PORT}`;

    try {
      const res = await fetch(`${BACKEND}/api/playlists`);
      const data = await res.json();
      setPlaylists(data);
    } catch (err) {
      console.error("Failed to fetch playlists:", err);
    }
  }, []);

  const refetchSongs = React.useCallback(async () => {
    // Derive backend host dynamically
    const BACKEND_HOST = backend || window.location.hostname;
    const PORT = port || "8000";
    const BACKEND = `http://${BACKEND_HOST}:${PORT}`;
    const API_BASE = `${BACKEND}/api`;
    const DEFAULT_ART = `/assets/album-arts/song-icon5.png`;

    try {
      const [songsRes, lyricsRes] = await Promise.all([
        fetch(`${API_BASE}/songs`),
        fetch(`${API_BASE}/lyrics`)
      ]);
      let songsData = await songsRes.json();
      const lyricsData = await lyricsRes.json();

      songsData = songsData.map(song => ({
        ...song,
        file: `${BACKEND}/api/songs/stream/${encodeURIComponent(song.file)}`,
        albumArt: getAssetUrl(song.albumArt) || DEFAULT_ART,
        artists: Array.isArray(song.artists) ? song.artists : (song.artists ? [song.artists] : []),
      }));

      setSongs(songsData);
      setLyrics(lyricsData);
    } catch (err) {
      console.error("API load failed:", err);
    }
  }, []);

  useEffect(() => {
    refetchSongs();
    refetchPlaylists();
  }, [refetchSongs, refetchPlaylists]);

  // Persist basic settings
  useEffect(() => {
    localStorage.setItem("melodious_is_shuffled:v1", JSON.stringify(isShuffled));
    localStorage.setItem("melodious_is_looped:v1", JSON.stringify(isLooped));
    localStorage.setItem("melodious_volume:v1", volume.toString());
  }, [isShuffled, isLooped, volume]);

  // Persist current song ID and time
  useEffect(() => {
    if (!isRestored) return;
    const queue = activeQueue.length > 0 ? activeQueue : songs;
    if (queue.length > 0 && queue[currentSongIndex]) {
      localStorage.setItem("melodious_current_song_id:v1", queue[currentSongIndex].id.toString());
    }
  }, [currentSongIndex, songs, activeQueue, isRestored]);

  useEffect(() => {
    if (!isRestored) return;
    localStorage.setItem("melodious_current_time:v1", currentTime.toString());
  }, [currentTime, isRestored]);

  // Reset time when the song ID changes
  const prevSongIndex = useRef(currentSongIndex);
  useEffect(() => {
    if (isRestored && prevSongIndex.current !== currentSongIndex) {
      setCurrentTime(0);
      localStorage.setItem("melodious_current_time:v1", "0");
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
    prevSongIndex.current = currentSongIndex;
  }, [currentSongIndex, isRestored]);

  // Restore session
  useEffect(() => {
    if (songs.length > 0 && !isRestored) {
      const savedId = localStorage.getItem("melodious_current_song_id:v1");
      const savedTime = localStorage.getItem("melodious_current_time:v1");

      if (savedId) {
        const index = songs.findIndex(s => String(s.id) === String(savedId));
        if (index !== -1) {
          setCurrentSongIndex(index);
          if (savedTime) {
            // We set the time in state, and we'll apply it to the audio element once it's ready
            setCurrentTime(Number(savedTime));
          }
        }
      }
      setIsRestored(true);
    }
  }, [songs, isRestored]);

  // Shuffle Logic
  useEffect(() => {
    if (isShuffled && songs.length > 0) {
      const indices = Array.from({ length: songs.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setShuffledIndices(indices);
      const currentPos = indices.indexOf(currentSongIndex);
      setShufflePointer(currentPos !== -1 ? currentPos : 0);
    } else {
      setShuffledIndices([]);
    }
  }, [isShuffled, songs.length]);

  // Keep shuffle pointer in sync with current index
  useEffect(() => {
    if (isShuffled && shuffledIndices.length > 0) {
      const pos = shuffledIndices.indexOf(currentSongIndex);
      if (pos !== -1 && pos !== shufflePointer) {
        setShufflePointer(pos);
      }
    }
  }, [currentSongIndex, shuffledIndices, isShuffled]);

  // Search logic
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const fuseOptions = {
      threshold: 0.4,
      keys: ["title", "artists", "album", "genre"],
    };
    const fuse = new Fuse(songs, fuseOptions);
    const results = fuse.search(searchQuery);
    setSearchResults(results.map(r => r.item.id));
  }, [searchQuery, songs]);

  const currentSong = activeQueue.length > 0 ? activeQueue[currentSongIndex] : songs[currentSongIndex];

  const addToRecents = useCallback((songId) => {
    setRecentSongIds(prev => {
      const filtered = prev.filter(id => String(id) !== String(songId));
      const updated = [songId, ...filtered];
      return updated.slice(0, maxRecents);
    });
  }, [maxRecents]);

  const playSong = useCallback((index, queue = null, isFromRecents = false) => {
    const targetQueue = queue || (activeQueue.length > 0 ? activeQueue : songs);
    const song = targetQueue[index];

    if (song && !isFromRecents) {
      addToRecents(song.id);
    }

    if (queue) {
      setActiveQueue(queue);
    }
    setCurrentSongIndex(index);
    setCurrentTime(0);
    localStorage.setItem("melodious_current_time:v1", "0");
    if (audioRef.current) audioRef.current.currentTime = 0;

    if (isShuffled && shuffledIndices.length > 0) {
      const pos = shuffledIndices.indexOf(index);
      if (pos !== -1) setShufflePointer(pos);
    }
    setIsPlaying(true);
  }, [activeQueue, songs, addToRecents, isShuffled, shuffledIndices]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    setIsPlaying(prev => {
      if (prev) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => { });
      }
      return !prev;
    });
  }, []);

  const nextSong = useCallback(() => {
    const queue = activeQueue.length > 0 ? activeQueue : songs;
    if (queue.length === 0) return;

    setCurrentTime(0);
    localStorage.setItem("melodious_current_time:v1", "0");
    if (audioRef.current) audioRef.current.currentTime = 0;

    if (isShuffled && shuffledIndices.length > 0) {
      const nextPointer = (shufflePointer + 1) % shuffledIndices.length;
      setShufflePointer(nextPointer);
      setCurrentSongIndex(shuffledIndices[nextPointer]);
    } else {
      setCurrentSongIndex((currentSongIndex + 1) % queue.length);
    }
    setIsPlaying(true);
  }, [activeQueue, songs, isShuffled, shuffledIndices, shufflePointer, currentSongIndex]);

  const prevSong = useCallback(() => {
    const queue = activeQueue.length > 0 ? activeQueue : songs;
    if (queue.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    setCurrentTime(0);
    localStorage.setItem("melodious_current_time:v1", "0");
    if (audioRef.current) audioRef.current.currentTime = 0;

    if (isShuffled && shuffledIndices.length > 0) {
      const prevPointer = (shufflePointer - 1 + shuffledIndices.length) % shuffledIndices.length;
      setShufflePointer(prevPointer);
      setCurrentSongIndex(shuffledIndices[prevPointer]);
    } else {
      setCurrentSongIndex((currentSongIndex - 1 + queue.length) % queue.length);
    }
    setIsPlaying(true);
  }, [activeQueue, songs, isShuffled, shuffledIndices, shufflePointer, currentSongIndex]);

  const addToQueueNext = useCallback((song) => {
    const queue = activeQueue.length > 0 ? activeQueue : songs;
    const newQueue = [...queue];
    newQueue.splice(currentSongIndex + 1, 0, song);
    setActiveQueue(newQueue);
    // console.log(activeQueue);
  }, [activeQueue, songs, currentSongIndex]);

  const addToQueueLast = useCallback((song) => {
    const queue = activeQueue.length > 0 ? activeQueue : songs;
    setActiveQueue([...queue, song]);
    // console.log(activeQueue);
  }, [activeQueue, songs]);

  // System controls
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => {
      togglePlayPause();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      togglePlayPause();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      prevSong();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      nextSong();
    });
  }

  // Helper for UI to know what's truly next
  const getNextSongInfo = useCallback(() => {
    const queue = activeQueue.length > 0 ? activeQueue : songs;
    if (queue.length === 0) return null;
    if (isShuffled && shuffledIndices.length > 0) {
      const nextPointer = (shufflePointer + 1) % shuffledIndices.length;
      return queue[shuffledIndices[nextPointer]];
    }
    return queue[(currentSongIndex + 1) % queue.length];
  }, [activeQueue, songs, isShuffled, shuffledIndices, shufflePointer, currentSongIndex]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const seek = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Sync to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100 * 0.7;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.loop = isLooped;
    }
  }, [volume, playbackRate, isLooped]);

  // Ensure play is reliably called on song switches so WebAudio context can resume naturally
  useEffect(() => {
    if (audioRef.current && (activeQueue.length > 0 || songs.length > 0)) {
      // If we just restored, apply the saved time once the audio element is ready for this song
      if (isRestored && currentTime > 0 && audioRef.current.currentTime === 0) {
        audioRef.current.currentTime = currentTime;
      }

      if (isPlaying) {
        // Small timeout to allow src to be fully patched in the DOM before playing
        const t = setTimeout(() => {
          if (audioRef.current) audioRef.current.play().catch(() => { });
        }, 50);
        return () => clearTimeout(t);
      }
    }
  }, [currentSongIndex, isPlaying, activeQueue, songs, isRestored]);

  const [parsedLyrics, setParsedLyrics] = useState([]);

  useEffect(() => {
    if (songs.length === 0) return;
    const song = songs[currentSongIndex];
    const songLyrics = lyrics.find((l) => String(l.song_id) === String(song.id));
    if (songLyrics) {
      setParsedLyrics(parseLyrics(songLyrics.lyrics || songLyrics.content));
    } else {
      setParsedLyrics([]);
    }
  }, [currentSongIndex, songs, lyrics]);

  const playerContextValue = useMemo(() => ({
    songs, activeQueue, currentSong, lyrics, parsedLyrics,
    currentSongIndex, isPlaying, isShuffled, isLooped, volume, playbackRate,
    searchQuery, setSearchQuery, searchResults, isOnekoEnabled, setIsOnekoEnabled,
    recentSongIds, maxRecents, setMaxRecents,
    playlists, refetchPlaylists,
    getNextSongInfo,
    setIsShuffled, setIsLooped, setVolume, setPlaybackRate, setActiveQueue,
    playSong, togglePlayPause, nextSong, prevSong,
    addToQueueNext, addToQueueLast,
    audioRef, refetchSongs
  }), [
    songs, activeQueue, currentSong, lyrics, parsedLyrics,
    currentSongIndex, isPlaying, isShuffled, isLooped, volume, playbackRate,
    searchQuery, searchResults, isOnekoEnabled,
    recentSongIds, maxRecents,
    playlists, refetchPlaylists,
    getNextSongInfo,
    playSong, togglePlayPause, nextSong, prevSong,
    addToQueueNext, addToQueueLast,
    refetchSongs
  ]);

  const playerProgressContextValue = useMemo(() => ({
    currentTime, duration, seek
  }), [currentTime, duration, seek]);

  return (
    <PlayerContext.Provider value={playerContextValue}>
      <PlayerProgressContext.Provider value={playerProgressContextValue}>
        {children}
        {songs.length > 0 && (
          <audio
            ref={audioRef}
            src={activeQueue[currentSongIndex]?.file || songs[currentSongIndex]?.file}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => {
              if (!isLooped) nextSong();
            }}
            autoPlay={isPlaying}
            crossOrigin="anonymous"
          />
        )}
      </PlayerProgressContext.Provider>
    </PlayerContext.Provider>
  );
};