/** Apply the given theme to the document root element. */
export function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

/** Apply glass effect intensity to the document root element. */
export function applyGlassIntensity(intensity: number) {
  document.documentElement.style.setProperty('--glass-bg', `rgba(255, 255, 255, ${intensity / 400})`);
}
