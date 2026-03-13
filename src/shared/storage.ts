import type { ExtensionSettings, RunSummary } from './types';

const SETTINGS_KEY = 'settings';
const LAST_SUMMARY_KEY = 'lastSummary';

export const defaultSettings: ExtensionSettings = {
  provider: {
    baseUrl: '',
    apiKey: '',
    model: 'gpt-4.1-mini'
  },
  defaults: {
    keywordsMustMatch: '',
    keywordsOptional: '',
    keywordsExclude: '',
    notesForAI: '',
    maxItems: 20,
    delayMs: 1200,
    skipIfAlreadyFavorited: true
  },
  debug: {
    enabled: false
  }
};

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return mergeSettings(stored[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined);
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: mergeSettings(settings) });
}

export async function getLastSummary(): Promise<RunSummary | null> {
  const stored = await chrome.storage.local.get(LAST_SUMMARY_KEY);
  return (stored[LAST_SUMMARY_KEY] as RunSummary | undefined) ?? null;
}

export async function saveLastSummary(summary: RunSummary): Promise<void> {
  await chrome.storage.local.set({ [LAST_SUMMARY_KEY]: summary });
}

function mergeSettings(settings?: Partial<ExtensionSettings>): ExtensionSettings {
  return {
    provider: {
      ...defaultSettings.provider,
      ...(settings?.provider ?? {})
    },
    defaults: {
      ...defaultSettings.defaults,
      ...(settings?.defaults ?? {})
    },
    debug: {
      ...defaultSettings.debug,
      ...(settings?.debug ?? {})
    }
  };
}
