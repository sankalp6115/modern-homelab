import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PlayerProvider } from './contexts/PlayerContext';
import Layout from './components/layout/Layout';
import Oneko from './components/shared/Oneko.jsx';

// Lazy Load Pages
const Home = lazy(() => import('./pages/Home'));
const Explore = lazy(() => import('./pages/Explore'));
const Playlists = lazy(() => import('./pages/Playlists'));
const Artists = lazy(() => import('./pages/Artists'));
const Settings = lazy(() => import('./pages/Settings'));
const PlaylistDetail = lazy(() => import('./pages/PlaylistDetail'));
const ArtistDetail = lazy(() => import('./pages/ArtistDetail'));
const Recent = lazy(() => import('./pages/Recent'));
const Upload = lazy(() => import('./pages/Upload'));
const Favourites = lazy(() => import('./pages/Favourites'));

// Components
const PlayerControl = lazy(() => import('./components/player/PlayerControl'));
const EasterEggs = lazy(() => import('./components/shared/EasterEggs'));
const ContextMenu = lazy(() => import('./components/shared/ContextMenu'));

const Loading = () => <div className="loading-screen">Loading Melodious…</div>;

function App() {
  return (
    <PlayerProvider>
      <BrowserRouter>
        <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="explore" element={<Explore />} />
                <Route path="playlist/:id" element={<PlaylistDetail />} />
                <Route path="artist/:id" element={<ArtistDetail />} />
                <Route path="playlists" element={<Playlists />} />
                <Route path="artists" element={<Artists />} />
                <Route path="settings" element={<Settings />} />
                <Route path="recent" element={<Recent />} />
                <Route path="favourites" element={<Favourites />} />
                <Route path="upload" element={<Upload />} />
              </Route>
            </Routes>
            <ContextMenu />
            <PlayerControl />
            <Oneko />
            <EasterEggs />
          </Suspense>
        </div>
      </BrowserRouter>
    </PlayerProvider>
  );
}

export default App;
