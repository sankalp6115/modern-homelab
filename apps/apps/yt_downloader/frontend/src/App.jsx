import { useState, useEffect } from 'react';
import { api } from './api/api.js';
import Header from './components/Header.jsx';
import Tabs from './components/Tabs.jsx';
import BatchEnqueue from './components/BatchEnqueue.jsx';
import VideoAnalyzer from './components/VideoAnalyzer.jsx';
import Queue from './components/Queue.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import './styles/style.css';

function Downloader() {
  const [activeTab, setActiveTab] = useState('batch');
  const [queue, setQueue] = useState([]);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const fetchQueue = async () => {
    try {
      const data = await api.getQueue();
      setQueue(data.queue || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="yt-downloader-app">
      <div className="container">
        <Header />

        <div className="glass-card">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {activeTab === 'batch' ? (
            <BatchEnqueue fetchQueue={fetchQueue} addToast={addToast} />
          ) : (
            <VideoAnalyzer fetchQueue={fetchQueue} addToast={addToast} />
          )}
        </div>

        <Queue
          queue={queue}
          fetchQueue={fetchQueue}
          addToast={addToast}
        />
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default Downloader;