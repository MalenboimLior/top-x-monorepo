import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'top-x-theme';

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('dark');
  const userPreference = ref<Theme | null>(null);
  const isGameMode = ref(false);

  // Detect system preference
  const getSystemPreference = (): Theme => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default to dark if can't detect
  };

  // Load theme from localStorage or use system preference
  const initializeTheme = () => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    
    if (stored && (stored === 'dark' || stored === 'light')) {
      theme.value = stored;
      userPreference.value = stored;
    } else {
      // First visit - use system preference
      const systemTheme = getSystemPreference();
      theme.value = systemTheme;
      userPreference.value = null; // No user preference set yet
    }

    applyTheme(theme.value);
  };

  // Apply theme to document
  const applyTheme = (newTheme: Theme) => {
    if (typeof document === 'undefined') return;
    
    document.documentElement.setAttribute('data-theme', newTheme);
    theme.value = newTheme;
  };

  // Set theme explicitly
  const setTheme = (newTheme: Theme) => {
    if (typeof window === 'undefined') return;
    
    // Only update user preference if not in game mode
    if (!isGameMode.value) {
      userPreference.value = newTheme;
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }
    
    applyTheme(newTheme);
  };

  // Toggle between dark and light
  const toggleTheme = () => {
    // Don't allow toggling in game mode
    if (isGameMode.value) return;
    
    const newTheme = theme.value === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Force dark mode for games
  const forceDarkModeForGame = () => {
    if (typeof window === 'undefined') return;
    
    // Save current theme as user preference if not already saved
    if (userPreference.value === null) {
      userPreference.value = theme.value;
    }
    
    isGameMode.value = true;
    applyTheme('dark');
  };

  // Restore user preference when leaving games
  const restoreUserPreference = () => {
    if (typeof window === 'undefined') return;
    
    isGameMode.value = false;
    
    // Restore from user preference, or fall back to system preference
    const themeToRestore = userPreference.value ?? getSystemPreference();
    applyTheme(themeToRestore);
  };

  // Watch for system preference changes (optional)
  const watchSystemPreference = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }
  };

  // Initialize on store creation
  if (typeof window !== 'undefined') {
    initializeTheme();
    watchSystemPreference();
  }

  return {
    theme,
    userPreference,
    isGameMode,
    setTheme,
    toggleTheme,
    initializeTheme,
    forceDarkModeForGame,
    restoreUserPreference,
  };
});

