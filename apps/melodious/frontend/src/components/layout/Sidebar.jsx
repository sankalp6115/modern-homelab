import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ isOpen, onClose }) => {
  const [greeting, setGreeting] = useState('');
  const [name, setName] = useState("Sankalp");
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Good Morning");
    else if (hour >= 12 && hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <section className={`left-section ${isOpen ? 'open' : ''}`}>
        <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Close Menu">
          &times;
        </button>
        <div className="greeting-div">
          <h1 className="greeting">{greeting} <br></br> {name}</h1>
          <span>What do you want to hear today ?</span>
        </div>

        <h4 className="left-menu-heading">Menu</h4>
        <NavLink viewTransition className="left-menu-option" to="/explore" onClick={onClose}>
          <img src="/assets/images/ui/cd.png" alt="ui" /> Explore
        </NavLink>
        <NavLink viewTransition className="left-menu-option" to="/" onClick={onClose}>
          <img src="/assets/images/ui/playlist.png" alt="ui" /> Playlists
        </NavLink>
        <NavLink viewTransition className="left-menu-option" to="/artists" onClick={onClose}>
          <img src="/assets/images/ui/mic.png" alt="ui" /> Artists
        </NavLink>

        <h4 className="left-menu-heading">Library</h4>
        <NavLink viewTransition className="left-menu-option" to="/recent" onClick={onClose}>
          <img src="/assets/images/ui/recent.png" alt="ui" /> Recent
        </NavLink>
        <NavLink viewTransition className="left-menu-option" to="/favourites" onClick={onClose}>
          <img src="/assets/images/ui/heart.png" alt="ui" /> Favourites
        </NavLink>
        <NavLink viewTransition className="left-menu-option" to="/upload" onClick={onClose}>
          <img src="/assets/images/ui/upload.png" alt="ui" /> Upload
        </NavLink>
      </section>
    </>
  );
};

export default Sidebar;
