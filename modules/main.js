// Main entry point for the sidebar application
import { setupRouter } from './router.js';
import { initChatPage } from './pages/chat.js';
import { initSettingsPage } from './pages/settings.js';
import { initHistoryPage } from './pages/history.js';
import { loadSettings } from './services/settingsService.js';

// Initialize the application
async function initApp() {
  console.log('Initializing Gemini Flash Sidebar...');
  
  // Load settings first
  await loadSettings();
  
  // Initialize router
  setupRouter();
  
  // Initialize all pages
  initChatPage();
  initSettingsPage();
  initHistoryPage();

  console.log('Gemini Flash Sidebar initialized successfully');
}

// Initialize the app when the document is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
