// Settings page implementation
import { 
  settings, 
  updateSetting, 
  updatePersona, 
  resetPersona, 
  resetAllSettings,
  setCurrentPersona,
  exportSettings,
  importSettings,
  DEFAULT_SETTINGS
} from '../services/settingsService.js';
import { clearAllHistory, exportHistory, importHistory } from '../services/historyService.js';
import { navigateTo } from '../router.js';

// DOM Elements
let apiKeyInput;
let temperatureSlider;
let tempValueDisplay;
let personasList;
let personaNameInput;
let systemPromptInput;
let savePersonaBtn;
let resetPersonaBtn;
let clearHistoryBtn;
let exportDataBtn;
let importDataBtn;

// Currently selected persona for editing
let selectedPersonaId = 'default';

/**
 * Initialize the settings page
 */
export function initSettingsPage() {
  // Get DOM elements
  apiKeyInput = document.getElementById('api-key');
  temperatureSlider = document.getElementById('temperature');
  tempValueDisplay = document.getElementById('temp-value');
  personasList = document.getElementById('personas-list');
  personaNameInput = document.getElementById('persona-name');
  systemPromptInput = document.getElementById('system-prompt');
  savePersonaBtn = document.getElementById('save-persona-btn');
  resetPersonaBtn = document.getElementById('reset-persona-btn');
  clearHistoryBtn = document.getElementById('clear-history-btn');
  exportDataBtn = document.getElementById('export-data-btn');
  importDataBtn = document.getElementById('import-data-btn');
  
  // Set up event listeners
  apiKeyInput.addEventListener('change', handleApiKeyChange);
  temperatureSlider.addEventListener('input', handleTemperatureChange);
  savePersonaBtn.addEventListener('click', handleSavePersona);
  resetPersonaBtn.addEventListener('click', handleResetPersona);
  clearHistoryBtn.addEventListener('click', handleClearHistory);
  exportDataBtn.addEventListener('click', handleExportData);
  importDataBtn.addEventListener('click', handleImportData);
  
  // Initialize UI with current settings
  updateSettingsUI();
}

/**
 * Update the settings UI with current values
 */
function updateSettingsUI() {
  // Update API key
  apiKeyInput.value = settings.apiKey || '';
  
  // Update temperature
  temperatureSlider.value = settings.temperature;
  tempValueDisplay.textContent = settings.temperature;
  
  // Update personas list
  updatePersonasList();
  
  // Set selected persona
  selectPersona(settings.currentPersona);
}

/**
 * Update the personas list in the UI
 */
function updatePersonasList() {
  personasList.innerHTML = '';
  
  Object.keys(settings.personas).forEach(personaId => {
    const persona = settings.personas[personaId];
    const personaElement = document.createElement('div');
    personaElement.className = 'persona-item';
    personaElement.dataset.id = personaId;
    
    if (personaId === settings.currentPersona) {
      personaElement.classList.add('selected');
    }
    
    personaElement.innerHTML = `
      <div class="persona-name">${persona.name}</div>
      <div class="persona-actions">
        <button class="edit-btn" title="Edit">✏️</button>
        ${personaId === settings.currentPersona ? 
          '<span class="current-label">Current</span>' : 
          '<button class="use-btn" title="Use">✓</button>'}
      </div>
    `;
    
    // Add event listeners
    const editBtn = personaElement.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => selectPersona(personaId));
    
    const useBtn = personaElement.querySelector('.use-btn');
    if (useBtn) {
      useBtn.addEventListener('click', () => setCurrentPersonaAndUpdate(personaId));
    }
    
    personasList.appendChild(personaElement);
  });
}

/**
 * Select a persona for editing
 * @param {string} personaId - The ID of the persona to select
 */
function selectPersona(personaId) {
  selectedPersonaId = personaId;
  
  // Update UI selection
  const personaItems = personasList.querySelectorAll('.persona-item');
  personaItems.forEach(item => {
    if (item.dataset.id === personaId) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
  
  // Update form fields
  const persona = settings.personas[personaId];
  personaNameInput.value = persona.name;
  systemPromptInput.value = persona.systemPrompt;
  
  // Disable name editing for default personas
  const isBuiltIn = personaId !== 'custom' && DEFAULT_SETTINGS.personas[personaId];
  personaNameInput.disabled = isBuiltIn;
  
  // Update reset button state
  resetPersonaBtn.disabled = !DEFAULT_SETTINGS.personas[personaId];
}

/**
 * Set the current persona and update UI
 * @param {string} personaId - The ID of the persona to set as current
 */
async function setCurrentPersonaAndUpdate(personaId) {
  await setCurrentPersona(personaId);
  updatePersonasList();
  
  // Update persona selector in chat page
  const personaSelect = document.getElementById('persona-select');
  if (personaSelect) {
    personaSelect.value = personaId;
  }
}

/**
 * Handle API key change
 */
async function handleApiKeyChange() {
  await updateSetting('apiKey', apiKeyInput.value);
}

/**
 * Handle temperature slider change
 */
async function handleTemperatureChange() {
  const value = parseFloat(temperatureSlider.value);
  tempValueDisplay.textContent = value;
  await updateSetting('temperature', value);
}

/**
 * Handle save persona button click
 */
async function handleSavePersona() {
  const personaData = {
    name: personaNameInput.value.trim(),
    systemPrompt: systemPromptInput.value.trim()
  };
  
  // Validate
  if (!personaData.name) {
    alert('Please enter a name for the persona');
    return;
  }
  
  await updatePersona(selectedPersonaId, personaData);
  updatePersonasList();
}

/**
 * Handle reset persona button click
 */
async function handleResetPersona() {
  if (!DEFAULT_SETTINGS.personas[selectedPersonaId]) {
    return;
  }
  
  if (confirm(`Reset "${settings.personas[selectedPersonaId].name}" to default settings?`)) {
    await resetPersona(selectedPersonaId);
    selectPersona(selectedPersonaId);
    updatePersonasList();
  }
}

/**
 * Handle clear history button click
 */
function handleClearHistory() {
  if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
    clearAllHistory();
    alert('Chat history cleared successfully');
  }
}

/**
 * Handle export data button click
 */
function handleExportData() {
  try {
    // Combine settings and history
    const exportData = {
      settings: JSON.parse(exportSettings()),
      history: JSON.parse(exportHistory())
    };
    
    // Convert to blob and download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-flash-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Failed to export data');
  }
}

/**
 * Handle import data button click
 */
function handleImportData() {
  // Create file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json';
  
  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const importedData = JSON.parse(e.target.result);
        
        if (importedData.settings) {
          await importSettings(JSON.stringify(importedData.settings));
        }
        
        if (importedData.history) {
          importHistory(JSON.stringify(importedData.history));
        }
        
        alert('Data imported successfully');
        updateSettingsUI();
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Failed to import data');
    }
  });
  
  fileInput.click();
}

/**
 * Show the settings page
 */
export function showSettingsPage() {
  // Make sure UI is up to date
  updateSettingsUI();
}

/**
 * Hide the settings page
 */
export function hideSettingsPage() {
  // Any cleanup needed when leaving the page
}
