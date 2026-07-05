import React, { use, useEffect, useState } from 'react';
import { PlayerContext } from '../contexts/PlayerContext';
import { backend } from '../backend_url';
import '../styles/Settings.css';

const Settings = () => {
  const { setPlaybackRate, playbackRate, isOnekoEnabled, setIsOnekoEnabled } = use(PlayerContext);
  const [isSpeedEnabled, setIsSpeedEnabled] = useState(false);
  const [backendIp, setBackendIp] = useState(localStorage.getItem("backend_ip") || "");

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

  const saveBackendIp = () => {
    localStorage.setItem("backend_ip", backendIp.trim());
    window.location.reload();
  };

  return (
    <section className="settings-page">
      <h1 className="settings-title">Music Player Settings</h1>

      {/* Backend Connection Setting */}
      <div className="setting-card highlighted column-layout tight">
        <span className="setting-label">Backend IP Address / Host:</span>
        <div className="setting-input-group">
          <input
            type="text"
            className="setting-input"
            value={backendIp}
            onChange={(e) => setBackendIp(e.target.value)}
            placeholder="e.g. localhost or 192.168.1.5"
          />
          <button
            type="button"
            className="setting-btn setting-btn-primary"
            onClick={saveBackendIp}
          >
            Save IP
          </button>
        </div>
        <p className="setting-info">
          Currently active host: <strong className="active-host">{backend}</strong>.
          Leaving this field empty will fall back to the default host in <code>backend_url.js</code>.
        </p>
      </div>

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
