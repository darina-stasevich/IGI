(function() {
  const themeToggle = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  function setTheme(theme) {
      document.documentElement.className = theme;

      localStorage.setItem('theme', theme);

      if (themeToggle) {
        themeToggle.checked = theme === 'dark-theme';
    }
  }

  if (currentTheme) {
    setTheme(currentTheme);
  }

  else if (prefersDark) {
    setTheme('dark-theme');
  }

  else {
    setTheme('light-theme');
  }

  if (themeToggle) {
    themeToggle.addEventListener('change', function() {
      if (this.checked) {
        setTheme('dark-theme');
      } else {
        setTheme('light-theme');
      }
    });
  }
})();