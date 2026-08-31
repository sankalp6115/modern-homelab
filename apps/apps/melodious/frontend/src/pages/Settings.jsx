import React, { use, useEffect, useState } from 'react';
import { PlayerContext } from '../contexts/PlayerContext';
import '../styles/Settings.css';
import {buildApiUrl} from '../utils/api';

const Settings = () => {
  const { setPlaybackRate, playbackRate, isOnekoEnabled, setIsOnekoEnabled, apiBase, updateApiBase, wallpaper, updateWallpaper } = use(PlayerContext);
  const [isSpeedEnabled, setIsSpeedEnabled] = useState(false);
  const [wallpaperArray, setWallpaperArray] = useState([]);
  const [backendIp, setBackendIp] = useState(apiBase || '');
  
  useEffect(() => {
    const channel = new BroadcastChannel("music_channel");
    channel.onmessage = (event) => {
      const { action, value } = event.data;
      if (action === "toggleSpeedControl") setIsSpeedEnabled(value);
    };

    return () => channel.close();
  }, []);

  useEffect(() => {
    setBackendIp(apiBase || '');
  }, [apiBase]);

  useEffect(() => {
    const wallpaper_api = async () => {
      try {
        const data = await fetch(buildApiUrl('/api/wallpaper'));
        const wallpaperData = await data.json();
        setWallpaperArray(wallpaperData);
      } catch (err) {
        console.error('Failed to fetch wallpapers:', err);
      }
    }
    wallpaper_api();
  }, [apiBase])

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

      <div className="settings-card row-layout">
        <span className="backend_ip setting-label">Backend IP:</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            name="backend_ip"
            id="backend_ip"
            className='setting-input'
            value={backendIp}
            onChange={(e) => setBackendIp(e.target.value)}
            placeholder="http://localhost:8000"
          />
          <button type="button" className="setting-btn setting-btn-primary" onClick={() => updateApiBase(backendIp)}>
            Apply
          </button>
        </div>
      </div>

      <div className="settings-card row-layout">
        <span className="setting-label">Wallpaper</span>
        <div className="setting-slider">
          {wallpaperArray.map((item, index) => {
            const imgUrl = buildApiUrl(`/api/wallpaper/${item}`);
            return (
              <img
                src={imgUrl}
                key={index}
                alt={item}
                className={`setting-wallpaper ${wallpaper === imgUrl ? 'active-wallpaper' : ''}`}
                onClick={() => updateWallpaper(imgUrl)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Settings;
