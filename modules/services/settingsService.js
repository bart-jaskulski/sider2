// Service for managing settings using localStorage

// Constants
const SETTINGS_STORAGE_KEY = 'geminiFlashSettings';

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
 * Load settings from localStorage
 * @returns {Promise} Promise that resolves when settings are loaded
 */
export async function loadSettings() {
  return new Promise((resolve) => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        settings = { ...DEFAULT_SETTINGS, ...parsedSettings };
        
        // Ensure all default personas exist
        for (const key in DEFAULT_SETTINGS.personas) {
          if (!settings.personas[key]) {
            settings.personas[key] = DEFAULT_SETTINGS.personas[key];
          }
        }
      }
      
      resolve(settings);
    } catch (error) {
      console.error('Error loading settings:', error);
      resolve(DEFAULT_SETTINGS);
    }
  });
}

/**
 * Save current settings to localStorage
 * @returns {Promise} Promise that resolves when settings are saved
 */
export async function saveSettings() {
  return new Promise((resolve) => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      resolve(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      resolve(false);
    }
  });
}

/**
 * Update a specific setting
 * @param {string} key - The setting key to update
 * @param {any} value - The new value
 * @returns {Promise} Promise that resolves when setting is updated and saved
 */
export async function updateSetting(key, value) {
  settings[key] = value;
  return saveSettings();
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
 * @returns {Promise} Promise that resolves when persona is updated and saved
 */
export async function updatePersona(personaId, personaData) {
  settings.personas[personaId] = { ...settings.personas[personaId], ...personaData };
  return saveSettings();
}

/**
 * Set current persona
 * @param {string} personaId - The ID of the persona to set as current
 * @returns {Promise} Promise that resolves when current persona is set and saved
 */
export async function setCurrentPersona(personaId) {
  if (settings.personas[personaId]) {
    settings.currentPersona = personaId;
    return saveSettings();
  }
  return Promise.resolve(false);
}

/**
 * Reset a persona to its default settings
 * @param {string} personaId - The ID of the persona to reset
 * @returns {Promise} Promise that resolves when persona is reset and saved
 */
export async function resetPersona(personaId) {
  if (DEFAULT_SETTINGS.personas[personaId]) {
    settings.personas[personaId] = { ...DEFAULT_SETTINGS.personas[personaId] };
    return saveSettings();
  }
  return Promise.resolve(false);
}

/**
 * Reset all settings to defaults
 * @returns {Promise} Promise that resolves when all settings are reset and saved
 */
export async function resetAllSettings() {
  settings = { ...DEFAULT_SETTINGS };
  return saveSettings();
}

/**
 * Export settings as JSON
 * @returns {string} JSON string of settings
 */
export function exportSettings() {
  return JSON.stringify(settings, null, 2);
}

/**
 * Import settings from JSON
 * @param {string} jsonData - The JSON string to import
 * @returns {Promise} Promise that resolves when settings are imported and saved
 */
export async function importSettings(jsonData) {
  try {
    const importedSettings = JSON.parse(jsonData);
    settings = { ...DEFAULT_SETTINGS, ...importedSettings };
    return saveSettings();
  } catch (error) {
    console.error('Error importing settings:', error);
    return Promise.resolve(false);
  }
}
