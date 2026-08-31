import React, { useState, useEffect, useRef } from 'react';
import { Sparkline, CircularProgress } from './components/Charts';
import "./styles/style.css"

const API_BASE = '/';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0 || !bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatSpeed = (bytesPerSec) => {
  if (bytesPerSec === undefined || bytesPerSec === null) return '0 B/s';
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(1)} B/s`;
  const kb = bytesPerSec / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB/s`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB/s`;
};

const formatUptime = (seconds) => {
  if (!seconds) return '0s';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(' ');
};

// --- SVG Icons ---
const CpuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
  </svg>
);

const RamIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 19h12M6 5h12M6 9h12M6 14h12M3 2v20M21 2v20" />
  </svg>
);

const DiskIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M21 12H3M12 3v18" />
  </svg>
);

const NetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 18H7a4 4 0 0 1-4-4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a4 4 0 0 1-4 4z" />
    <path d="M7 21h10M12 18v3" />
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const NetworkScanIcon = ({ scanning }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={scanning ? "spin-animation" : ""}
    style={{ animation: scanning ? 'spin 2s linear infinite' : 'none' }}
  >
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
);

const BatteryIcon = ({ percent, plugged }) => {
  const getBatteryLevelWidth = () => {
    return Math.min(Math.max(percent / 100 * 12, 1), 12);
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="16" height="10" rx="2" ry="2" />
      <line x1="22" y1="11" x2="22" y2="13" />
      {/* Battery level fill */}
      <rect x="4" y="9" width={getBatteryLevelWidth()} height="6" fill={plugged ? "var(--accent-green)" : "currentColor"} stroke="none" />
      {plugged && <path d="M10 7l-2 4h4l-2 4" stroke="var(--accent-green)" strokeWidth="1.5" fill="none" />}
    </svg>
  );
};

const TermuxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const AppleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.84-.98 2.94.1.08.21.12.33.12.87 0 1.94-.57 2.48-1.45z" />
  </svg>
);

const LinuxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2zm1 17.93V18h-2v1.93A8.003 8.003 0 0 1 4.07 13H6v-2H4.07A8.003 8.003 0 0 1 11 4.07V6h2V4.07A8.003 8.003 0 0 1 19.93 11H18v2h1.93A8.003 8.003 0 0 1 13 19.93zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
  </svg>
);

const GenericServerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

const getOSIcon = (platformStr, hostname) => {
  const plat = platformStr?.toLowerCase() || '';
  const host = hostname?.toLowerCase() || '';
  if (plat.includes('darwin') || plat.includes('mac')) return <AppleIcon />;
  if (plat.includes('linux')) {
    // Termux typically presents as linux on Android, but hostname or architecture hints help
    if (host.includes('termux') || host.includes('android')) return <TermuxIcon />;
    return <LinuxIcon />;
  }
  return <GenericServerIcon />;
};

function Monitor() {
  const [devices, setDevices] = useState([]);
  const [selectedIp, setSelectedIp] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Maintain ref to avoid stale intervals
  const pollingRef = useRef(null);

  // 1. Fetch Discovered Devices List
  const fetchDevices = async (autoSelect = false) => {
    try {
      const res = await fetch(`${API_BASE}api/devices`);
      if (!res.ok) throw new Error("Failed to load homelab devices");
      const data = await res.json();
      setDevices(data);

      // Auto-select the first device or local device on startup
      if (autoSelect && data.length > 0) {
        // Try to find the Central node or select the first online device
        const centralNode = data.find(d => d.role === 'central');
        if (centralNode) {
          setSelectedIp(centralNode.ip);
        } else {
          setSelectedIp(data[0].ip);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to homelab central server. Make sure the server is running on this network.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch Metrics for Selected Device
  const fetchSelectedMetrics = async (ip) => {
    if (!ip) return;
    try {
      const res = await fetch(`${API_BASE}api/devices/${ip}/metrics`);
      if (res.status === 404) return;
      if (!res.ok) throw new Error("Failed to fetch device stats");
      const data = await res.json();

      if (data.current) {
        setMetrics(data.current);
      }
      if (data.history) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error("Error polling metrics:", err);
    }
  };

  // 3. Trigger manual network subnet scan
  const triggerScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch(`${API_BASE}api/scan`, { method: 'POST' });
      if (res.ok) {
        // Poll devices list every 2 seconds for a bit
        let count = 0;
        const scanPoll = setInterval(() => {
          fetchDevices();
          count++;
          if (count > 5) {
            clearInterval(scanPoll);
            setIsScanning(false);
          }
        }, 2000);
      } else {
        setIsScanning(false);
      }
    } catch (err) {
      console.error("Scan failed:", err);
      setIsScanning(false);
    }
  };

  // Setup Initial Loading
  useEffect(() => {
    fetchDevices(true);
    // Periodically update device list every 10s
    const devInterval = setInterval(() => {
      fetchDevices();
    }, 10000);
    return () => clearInterval(devInterval);
  }, []);

  // Setup Metrics Polling Loop when selection changes
  useEffect(() => {
    if (!selectedIp) return;

    // Clear previous polling
    if (pollingRef.current) clearInterval(pollingRef.current);

    // Fetch immediately
    fetchSelectedMetrics(selectedIp);

    // Poll every 3 seconds for fast-updating dashboard dials
    pollingRef.current = setInterval(() => {
      fetchSelectedMetrics(selectedIp);
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedIp]);

  // Extract history values for sparklines
  const getHistoricalValues = (keyPath) => {
    return history.map(h => {
      let val = h;
      for (const key of keyPath) {
        val = val?.[key];
      }
      return val || 0;
    });
  };

  if (isLoading) {
    return (
      <div className="monitor-app">
        <div className="fullscreen-state">
          <div className="spinner"></div>
          <p className="empty-title">Connecting to Central Server...</p>
        </div>
      </div>
    );
  }

  if (error && devices.length === 0) {
    return (
      <div className="monitor-app">
        <div className="fullscreen-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="empty-title" style={{ maxWidth: '450px', textAlign: 'center', fontSize: '1.1rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => { setIsLoading(true); setError(null); fetchDevices(true); }}>Retry Connection</button>
        </div>
      </div>
    );
  }

  const activeDevice = devices.find(d => d.ip === selectedIp);
  const isOnline = activeDevice?.status === 'online';

  return (
    <div className="monitor-app">
      <div className="app-container">
        {/* SIDEBAR: Devices List */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', color: '#070a13' }}>
              <NetIcon />
            </div>
            <div>
              <h1 className="sidebar-title">Homelab Monitor</h1>
              <p style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: '600', letterSpacing: '1px' }}>Local Network Control</p>
            </div>
          </div>

          <p className="sidebar-subtitle">Nodes Discovered</p>
          <div className="device-list">
            {devices.map((device) => (
              <div
                key={device.ip}
                className={`device-item ${device.ip === selectedIp ? 'active' : ''}`}
                onClick={() => setSelectedIp(device.ip)}
              >
                <div className="device-icon-wrapper">
                  {getOSIcon(device.platform, device.hostname)}
                </div>
                <div className="device-info-text">
                  <p className="device-name">{device.hostname}</p>
                  <p className="device-ip">{device.ip} • <span style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>{device.role}</span></p>
                </div>
                <div className={`status-dot ${device.status === 'online' ? 'online' : 'offline'}`} />
              </div>
            ))}

            {devices.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', marginTop: '20px' }}>No active devices found.</p>
            )}
          </div>

          <button
            className="btn btn-secondary btn-scan"
            onClick={triggerScan}
            disabled={isScanning}
          >
            <NetworkScanIcon scanning={isScanning} />
            {isScanning ? 'Scanning Network...' : 'Rescan Subnet'}
          </button>
        </div>

        {/* MAIN CONTENT: Live Dashboard */}
        <div className="dashboard">
          {selectedIp && activeDevice ? (
            <>
              {/* Dashboard Header */}
              <div className="dashboard-header">
                <div className="device-title-block">
                  <div style={{ color: isOnline ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    {getOSIcon(activeDevice.platform, activeDevice.hostname)}
                  </div>
                  <div>
                    <h2 className="device-large-title">{activeDevice.hostname}</h2>
                    <p style={{ color: 'var(--text-sub)', fontSize: '0.88rem', marginTop: '4px' }}>
                      {activeDevice.ip} • {activeDevice.os_name} ({activeDevice.arch})
                    </p>
                  </div>
                </div>
                <div className={`device-status-badge ${isOnline ? 'online' : 'offline'}`}>
                  <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} style={{ marginRight: '6px' }} />
                  {isOnline ? 'Online' : 'Offline'}
                </div>
              </div>

              {isOnline && metrics ? (
                <>
                  {/* METRICS GRID */}
                  <div className="metrics-grid">
                    {/* CPU Card */}
                    <div className="metric-card glass-panel">
                      <div className="metric-header">
                        <span className="metric-title"><CpuIcon /> CPU</span>
                        <span className="text-cyan" style={{ fontWeight: '600', fontSize: '0.88rem' }}>
                          {metrics.cpu.cores.length} Cores
                        </span>
                      </div>

                      <div className="gauge-chart-container">
                        <CircularProgress percent={metrics.cpu.percent} size={90} strokeWidth={8} color="#00f2fe" label="usage" />
                        <div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Load Average</p>
                          <p style={{ fontSize: '1rem', fontWeight: '700', marginTop: '4px', fontFamily: 'Space Grotesk' }}>
                            {metrics.cpu.load_avg[0].toFixed(2)} &nbsp;
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '400' }}>
                              {metrics.cpu.load_avg[1].toFixed(2)} &nbsp; {metrics.cpu.load_avg[2].toFixed(2)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="sparkline-wrapper">
                        <Sparkline data={getHistoricalValues(['cpu', 'percent'])} strokeColor="#00f2fe" gradientId="cpu-grad" />
                      </div>
                    </div>

                    {/* RAM Card */}
                    <div className="metric-card glass-panel">
                      <div className="metric-header">
                        <span className="metric-title"><RamIcon /> Memory</span>
                        <span className="text-blue" style={{ fontWeight: '600', fontSize: '0.88rem' }}>
                          {formatBytes(metrics.ram.total, 0)} Total
                        </span>
                      </div>

                      <div className="gauge-chart-container">
                        <CircularProgress percent={metrics.ram.percent} size={90} strokeWidth={8} color="#4facfe" label="RAM" />
                        <div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Used Memory</p>
                          <p style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '4px' }}>
                            {formatBytes(metrics.ram.used, 1)}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                            {formatBytes(metrics.ram.available, 1)} Available
                          </p>
                        </div>
                      </div>

                      <div className="sparkline-wrapper">
                        <Sparkline data={getHistoricalValues(['ram', 'percent'])} strokeColor="#4facfe" gradientId="ram-grad" />
                      </div>
                    </div>

                    {/* Storage Card */}
                    <div className="metric-card glass-panel">
                      <div className="metric-header">
                        <span className="metric-title"><DiskIcon /> Storage Partitions</span>
                      </div>

                      <div className="partitions-container">
                        {metrics.disks && metrics.disks.length > 0 ? (
                          metrics.disks.map((disk, idx) => (
                            <div key={idx} className="partition-row">
                              <div className="partition-meta">
                                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{disk.mountpoint}</span>
                                <span>{disk.percent}% ({formatBytes(disk.used, 1)} / {formatBytes(disk.total, 0)})</span>
                              </div>
                              <div className="partition-bar-bg">
                                <div className="partition-bar-fill" style={{
                                  width: `${disk.percent}%`,
                                  background: disk.percent > 85 ? 'var(--accent-red)' : 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))'
                                }} />
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: '20px' }}>No visible partitions.</p>
                        )}
                      </div>
                    </div>

                    {/* Network Card */}
                    <div className="metric-card glass-panel">
                      <div className="metric-header">
                        <span className="metric-title"><NetIcon /> Network IO</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                            Download
                          </span>
                          <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--accent-cyan)', fontFamily: 'Space Grotesk' }}>
                            {formatSpeed(metrics.network.rx_bytes_sec)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-blue)' }} />
                            Upload
                          </span>
                          <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--accent-blue)', fontFamily: 'Space Grotesk' }}>
                            {formatSpeed(metrics.network.tx_bytes_sec)}
                          </span>
                        </div>
                      </div>

                      <div className="sparkline-wrapper">
                        {/* Plot download speed history scaled relative to max observed value */}
                        <Sparkline
                          data={getHistoricalValues(['network', 'rx_bytes_sec'])}
                          strokeColor="#00f2fe"
                          gradientId="net-rx-grad"
                          max={Math.max(...getHistoricalValues(['network', 'rx_bytes_sec']), 1024)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM LAYER: Processes & Hardware info */}
                  <div className="details-grid">
                    {/* Top Processes Card */}
                    <div className="processes-card glass-panel">
                      <h3 className="metric-title" style={{ color: 'var(--text-main)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        Top Processes eating resources
                      </h3>

                      <div style={{ overflowX: 'auto' }}>
                        <table className="processes-table">
                          <thead>
                            <tr>
                              <th>PID</th>
                              <th>Name</th>
                              <th>User</th>
                              <th style={{ textAlign: 'right' }}>CPU %</th>
                              <th style={{ textAlign: 'right' }}>MEM %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.processes && metrics.processes.length > 0 ? (
                              metrics.processes.map((proc, index) => (
                                <tr key={index}>
                                  <td style={{ fontFamily: 'Space Grotesk', fontSize: '0.8rem' }}>{proc.pid}</td>
                                  <td style={{ fontWeight: '500', color: 'var(--text-main)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {proc.name}
                                  </td>
                                  <td>{proc.username}</td>
                                  <td style={{ textAlign: 'right' }}>
                                    <span className="process-cpu-badge">{proc.cpu_percent.toFixed(1)}%</span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <span className="process-mem-badge">{proc.memory_percent.toFixed(1)}%</span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No processes found.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Device Info & Environment/Battery details */}
                    <div className="processes-card glass-panel">
                      <h3 className="metric-title" style={{ color: 'var(--text-main)' }}>
                        <ShieldIcon /> System Health & Hardware Info
                      </h3>

                      <div style={{ marginTop: '16px' }}>
                        <div className="info-row">
                          <span className="info-label">Uptime</span>
                          <span className="info-value">{formatUptime(metrics.uptime)}</span>
                        </div>

                        {metrics.temperature !== null && (
                          <div className="info-row">
                            <span className="info-label">CPU Temp</span>
                            <span className="info-value text-cyan">{metrics.temperature.toFixed(1)} °C</span>
                          </div>
                        )}

                        {metrics.fan !== null && (
                          <div className="info-row">
                            <span className="info-label">Fan Speed</span>
                            <span className="info-value text-blue">{metrics.fan} RPM</span>
                          </div>
                        )}

                        {metrics.battery && (
                          <div className="info-row" style={{ alignItems: 'center' }}>
                            <span className="info-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <BatteryIcon percent={metrics.battery.percent} plugged={metrics.battery.power_plugged} />
                              Battery
                            </span>
                            <span className="info-value">
                              {metrics.battery.percent}%
                              {metrics.battery.power_plugged ? (
                                <span className="text-green" style={{ fontSize: '0.78rem', marginLeft: '6px' }}>(Charging)</span>
                              ) : (
                                metrics.battery.secsleft > 0 && (
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                    (~{(metrics.battery.secsleft / 3600).toFixed(1)}h remaining)
                                  </span>
                                )
                              )}
                            </span>
                          </div>
                        )}

                        <div className="info-row">
                          <span className="info-label">Hostname</span>
                          <span className="info-value">{activeDevice.hostname}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">IP Address</span>
                          <span className="info-value">{activeDevice.ip}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Platform / OS</span>
                          <span className="info-value" style={{ wordBreak: 'break-all' }}>{activeDevice.os_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <p className="empty-title">Device is currently offline</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>The central server has cached historical data, but the agent API is unreachable.</p>
                </div>
              )}
            </>
          ) : (
            <div className="fullscreen-state" style={{ height: '100%' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              <p className="empty-title">Select a Node to Monitor</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Use the sidebar list to inspect active homelab devices.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Monitor;
