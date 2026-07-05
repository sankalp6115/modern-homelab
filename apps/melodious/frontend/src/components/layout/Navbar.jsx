import React, { useState, use, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PlayerContext } from '../../contexts/PlayerContext';
import VoiceControl from '../shared/VoiceControl';
import Searchbar from '../shared/Searchbar.jsx';


const Navbar = ({ onToggleSidebar }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const clickCount = useRef(0);
  const { searchQuery, setSearchQuery } = use(PlayerContext);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 400);

    return () => clearTimeout(handler);
  }, [localSearch, setSearchQuery]);

  return (
    <header className="main-header">
      <button type="button" className="burger-menu-btn" onClick={onToggleSidebar} aria-label="Toggle Menu">
        <span className="burger-bar"></span>
        <span className="burger-bar"></span>
        <span className="burger-bar"></span>
      </button>
      <div className="title">
        <span className="logo-text">Melodious</span>
      </div>

      <div className="header-right">
        {/* Insert searchbar comp here */}
        <Searchbar localSearch={localSearch} setLocalSearch={setLocalSearch} />
        <section className="profile">
          <div
            className="user-avatar"
            id="avatar-btn"
            role="button"
            tabIndex={0}
            onClick={() => setMenuOpen(!menuOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMenuOpen(!menuOpen);
              }
            }}
          >
            <img className="user-avatar" src="/assets/images/ui/user-avatar.png" alt="user-avatar" />
          </div>
          <div className="profile_menu" id="profile-menu" style={{ visibility: menuOpen ? 'visible' : 'hidden', opacity: menuOpen ? 1 : 0 }}>
            <Link to="/settings" className="profile_menu_option">Settings</Link>
          </div>
        </section>
      </div>
    </header>
  );
};

export default Navbar;
