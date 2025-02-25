// Service for managing chat history using localStorage

// Constants
const HISTORY_STORAGE_KEY = 'geminiFlashHistory';
const MAX_HISTORY_ITEMS = 100;

/**
 * Get all chat history
 * @returns {Array} Array of chat history objects
 */
export function getAllHistory() {
  const historyJson = localStorage.getItem(HISTORY_STORAGE_KEY);
  if (!historyJson) {
    return [];
  }
  
  try {
    return JSON.parse(historyJson);
  } catch (error) {
    console.error('Error parsing history from localStorage:', error);
    return [];
  }
}

/**
 * Save history to localStorage
 * @param {Array} history - The history array to save
 */
function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving history to localStorage:', error);
    
    // If we hit storage limits, remove oldest entries and try again
    if (error.name === 'QuotaExceededError') {
      const currentHistory = getAllHistory();
      const trimmedHistory = currentHistory.slice(Math.floor(currentHistory.length / 2));
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmedHistory));
    }
  }
}

/**
 * Add a new chat session to history
 * @param {object} session - The chat session to add
 * @returns {string} The ID of the added session
 */
export function addChatSession(session) {
  const history = getAllHistory();
  
  // Generate a unique ID for the session
  const sessionId = Date.now().toString();
  
  // Create the session object
  const newSession = {
    id: sessionId,
    title: session.title || generateSessionTitle(session),
    timestamp: Date.now(),
    pageInfo: session.pageInfo,
    messages: session.messages || [],
    persona: session.persona
  };
  
  // Add to history and maintain max size
  history.unshift(newSession);
  if (history.length > MAX_HISTORY_ITEMS) {
    history.pop();
  }
  
  // Save to localStorage
  saveHistory(history);
  
  return sessionId;
}

/**
 * Update an existing chat session
 * @param {string} sessionId - The ID of the session to update
 * @param {object} updates - The updates to apply
 * @returns {boolean} True if successful, false otherwise
 */
export function updateChatSession(sessionId, updates) {
  const history = getAllHistory();
  const sessionIndex = history.findIndex(session => session.id === sessionId);
  
  if (sessionIndex === -1) {
    return false;
  }
  
  // Apply updates
  history[sessionIndex] = {
    ...history[sessionIndex],
    ...updates,
    timestamp: Date.now() // Update timestamp
  };
  
  // If messages were updated, also update the title
  if (updates.messages && !updates.title) {
    history[sessionIndex].title = generateSessionTitle({
      pageInfo: history[sessionIndex].pageInfo,
      messages: history[sessionIndex].messages
    });
  }
  
  // Save to localStorage
  saveHistory(history);
  
  return true;
}

/**
 * Delete a chat session
 * @param {string} sessionId - The ID of the session to delete
 * @returns {boolean} True if successful, false otherwise
 */
export function deleteChatSession(sessionId) {
  const history = getAllHistory();
  const filteredHistory = history.filter(session => session.id !== sessionId);
  
  if (filteredHistory.length === history.length) {
    return false; // No session was removed
  }
  
  // Save filtered history
  saveHistory(filteredHistory);
  
  return true;
}

/**
 * Clear all chat history
 * @returns {boolean} True if successful
 */
export function clearAllHistory() {
  localStorage.removeItem(HISTORY_STORAGE_KEY);
  return true;
}

/**
 * Search chat history
 * @param {string} query - The search query
 * @returns {Array} Array of matching history items
 */
export function searchHistory(query) {
  if (!query || query.trim() === '') {
    return getAllHistory();
  }
  
  const history = getAllHistory();
  const normalizedQuery = query.toLowerCase().trim();
  
  return history.filter(session => {
    // Search in title
    if (session.title.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    
    // Search in page info
    if (session.pageInfo && session.pageInfo.title && 
        session.pageInfo.title.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    
    // Search in messages
    if (session.messages && session.messages.some(msg => 
        msg.content && msg.content.toLowerCase().includes(normalizedQuery))) {
      return true;
    }
    
    return false;
  });
}

/**
 * Generate a title for a chat session based on its content
 * @param {object} session - The chat session
 * @returns {string} A generated title
 */
function generateSessionTitle(session) {
  // If there are messages, use the first user message
  if (session.messages && session.messages.length > 0) {
    const firstUserMessage = session.messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      // Truncate long messages
      let title = firstUserMessage.content.trim();
      if (title.length > 60) {
        title = title.substring(0, 57) + '...';
      }
      return title;
    }
  }
  
  // Fallback to page title if available
  if (session.pageInfo && session.pageInfo.title) {
    return `Chat about: ${session.pageInfo.title}`;
  }
  
  // Last resort
  return `Chat from ${new Date().toLocaleString()}`;
}

/**
 * Export all history data
 * @returns {string} JSON string of all history data
 */
export function exportHistory() {
  const history = getAllHistory();
  return JSON.stringify(history, null, 2);
}

/**
 * Import history data
 * @param {string} jsonData - The JSON string to import
 * @returns {boolean} True if successful, false otherwise
 */
export function importHistory(jsonData) {
  try {
    const importedHistory = JSON.parse(jsonData);
    
    if (!Array.isArray(importedHistory)) {
      throw new Error('Invalid history data format');
    }
    
    // Validate each history item has required fields
    importedHistory.forEach(item => {
      if (!item.id || !item.title || !item.timestamp) {
        throw new Error('Invalid history item format');
      }
    });
    
    // Save the imported history
    saveHistory(importedHistory);
    return true;
  } catch (error) {
    console.error('Error importing history:', error);
    return false;
  }
}

/**
 * Get a single chat session by ID
 * @param {string} sessionId - The ID of the session to get
 * @returns {object|null} The session object or null if not found
 */
export function getChatSession(sessionId) {
  const history = getAllHistory();
  return history.find(session => session.id === sessionId) || null;
}

/**
 * Sort history by given criteria
 * @param {Array} history - The history array to sort
 * @param {string} sortBy - Sort criteria (timestamp, title)
 * @param {boolean} ascending - Sort direction
 * @returns {Array} Sorted history array
 */
export function sortHistory(history, sortBy = 'timestamp', ascending = false) {
  const sortedHistory = [...history];
  
  sortedHistory.sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'timestamp') {
      comparison = a.timestamp - b.timestamp;
    } else if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    }
    
    return ascending ? comparison : -comparison;
  });
  
  return sortedHistory;
}
