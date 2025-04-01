import { marked } from "../../marked.js";
import { 
  addChatSession, 
  updateChatSession, 
  getChatSession 
} from '../services/historyService.js';
import { loadSettings, settings } from '../services/settingsService.js';
import { base64EncodeUnicode } from '../../util/encode.js';

// DOM Elements
let messagesContainer;
let userInput;
let sendButton;
let includeContentToggle;
let newChatButton;
let personaSelect;

// Current chat session
let currentSession = {
  id: null,
  messages: [],
  pageInfo: null,
  persona: null
};

/**
 * Initialize the chat page
 */
export function initChatPage() {
  // Get DOM elements
  messagesContainer = document.getElementById('messages');
  userInput = document.getElementById('user-input');
  sendButton = document.getElementById('send-btn');
  includeContentToggle = document.getElementById('include-content-toggle');
  newChatButton = document.getElementById('new-chat-btn');
  personaSelect = document.getElementById('persona-select');
  
  // Set up event listeners
  sendButton.addEventListener('click', sendMessage);
  newChatButton.addEventListener('click', startNewSession);
  includeContentToggle.addEventListener('change', handleContentToggle);
  userInput.addEventListener('input', handleInputChange);
  personaSelect.addEventListener('change', handlePersonaChange);
  
  // Listen for Enter key in input
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (sendButton.disabled === false) {
        sendMessage();
      }
    }
  });
  
  // Listen for chat session load events
  document.addEventListener('loadChatSession', (e) => {
    loadChatSession(e.detail);
  });
  
  // Start a new session
  startNewSession();
}

/**
 * Start a new chat session
 */
function startNewSession() {
  // Reset current session
  currentSession = {
    id: null,
    messages: [],
    pageInfo: null,
    persona: settings.defaultPersona || {
      name: 'Default Assistant',
      systemPrompt: 'You are a helpful assistant.'
    }
  };
  
  // Update persona select
  personaSelect.value = currentSession.persona.name.toLowerCase().replace(/\s+/g, '');
  
  // Clear messages
  messagesContainer.innerHTML = '';
  
  // Add welcome message
  addSystemMessage('Welcome! I\'ll assist you with information about this page.');
  
  // Reset input
  userInput.value = '';
  sendButton.disabled = true;
  
  // Save the new session to history
  saveChatSession();
}

/**
 * Load an existing chat session
 * @param {object} session - The session to load
 */
function loadChatSession(session) {
  // Set as current session
  currentSession = {
    id: session.id,
    messages: session.messages || [],
    pageInfo: session.pageInfo || null,
    persona: session.persona || settings.defaultPersona
  };
  
  // Update persona select
  if (currentSession.persona) {
    const personaValue = currentSession.persona.name.toLowerCase().replace(/\s+/g, '');
    personaSelect.value = personaValue === 'default' ? 'default' : 
                          personaValue === 'researcher' ? 'researcher' :
                          personaValue === 'creative' ? 'creative' :
                          personaValue === 'programmer' ? 'programmer' : 'custom';
  }
  
  // Clear messages container
  messagesContainer.innerHTML = '';
  
  // Render messages
  currentSession.messages.forEach(message => {
    switch (message.role) {
      case 'system':
        addSystemMessage(message.content);
        break;
      case 'user':
        addUserMessage(message.content);
        break;
      case 'assistant':
        addAssistantMessage(message.content);
        break;
    }
  });
  
  // Reset input
  userInput.value = '';
  sendButton.disabled = true;
}

/**
 * Handle input field changes
 */
function handleInputChange() {
  sendButton.disabled = userInput.value.trim() === '';
}

/**
 * Handle persona selection change
 */
function handlePersonaChange() {
  const personaType = personaSelect.value;
  const persona = settings.personas[personaType] || settings.currentPersona;
  
  currentSession.persona = persona;
  
  if (currentSession.id) {
    updateChatSession(currentSession.id, { persona });
  }
  
  addSystemMessage(`Persona changed to ${persona.name}`);
}

/**
 * Send a user message
 */
function sendMessage() {
  const message = userInput.value.trim();
  if (message === '') return;
  
  // Add to UI
  addUserMessage(message);
  
  // Add to session
  currentSession.messages.push({
    role: 'user',
    content: message
  });
  
  // Save to history
  saveChatSession();
  
  // Clear input
  userInput.value = '';
  sendButton.disabled = true;
  
  // Get AI response
  getAIResponse(message);
}

/**
 * Handle content toggle change
 */
function handleContentToggle() {
  if (includeContentToggle.checked) {
    // Get page content when toggle is turned on
    chrome.storage.session.get('pageContent', ({ pageContent }) => {
      if (pageContent) {
        // Store page info in current session
        currentSession.pageInfo = pageContent;
        
        // Add system message about inclusion
        addSystemMessage(`Page content will be included: ${pageContent.title}`);
        
        // Save to history
        saveChatSession();
      } else {
        const message = 'No page content available. Please refresh the page.';
        addSystemMessage(message);
        
        // Save to history
        saveChatSession();
      }
    });
  } else {
    // Remove page content when toggle is turned off
    currentSession.pageInfo = null;
    
    const message = 'Page content will not be included in the conversation.';
    // Add system message about exclusion
    addSystemMessage(message);
    
    // Save to history
    saveChatSession();
  }
}

/**
 * Get AI response for user message
 * @param {string} message - The user message to respond to
 */
async function getAIResponse(message) {
  // Show typing indicator
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'message assistant typing';
  typingIndicator.innerHTML = '<div class="message-content"><p>...</p></div>';
  messagesContainer.appendChild(typingIndicator);
  scrollToBottom();
  
  try {
    const apiKey = settings.apiKey;

    if (!apiKey || apiKey === '') {
      // No API key, show error
      setTimeout(() => {
        messagesContainer.removeChild(typingIndicator);
        addSystemMessage('Error: No API key configured. Please add your Gemini API key in settings.');
      }, 500);
      return;
    }

    // Remove typing indicator
    messagesContainer.removeChild(typingIndicator);

    const apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta'

      const formattedMessages = currentSession.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

    const response = await fetch(`${apiEndpoint}/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          ...(currentSession.pageInfo
            ? [{ role: 'user', parts: [{ inlineData: {data: base64EncodeUnicode(`${currentSession.pageInfo.title}\n\n${currentSession.pageInfo.url}\n\n${TurndownService().turndown(currentSession.pageInfo.content)}`), mimeType: 'text/md'} }] }]
            : []),
          ...formattedMessages,
        ],
        systemInstruction: {
          parts: [{ text: currentSession.persona.systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) throw new Error('API request failed');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let currentMessage = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(5));
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
              const newText = data.candidates[0].content.parts[0].text;
              currentMessage += newText;
              addAssistantMessage(currentMessage, true);
            }
          } catch (e) {
            console.error('Error parsing SSE ', e);
          }
        }
      }
    }

    // Add to session
    currentSession.messages.push({
      role: 'assistant',
      content: currentMessage
    });

    // Save to history
    saveChatSession();
    
  } catch (error) {
    console.error('Error getting AI response:', error);
    messagesContainer.removeChild(typingIndicator);
    addSystemMessage(`Error: ${error.message}`);
  }
}

/**
 * Save current chat session to history
 */
function saveChatSession() {
  if (currentSession.id) {
    // Update existing session
    updateChatSession(currentSession.id, {
      messages: currentSession.messages,
      pageInfo: currentSession.pageInfo,
      persona: currentSession.persona
    });
  } else {
    // Create new session
    const sessionId = addChatSession(currentSession);
    currentSession.id = sessionId;
  }
}

/**
 * Add a system message to the UI
 * @param {string} content - The message content
 * @param {boolean} saveToSession - Whether to save this message to the session
 */
function addSystemMessage(content, saveToSession = false) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message system';
  messageElement.innerHTML = `
    <div class="message-content">
      <p>${content}</p>
    </div>
  `;
  messagesContainer.appendChild(messageElement);
  scrollToBottom();
  
  // Optionally save to session
  if (saveToSession) {
    currentSession.messages.push({
      role: 'system',
      content: content
    });
    saveChatSession();
  }
}

/**
 * Add a user message to the UI
 * @param {string} content - The message content
 */
function addUserMessage(content) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message user';
  messageElement.innerHTML = `
    <div class="message-content">
      ${marked.parse(content)}
    </div>
  `;
  messagesContainer.appendChild(messageElement);
  scrollToBottom();
}

/**
 * Add an assistant message to the UI
 * @param {string} content - The message content
 */
function addAssistantMessage(content, stream = false) {
  // Check if there's an existing assistant message being streamed
  const existingMessage = document.querySelector('.message.assistant.streaming:last-child');

  if (stream && existingMessage) {
    // Update the existing message
    existingMessage.querySelector('.message-content').innerHTML = marked.parse(content);
  } else {
    // Create a new message element
    const messageElement = document.createElement('div');
    messageElement.className = 'message assistant';

    // If streaming, add a special class
    if (stream) {
      messageElement.classList.add('streaming');
    }

    messageElement.innerHTML = `
      <div class="message-content">
        ${marked.parse(content)}
      </div>
    `;
    messagesContainer.appendChild(messageElement);
  }
  scrollToBottom();
}

/**
 * Scroll the messages container to the bottom
 */
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
