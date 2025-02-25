// Sidebar script to handle the chat interface and API interactions

// DOM Elements
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-btn');
const extractButton = document.getElementById('extract-btn');
const settingsButton = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const saveSettingsButton = document.getElementById('save-settings');
const personaSelect = document.getElementById('persona-select');
const temperatureSlider = document.getElementById('temperature');
const tempValue = document.getElementById('temp-value');
const systemPromptInput = document.getElementById('system-prompt');
const apiKeyInput = document.getElementById('api-key');

// State variables
let pageContent = null;
let currentTabId = null;
let settings = {
  apiKey: '',
  temperature: 0.7,
  personas: {
    default: {
      name: 'Default Assistant',
      systemPrompt: 'You are a helpful AI assistant that provides information about webpages.'
    },
    researcher: {
      name: 'Academic Researcher',
      systemPrompt: 'You are an academic researcher AI that analyzes webpages with scholarly precision, citing sources and maintaining academic rigor.'
    },
    creative: {
      name: 'Creative Writer',
      systemPrompt: 'You are a creative AI that discusses webpages in an engaging, narrative style with colorful language and metaphors.'
    },
    programmer: {
      name: 'Programmer',
      systemPrompt: 'You are a programmer AI that provides technical analysis of webpages, focusing on code, architecture, and implementation details.'
    },
    custom: {
      name: 'Custom',
      systemPrompt: ''
    }
  },
  currentPersona: 'default'
};

// Initialize the sidebar
async function initSidebar() {
  // Load saved settings
  loadSettings();

  // Set up event listeners
  setupEventListeners();
}

// Load settings from storage
function loadSettings() {
  chrome.storage.local.get('geminiFlashSettings', (result) => {
    if (result.geminiFlashSettings) {
      settings = { ...settings, ...result.geminiFlashSettings };

      // Update UI to reflect loaded settings
      apiKeyInput.value = settings.apiKey || '';
      temperatureSlider.value = settings.temperature;
      tempValue.textContent = settings.temperature;
      personaSelect.value = settings.currentPersona;

      // Update system prompt based on selected persona
      const persona = settings.personas[settings.currentPersona];
      systemPromptInput.value = persona.systemPrompt;

      // Enable the send button if API key is set and page content exists
      updateSendButtonState();
    }
  });
}

// Update send button state based on current conditions
function updateSendButtonState() {
  if (userInput.value.trim() && settings.apiKey && pageContent) {
    sendButton.disabled = false;
  } else {
    sendButton.disabled = true;
  }
}

// Save settings to storage
function saveSettings() {
  // Update settings object
  settings.apiKey = apiKeyInput.value;
  settings.temperature = parseFloat(temperatureSlider.value);
  settings.currentPersona = personaSelect.value;

  // Update custom system prompt if selected
  if (personaSelect.value === 'custom') {
    settings.personas.custom.systemPrompt = systemPromptInput.value;
  }

  // Save to storage
  chrome.storage.local.set({ 'geminiFlashSettings': settings });

  // Update send button state
  updateSendButtonState();

  // Hide settings panel
  settingsPanel.classList.add('hidden');
}

// Set up event listeners
function setupEventListeners() {
  // Send button
  sendButton.addEventListener('click', () => {
    sendMessage();
  });

  // Enter key in input
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Input field changes
  userInput.addEventListener('input', () => {
    updateSendButtonState();
  });

  // Settings button
  settingsButton.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  // Save settings button
  saveSettingsButton.addEventListener('click', saveSettings);

  // Temperature slider
  temperatureSlider.addEventListener('input', () => {
    tempValue.textContent = temperatureSlider.value;
  });

  // Persona select
  personaSelect.addEventListener('change', () => {
    const selectedPersona = personaSelect.value;
    const persona = settings.personas[selectedPersona];
    systemPromptInput.value = persona.systemPrompt;

    // Enable/disable system prompt based on selection
    if (selectedPersona === 'custom') {
      systemPromptInput.disabled = false;
    } else {
      systemPromptInput.disabled = true;
    }
  });

  chrome.storage.session.get('pageContent', ({ pageContent }) => {
    handleExtractedContent(pageContent);
  });

  chrome.storage.session.onChanged.addListener((changes) => {
    const pageContent = changes['pageContent'];
    handleExtractedContent(pageContent);
  });
}

// Handle extracted content
function handleExtractedContent(newContent) {
  if (pageContent == newContent) {
    // no new content, do nothing
    return;
  }

  pageContent = newContent;

  // Convert HTML to markdown using TurndownService
  try {
    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(newContent.content);

    // Store the markdown version
    pageContent.markdown = markdown;

    showMessage('system', `Successfully analyzed: "${newContent.title}"`);
    console.log(pageContent);

    // Update send button state
    updateSendButtonState();
  } catch (error) {
    console.error("Error converting to markdown:", error);
    showMessage('system', `Error processing page content: ${error.message}`);
  }
}

// Send message to Gemini Flash API
async function sendMessage() {
  const userMessage = userInput.value.trim();
  if (!userMessage || !settings.apiKey || !pageContent) return;

  // Add user message to chat
  showMessage('user', userMessage);

  // Clear input field
  userInput.value = '';
  sendButton.disabled = true;

  // Show typing indicator
  const typingIndicator = showMessage('assistant', '...');

  try {
    // Prepare the request payload
    const selectedPersona = settings.currentPersona;
    const persona = settings.personas[selectedPersona];

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Context (Webpage content): 
Title: ${pageContent.title}
URL: ${pageContent.url}
Content:
${pageContent.markdown}

User question: ${userMessage}`
            }
          ]
        }
      ],
      systemInstruction: {
        role: "system",
        parts: [{ text: persona.systemPrompt }]
      },
      generationConfig: {
        temperature: settings.temperature
      }
    };

    // Make API request to Gemini Flash
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-flash:generateContent?key=' + settings.apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Unknown API error');
    }

    const responseData = await response.json();

    // Remove typing indicator and show actual response
    typingIndicator.remove();

    // Extract and display the response text
    const assistantMessage = responseData.candidates[0]?.content?.parts[0]?.text || 'No response received';
    showMessage('assistant', assistantMessage);

  } catch (error) {
    // Remove typing indicator and show error
    typingIndicator.remove();
    showMessage('system', `Error: ${error.message}`);
  }
}

// Add a message to the chat
function showMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';

  // Handle markdown in assistant messages
  if (role === 'assistant') {
    // Simple markdown parsing for basic formatting
    // For a real extension, consider using a proper markdown library
    const formattedContent = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

    messageContent.innerHTML = `<p>${formattedContent}</p>`;
  } else {
    messageContent.textContent = content;
  }

  messageDiv.appendChild(messageContent);
  messagesContainer.appendChild(messageDiv);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return messageDiv;
}

// Initialize the sidebar when the document is loaded
document.addEventListener('DOMContentLoaded', initSidebar);
