// Simple router for managing page navigation

// DOM elements for navigation
const chatPage = document.getElementById('chat-page');
const settingsPage = document.getElementById('settings-page');
const historyPage = document.getElementById('history-page');

// Navigation buttons
const settingsNavBtn = document.getElementById('settings-nav-btn');
const historyNavBtn = document.getElementById('history-nav-btn');
const settingsBackBtn = document.getElementById('settings-back-btn');
const historyBackBtn = document.getElementById('history-back-btn');

// Current active page
let currentPage = 'chat';

/**
 * Navigate to a specific page
 * @param {string} pageName - The name of the page to navigate to
 */
export function navigateTo(pageName) {
  // Hide all pages
  chatPage.classList.remove('active');
  settingsPage.classList.remove('active');
  historyPage.classList.remove('active');
  
  // Show the requested page
  switch(pageName) {
    case 'chat':
      chatPage.classList.add('active');
      break;
    case 'settings':
      settingsPage.classList.add('active');
      break;
    case 'history':
      historyPage.classList.add('active');
      break;
    default:
      console.error(`Unknown page: ${pageName}`);
      chatPage.classList.add('active');
      pageName = 'chat';
  }
  
  // Update current page
  currentPage = pageName;
}

/**
 * Set up the router event listeners
 */
export function setupRouter() {
  // Settings navigation
  settingsNavBtn.addEventListener('click', () => {
    navigateTo('settings');
  });
  
  settingsBackBtn.addEventListener('click', () => {
    navigateTo('chat');
  });
  
  // History navigation
  historyNavBtn.addEventListener('click', () => {
    navigateTo('history');
  });
  
  historyBackBtn.addEventListener('click', () => {
    navigateTo('chat');
  });
  
  // Start with chat page active
  navigateTo('chat');
}

/**
 * Get the current active page
 * @returns {string} The name of the current page
 */
export function getCurrentPage() {
  return currentPage;
}
