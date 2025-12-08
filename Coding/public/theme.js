// theme.js
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleButton = document.getElementById('theme-toggle-button');
    if (!themeToggleButton) return;

    const toggleInput = themeToggleButton.querySelector('input[type="checkbox"]');
    const savedTheme = localStorage.getItem('quizmate_theme') || 'light';

    // Apply the theme on initial load
    applyTheme(savedTheme);
    if (toggleInput) {
      toggleInput.checked = (savedTheme === 'dark');
    }

    // Add event listener to the toggle
    if (toggleInput) {
        toggleInput.addEventListener('change', () => {
            const newTheme = toggleInput.checked ? 'dark' : 'light';
            localStorage.setItem('quizmate_theme', newTheme);
            applyTheme(newTheme);
        });
    }
});