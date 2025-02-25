// Service for managing settings

// Default settings
export const DEFAULT_SETTINGS = {
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
      systemPrompt: 'You are a custom assistant with personalized instructions.'
    }
  },
  currentPersona: 'default'
};

// Current settings
export let settings = { ...DEFAULT_SETTINGS };

/**
 * Load settings from Chrome storage
 * @returns {Promise} Promise that resolves when settings are loaded
 */
export async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get('geminiFlashSettings', (result) => {
      if (result.geminiFlashSettings) {
        settings = { ...DEFAULT_SETTINGS, ...result.geminiFlashSettings };
        
        // Ensure all default personas exist
        for (const key in DEFAULT_SETTINGS.personas) {
          if (!settings.personas[key]) {
            settings.personas[key] = DEFAULT_SETTINGS.personas[key];
          }
        }
      }
      resolve(settings);
    });
  });
}

/**
 * Save current settings to Chrome storage
 * @returns {Promise} Promise that resolves when settings are saved
 */
export async function saveSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ 'geminiFlashSettings': settings }, () => {
      resolve();
    });
  });
}

/**
 * Update a specific setting
 * @param {string} key - The setting key to update
 * @param {any} value - The new value
 */
export function updateSetting(key, value) {
  settings[key] = value;
}

/**
 * Get current persona
 * @returns {object} The current persona object
 */
export function getCurrentPersona() {
  return settings.personas[settings.currentPersona];
}

/**
 * Update persona settings
 * @param {string} personaId - The ID of the persona to update
 * @param {object} personaData - The updated persona data
 */
export function updatePersona(personaId, personaData) {
  settings.personas[personaId] = { ...settings.personas[personaId], ...personaData };
}

/**
 * Set current persona
 * @param {string} personaId - The ID of the persona to set as current
 */
export function setCurrentPersona(personaId) {
  if (settings.personas[personaId]) {
    settings.currentPersona = personaId;
  }
}

/**
 * Reset a persona to its default settings
 * @param {string} personaId - The ID of the persona to reset
 */
export function resetPersona(personaId) {
  if (DEFAULT_SETTINGS.personas[personaId]) {
    settings.personas[personaId] = { ...DEFAULT_SETTINGS.personas[personaId] };
  }
}

/**
 * Reset all settings to defaults
 */
export function resetAllSettings() {
  settings = { ...DEFAULT_SETTINGS };
}
