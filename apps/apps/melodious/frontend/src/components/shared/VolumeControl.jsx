import React, { use, useState, useRef, useEffect } from 'react';
import { PlayerContext } from '../../contexts/PlayerContext';
import '../../styles/volumeControl.css';

const VolumeControl = () => {
  const { volume, setVolume } = use(PlayerContext);
  const [prevVolume, setPrevVolume] = useState(40);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const trackRef = useRef(null);

  // Mute / Unmute
  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume === 0 ? 40 : prevVolume);
    }
  };

  // Speaker icon based on volume level
  const getSpeakerIconPath = () => {
    if (volume === 0) return '/assets/images/ui/mute.png';
    if (volume < 30) return '/assets/images/ui/vol_low.png';
    if (volume < 70) return '/assets/images/ui/vol_med.png';
    return '/assets/images/ui/vol_high.png';
  };

  // Handle setting volume from mouse/touch event coordinates
  const updateVolumeFromEvent = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();

    // Get clientX for either mouse or touch
    let clientX;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const percentage = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
    setVolume(percentage);
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    updateVolumeFromEvent(e);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    updateVolumeFromEvent(e);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      updateVolumeFromEvent(e);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      // Prevent scrolling page while adjusting volume on touch devices
      if (e.cancelable) e.preventDefault();
      updateVolumeFromEvent(e);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  // Scroll wheel handler on the entire volume control container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault(); // Prevent page scroll
      const step = 2; // scroll step
      // deltaY < 0 is scroll up (increase volume)
      // deltaY > 0 is scroll down (decrease volume)
      if (e.deltaY < 0) {
        setVolume(v => Math.min(100, v + step));
      } else if (e.deltaY > 0) {
        setVolume(v => Math.max(0, v - step));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [setVolume]);

  return (
    <div ref={containerRef} className="volume-control-container">
      <button type="button" className="mute-toggle-btn" onClick={toggleMute} aria-label={volume === 0 ? "Unmute" : "Mute"}>
        <img src={getSpeakerIconPath()} className="speaker-icon-img" alt="Volume" />
      </button>
      <div
        ref={trackRef}
        className="volume-slider-track"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="slider"
        aria-label="Volume Slider"
        aria-valuenow={volume}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            setVolume(v => Math.min(100, v + 5));
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            setVolume(v => Math.max(0, v - 5));
          }
        }}
      >
        <div className="volume-slider-fill" style={{ width: `${volume}%` }}></div>
        <div className="volume-slider-thumb" style={{ left: `${volume}%` }}></div>
      </div>
      <span className="volume-value-display">{volume}%</span>
    </div>
  );
};

export default VolumeControl;