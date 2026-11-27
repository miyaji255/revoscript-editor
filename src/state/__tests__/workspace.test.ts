import { describe, expect, it } from 'vitest';
import {
  closeTab,
  createInitialWorkspace,
  createTab,
  duplicateTab,
  getActiveTab,
  LEGACY_CODE_KEY,
  LEGACY_LANG_KEY,
  renameTab,
  saveWorkspace,
  selectTab,
  setLocale,
  setTheme,
  updateTabContent,
  WORKSPACE_STORAGE_KEY,
  type StorageLike,
} from '../workspace.ts';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
}

describe('workspace state', () => {
  it('migrates legacy v1 localStorage keys cleanly', () => {
    const storage = createMemoryStorage({
      [LEGACY_CODE_KEY]: 'Prestige()\nRestart()\n',
      [LEGACY_LANG_KEY]: 'en',
    });

    const state = createInitialWorkspace(storage);
    expect(state.locale).toBe('en');
    expect(state.tabs).toHaveLength(1);
    expect(getActiveTab(state).content).toBe('Prestige()\nRestart()\n');
  });

  it('persists and restores v2 workspace state', () => {
    const storage = createMemoryStorage();
    let state = createInitialWorkspace(storage);
    state = createTab(state, { name: 'custom.revo', content: 'Eternate()\n' });
    state = setTheme(state, 'light');
    state = setLocale(state, 'en');
    saveWorkspace(state, storage);

    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).not.toBeNull();
    const restored = createInitialWorkspace(storage);
    expect(restored.tabs).toHaveLength(2);
    expect(getActiveTab(restored).name).toBe('custom.revo');
    expect(restored.theme).toBe('light');
    expect(restored.locale).toBe('en');
  });

  it('supports tab CRUD, duplicate, rename, and refuses closing the last tab', () => {
    let state = createInitialWorkspace(createMemoryStorage());
    const firstId = state.tabs[0]!.id;

    // Cannot close the last remaining tab
    expect(closeTab(state, firstId).tabs).toHaveLength(1);

    state = createTab(state, { name: 'second.revo', content: 'Infinite()' });
    expect(state.tabs).toHaveLength(2);
    const secondId = state.activeTabId;

    state = duplicateTab(state, secondId);
    expect(state.tabs).toHaveLength(3);
    expect(getActiveTab(state).name).toBe('second-copy.revo');
    expect(getActiveTab(state).content).toBe('Infinite()');

    state = renameTab(state, state.activeTabId, 'renamed.revo');
    expect(getActiveTab(state).name).toBe('renamed.revo');

    // Ignores blank renames
    state = renameTab(state, state.activeTabId, '   ');
    expect(getActiveTab(state).name).toBe('renamed.revo');

    state = updateTabContent(state, state.activeTabId, 'Eternate()');
    expect(getActiveTab(state).content).toBe('Eternate()');

    state = selectTab(state, firstId);
    expect(state.activeTabId).toBe(firstId);

    state = closeTab(state, secondId);
    expect(state.tabs).toHaveLength(2);
  });
});
