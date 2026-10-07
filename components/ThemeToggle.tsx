'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem('whisperpost_theme');
    const isDark = saved ? saved === 'dark' : true;
    document.documentElement.classList.toggle('dark', isDark);
    setDark(isDark);
  }, []);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem('whisperpost_theme', next ? 'dark' : 'light');
    setDark(next);
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      type="button"
      aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}
      aria-pressed={dark}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb">{dark ? '☀️' : '🌙'}</span>
      </span>
    </button>
  );
}
