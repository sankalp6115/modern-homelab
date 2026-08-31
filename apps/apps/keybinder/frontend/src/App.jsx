import React, { useState, useEffect, useRef } from 'react';
import './styles/style.css';

const Keybinder = () => {
  const videoRef = useRef(null);
  const viewportRef = useRef(null);
  const [status, setStatus] = useState('Connecting...');
  const [isConnected, setIsConnected] = useState(false);
  const [keyDisplay, setKeyDisplay] = useState('READY');

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/keybinder/ws`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    const sendSignaling = (data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
      }
    };

    const sendInput = (data) => {
      if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
        dataChannelRef.current.send(JSON.stringify(data));
      } else {
        sendSignaling(data);
      }
    };

    const startWebRTC = async () => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      // Request video track
      pc.addTransceiver('video', { direction: 'recvonly' });

      // Setup Data Channel
      const dataChannel = pc.createDataChannel('input');
      dataChannelRef.current = dataChannel;
      dataChannel.onopen = () => console.log('DataChannel open');

      // Handle incoming track
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          video.srcObject = event.streams[0];
        } else {
          console.log('Creating new MediaStream for track');
          video.srcObject = new MediaStream([event.track]);
        }
        setIsConnected(true);
        setStatus('Live');
        video.play().catch((e) => console.log('Auto-play blocked:', e));
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          console.log('ICE gathering complete, sending offer');
          sendSignaling({
            type: 'offer',
            sdp: pc.localDescription.sdp,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
    };

    socket.onopen = () => {
      console.log('Signaling channel connected');
      startWebRTC();
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'answer' && pcRef.current) {
        console.log('Received SDP Answer');
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(message));
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      setStatus('Disconnected');
    };

    // Keyboard listeners
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      setKeyDisplay(e.code.replace('Key', ''));
      sendInput({ action: 'keydown', key: e.code });
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e) => {
      sendInput({ action: 'keyup', key: e.code });
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Mouse listeners
    const getMousePos = (e) => {
      const rect = video.getBoundingClientRect();
      const scaleX = video.videoWidth / rect.width;
      const scaleY = video.videoHeight / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    let lastMouseMove = 0;
    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastMouseMove < 10) return; // ~100Hz throttle
      lastMouseMove = now;
      const pos = getMousePos(e);
      sendInput({ action: 'mousemove', x: pos.x, y: pos.y });
    };

    const handleMouseDown = (e) => {
      sendInput({ action: 'mousedown', button: e.button });
    };

    const handleMouseUp = (e) => {
      sendInput({ action: 'mouseup', button: e.button });
    };

    const handleWheel = (e) => {
      sendInput({ action: 'scroll', delta: e.deltaY > 0 ? -1 : 1 });
      e.preventDefault();
    };

    const handleContextMenu = (e) => e.preventDefault();

    video.addEventListener('mousemove', handleMouseMove);
    video.addEventListener('mousedown', handleMouseDown);
    video.addEventListener('mouseup', handleMouseUp);
    video.addEventListener('wheel', handleWheel, { passive: false });
    video.addEventListener('contextmenu', handleContextMenu);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);

      if (video) {
        video.removeEventListener('mousemove', handleMouseMove);
        video.removeEventListener('mousedown', handleMouseDown);
        video.removeEventListener('mouseup', handleMouseUp);
        video.removeEventListener('wheel', handleWheel);
        video.removeEventListener('contextmenu', handleContextMenu);
      }

      if (socket) socket.close();
      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  const toggleFullscreen = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (!document.fullscreenElement) {
      viewport.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="keybinder-app">
      <div className="header">
        <h1>
          Keybinder Pro <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>WEBRTC</span>
        </h1>
        <div className="controls">
          <button onClick={toggleFullscreen}>Fullscreen</button>
          <div className={`status-badge ${isConnected ? 'connected' : ''}`}>
            <div className="status-dot"></div>
            <span>{status}</span>
          </div>
        </div>
      </div>

      <div className="viewport-container" ref={viewportRef}>
        <video ref={videoRef} id="remoteVideo" autoPlay playsInline muted></video>
        <div className="overlay">
          <div className="key-info">{keyDisplay}</div>
        </div>
      </div>
    </div>
  );
};

export default Keybinder;
