import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

// няняня~~ вот наша точка входа!
// оборачиваем приложение в BrowserRouter для путей, мррр~~ 🐾

// восстанавливаем тему и шрифт из localStorage при загрузке страницы~~
// чтобы котик не терял свою розовую тему при перезагрузочке! мяу 🐾
const savedTheme = localStorage.getItem('theme_preset') || 'dark';
const savedFontSize = localStorage.getItem('chat_font_size') || '14';
const docRoot = document.documentElement;
const themes = {
  dark: {
    '--background-chat': '#313338', '--background-sidebar': '#2b2d31',
    '--background-servers': '#1e1f22', '--background-darkest': '#111214',
    '--discord-blurple': '#5865f2', '--text-normal': '#dbdee1',
    '--text-muted': '#949ba4', '--header-primary': '#f2f3f5',
    '--glass-bg': 'rgba(43, 45, 49, 0.7)'
  },
  light: {
    '--background-chat': '#f2f3f5', '--background-sidebar': '#e3e5e8',
    '--background-servers': '#e3e5e8', '--background-darkest': '#bfbfbf',
    '--discord-blurple': '#4752c4', '--text-normal': '#2e3338',
    '--text-muted': '#5c6069', '--header-primary': '#060607',
    '--glass-bg': 'rgba(227, 229, 232, 0.7)'
  },
  pink: {
    '--background-chat': '#fff0f3', '--background-sidebar': '#ffe5ec',
    '--background-servers': '#ffc2d1', '--background-darkest': '#ffb3c6',
    '--discord-blurple': '#ff4d6d', '--text-normal': '#5c0632',
    '--text-muted': '#9e3059', '--header-primary': '#3b0020',
    '--glass-bg': 'rgba(255, 194, 209, 0.7)'
  },
  cyberpunk: {
    '--background-chat': '#0f0f1b', '--background-sidebar': '#18122b',
    '--background-servers': '#0a0415', '--background-darkest': '#02000a',
    '--discord-blurple': '#ff007f', '--text-normal': '#00ffff',
    '--text-muted': '#00aaaa', '--header-primary': '#ff00ff',
    '--glass-bg': 'rgba(24, 18, 43, 0.7)'
  }
};
const themeVars = themes[savedTheme] || themes.dark;
Object.entries(themeVars).forEach(([k, v]) => docRoot.style.setProperty(k, v));
docRoot.style.setProperty('--chat-font-size', `${savedFontSize}px`);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
