import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import './styles/layout.css';
import './styles/sidebar.css';

createRoot(document.getElementById('root')).render(<App />);
