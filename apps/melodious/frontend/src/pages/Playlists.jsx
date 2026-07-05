import React from 'react';

const Playlists = () => {
  return (
    <section className="playlists" style={{ padding: '20px' }}>
      <h2 className="heading">Your Playlists</h2>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {["Indi Pop Music", "Rock Music", "Calm Music", "Pop Music"].map((title, idx) => (
          <div className="playlist" key={title}>
            <div className="playlist-poster"><img src={`/assets/playlist-posters/playlist-poster${idx + 1}.jpg`} alt={title} /></div>
            <div className="playlist-info">
              <span className="playlist-title">{title}</span>
            </div>
            <button type="button" className="playPauseBtn"><img src="/assets/images/ui/play.png" alt="Play" /></button>
          </div>
        ))}
      </div>

      <h2 className="heading" style={{ marginTop: '40px' }}>Popular Playlists</h2>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {["Solitude", "Study", "Gaming"].map((title, idx) => (
          <div className="playlist" key={title}>
            <div className="playlist-poster"><img src={`/assets/playlist-posters/playlist-poster${idx + 5}.jpg`} alt={title} /></div>
            <div className="playlist-info">
              <span className="playlist-title">{title}</span>
            </div>
            <button type="button" className="playPauseBtn"><img src="/assets/images/ui/play.png" alt="Play" /></button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Playlists;
