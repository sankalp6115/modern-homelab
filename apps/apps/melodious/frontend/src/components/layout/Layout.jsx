import React, { useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';

// Helper component to freeze the route outlet during exit animations
const AnimatedOutlet = () => {
  const o = useOutlet();
  const [outlet] = useState(o);
  return outlet;
};

const Layout = () => {
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout-root">
      <Navbar onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <div className="whole">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main-section">
          <section className="playlist-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, scale: 1.01, y: 8, filter: 'blur(3px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.99, y: -8, filter: 'blur(3px)' }}
                transition={{ duration: 0.28, ease: [0.33, 1, 0.68, 1] }}


                style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <AnimatedOutlet />
              </motion.div>
            </AnimatePresence>
          </section>
        </main>
        <RightPanel />
      </div>
    </div>
  );
};

export default Layout;
