import React, { useState, useEffect, useRef, use } from 'react';
import { PlayerContext } from '../../contexts/PlayerContext';

const EasterEggs = () => {
  const { setIsOnekoEnabled } = use(PlayerContext);
  const [cheatMode, setCheatMode] = useState(false);
  const sequenceRef = useRef([]);
  const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  const rainAudio = useRef(new Audio("/assets/sounds/rain.wav"));

  useEffect(() => {
    rainAudio.current.loop = true;
    rainAudio.current.volume = 0.2;

    let input = "";
    const handleKeydown = (e) => {
      // Konami detection
      sequenceRef.current = [...sequenceRef.current, e.key].slice(-10);
      if (JSON.stringify(sequenceRef.current) === JSON.stringify(konami)) {
        setCheatMode(curr => !curr);
        sequenceRef.current = [];
      }

      // Neko detection
      input += e.key;
      if (input.endsWith("neko")) {
        setIsOnekoEnabled(prev => !prev);
        input = "";
      }
      if (input.length > 10) input = input.slice(-10);
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setIsOnekoEnabled]);

  useEffect(() => {
    if (cheatMode) {
      rainAudio.current.play().catch(e => console.log("Rain sound blocked:", e));
    } else {
      rainAudio.current.pause();
      rainAudio.current.currentTime = 0;
    }
  }, [cheatMode]);

  return (
    <>
      {cheatMode && (
        <div className="cheat-code">
          <div className="cheat-code-content">
          </div>
          {/* Visual rain filter */}
          <div className="cheat-code-rain"></div>
        </div>
      )}
    </>
  );
};

export default EasterEggs;
