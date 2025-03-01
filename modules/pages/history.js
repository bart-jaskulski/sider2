// History page implementation
import { 
  getAllHistory, 
  searchHistory, 
  deleteChatSession,
  getChatSession,
  sortHistory
} from '../services/historyService.js';
import { navigateTo } from '../router.js';

// DOM Elements
let historyList;
let searchInput;

// Current search query
let currentQuery = '';

/**
 * Initialize the history page
 */
export function initHistoryPage() {
  // Get DOM elements
  historyList = document.getElementById('history-list');
  searchInput = document.getElementById('history-search');
  
  // Set up event listeners
  searchInput.addEventListener('input', handleSearchInput);
  
  // Listen for chat session load events from other parts of the app
  document.addEventListener('loadChatSession', handleLoadChatSession);
  
  // Initial render
  renderHistoryList();
}

/**
 * Handle search input
 */
function handleSearchInput() {
  currentQuery = searchInput.value.trim();
  renderHistoryList();
}

/**
 * Render the history list
 */
function renderHistoryList() {
  // Get history, filtered by search if needed
  let history = currentQuery ? searchHistory(currentQuery) : getAllHistory();
  
  // Sort by timestamp (newest first)
  history = sortHistory(history, 'timestamp', false);
  
  // Clear the list
  historyList.innerHTML = '';
  
  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        ${currentQuery ? 'No results found' : 'No chat history yet'}
      </div>
    `;
    return;
  }
  
  // Create history items
  history.forEach(session => {
    const historyItem = createHistoryItem(session);
    historyList.appendChild(historyItem);
  });
}

/**
 * Create a history item element
 * @param {object} session - The chat session
 * @returns {HTMLElement} The history item element
 */
function createHistoryItem(session) {
  const item = document.createElement('div');
  item.className = 'history-item';
  item.dataset.id = session.id;
  
  // Format date
  const date = new Date(session.timestamp);
  const formattedDate = new Intl.DateTimeFormat('default', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
  
  // Get message count
  const messageCount = session.messages ? session.messages.length : 0;
  
  // Get persona name (if available)
  const personaName = session.persona ? session.persona.name : '';

  // Create HTML structure
  item.innerHTML = `
    <div class="history-item-header">
      <div class="history-item-title">${session.title}</div>
      <div class="history-item-actions">
        <button class="load-btn" title="Load conversation">Load</button>
        <button class="delete-btn" title="Delete">🗑️</button>
      </div>
    </div>
    <div class="history-item-details">
      <span class="history-item-date">${formattedDate}</span>
      ${personaName ? `<span class="history-item-persona">${personaName}</span>` : ''}
      <span class="history-item-count">${messageCount} messages</span>
    </div>
    ${session.pageInfo && session.pageInfo.title ? 
      `<div class="history-item-page">${session.pageInfo.title}</div>` : ''}
  `;
  
  // Add event listeners
  const loadBtn = item.querySelector('.load-btn');
  loadBtn.addEventListener('click', () => loadChatSession(session.id));
  
  const deleteBtn = item.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDeleteSession(session.id);
  });
  
  // Make entire item clickable to expand/collapse details
  item.addEventListener('click', () => toggleHistoryItemDetails(item));
  
  return item;
}

/**
 * Toggle history item details visibility
 * @param {HTMLElement} item - The history item element
 */
function toggleHistoryItemDetails(item) {
  item.classList.toggle('expanded');
  
  // If expanded, show message preview
  if (item.classList.contains('expanded') && !item.querySelector('.history-item-preview')) {
    const sessionId = item.dataset.id;
    const session = getChatSession(sessionId);
    
    if (session && session.messages && session.messages.length > 0) {
      // Create preview container
      const previewContainer = document.createElement('div');
      previewContainer.className = 'history-item-preview';
      
      // Show up to 3 messages
      const previewMessages = session.messages.slice(0, 3);
      previewMessages.forEach(message => {
        const messageEl = document.createElement('div');
        messageEl.className = `preview-message ${message.role}`;
        
        // Truncate long messages
        let content = message.content;
        if (content.length > 120) {
          content = content.substring(0, 117) + '...';
        }
        
        messageEl.innerHTML = `
          <div class="preview-role">${message.role === 'user' ? 'You' : 'AI'}</div>
          <div class="preview-content">${content}</div>
        `;
        
        previewContainer.appendChild(messageEl);
      });
      
      // If there are more messages, show indicator
      if (session.messages.length > 3) {
        const moreIndicator = document.createElement('div');
        moreIndicator.className = 'preview-more';
        moreIndicator.textContent = `+ ${session.messages.length - 3} more messages`;
        previewContainer.appendChild(moreIndicator);
      }
      
      item.appendChild(previewContainer);
    }
  }
}

/**
 * Confirm and delete a chat session
 * @param {string} sessionId - The ID of the session to delete
 */
function confirmDeleteSession(sessionId) {
  if (confirm('Are you sure you want to delete this conversation?')) {
    deleteChatSession(sessionId);
    renderHistoryList();
  }
}

/**
 * Load a chat session
 * @param {string} sessionId - The ID of the session to load
 */
function loadChatSession(sessionId) {
  // Get the session
  const session = getChatSession(sessionId);
  if (!session) {
    alert('Chat session not found');
    return;
  }
  
  // Dispatch a custom event that the chat page can listen for
  const event = new CustomEvent('loadChatSession', { detail: session });
  document.dispatchEvent(event);
  
  // Navigate to chat page
  navigateTo('chat');
}

/**
 * Handle chat session load event
 * @param {CustomEvent} event - The loadChatSession event
 */
function handleLoadChatSession(event) {
  const session = event.detail;
  console.log('Loading chat session:', session.id);
  
  // This is handled by the chat page but we can add any history-specific logic here
  // For example, we might want to highlight the last viewed session in the history list
}

/**
 * Public method to refresh the history list
 * Can be called from other modules when history is updated
 */
export function refreshHistory() {
  renderHistoryList();
}
