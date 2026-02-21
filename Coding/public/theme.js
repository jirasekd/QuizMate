// theme.js
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('quizmate_theme') || 'light';
    applyTheme(savedTheme);

    // Gather all theme toggle checkboxes (sidebar + mobile topbar)
    const desktopToggle = document.querySelector('#theme-toggle-button input[type="checkbox"]');
    const mobileToggle = document.getElementById('mobileToggle');
    const allToggles = [desktopToggle, mobileToggle].filter(Boolean);

    // Set initial state on all toggles
    allToggles.forEach(t => t.checked = (savedTheme === 'dark'));

    // When any toggle changes, sync all others and apply
    allToggles.forEach(toggle => {
        toggle.addEventListener('change', () => {
            const newTheme = toggle.checked ? 'dark' : 'light';
            localStorage.setItem('quizmate_theme', newTheme);
            applyTheme(newTheme);
            // Sync the other toggle(s)
            allToggles.forEach(t => { if (t !== toggle) t.checked = toggle.checked; });
        });
    });
});
