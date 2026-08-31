import React, { useState, use, useEffect, useCallback } from 'react';
import { PlayerContext } from '../../contexts/PlayerContext';

const VoiceControl = () => {
  const {
    togglePlayPause, nextSong, prevSong, volume, setVolume,
    setIsShuffled, setIsLooped, isPlaying
  } = use(PlayerContext);

  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.continuous = true;

      rec.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript
          .trim()
          .toLowerCase();
        console.log("🎙 Heard:", transcript);
        handleVoiceCommand(transcript);
      };

      rec.onend = () => {
        if (isListening) rec.start(); // Keep listening if we didn't manually stop
      };

      setRecognition(rec);
    }
  }, []);

  const handleVoiceCommand = useCallback((command) => {
    if (command.includes("play")) {
      if (!isPlaying) togglePlayPause();
    } else if (command.includes("pause") || command.includes("stop")) {
      if (isPlaying) togglePlayPause();
    } else if (command.includes("next")) {
      nextSong();
    } else if (command.includes("previous") || command.includes("back")) {
      prevSong();
    } else if (command.includes("volume up") || command.includes("louder")) {
      setVolume(Math.min(100, volume + 10));
    } else if (command.includes("volume down") || command.includes("quieter")) {
      setVolume(Math.max(0, volume - 10));
    } else if (command.includes("shuffle")) {
      setIsShuffled(true);
    } else if (command.includes("loop") || command.includes("repeat")) {
      setIsLooped(true);
    }
  }, [isPlaying, togglePlayPause, nextSong, prevSong, volume, setVolume, setIsShuffled, setIsLooped]);

  const toggleListening = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <div className={`voiceRecog ${isListening ? 'listening' : ''}`} style={{ borderRadius: 0 }}>
      <button type="button" id="voiceBtn" onClick={toggleListening}>
        <img
          src={isListening ? "/assets/images/ui/mic-on.png" : "/assets/images/ui/mic-off.png"}
          alt="Voice Control"
        />
      </button>
    </div>
  );
};

export default VoiceControl;
