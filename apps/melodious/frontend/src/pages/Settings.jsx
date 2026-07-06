import React, { use, useEffect, useState } from 'react';
import { PlayerContext } from '../contexts/PlayerContext';
import '../styles/Settings.css';

const Settings = () => {
  const { setPlaybackRate, playbackRate, isOnekoEnabled, setIsOnekoEnabled } = use(PlayerContext);
  const [isSpeedEnabled, setIsSpeedEnabled] = useState(false);

  // Broadcast Channel for communication with main music player (mimicking legacy broadcast setup if needed, 
  // though Context is better within the same app, I'll keep the logic for compatibility if other tabs open)
  useEffect(() => {
    const channel = new BroadcastChannel("music_channel");

    channel.onmessage = (event) => {
      const { action, value } = event.data;
      if (action === "toggleSpeedControl") setIsSpeedEnabled(value);
    };

    return () => channel.close();
  }, []);

  const toggleOneko = () => {
    const newVal = !isOnekoEnabled;
    setIsOnekoEnabled(newVal);
    const channel = new BroadcastChannel("music_channel");
    channel.postMessage({ action: "toggleOneko", value: newVal });
    channel.close();
  };


  return (
    <section className="settings-page">
      <h1 className="settings-title">Music Player Settings</h1>


      <div className="setting-card row-layout">
        <span className="setting-label">Oneko Cat:</span>
        <button
          type="button"
          onClick={toggleOneko}
          className={`setting-btn ${isOnekoEnabled ? 'setting-btn-danger' : 'setting-btn-primary'}`}
        >
          {isOnekoEnabled ? 'Disable Oneko' : 'Enable Oneko'}
        </button>
      </div>
    </section>
  );
};

export default Settings;
