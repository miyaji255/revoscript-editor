import type { Locale } from '../core/spec.ts';
import { MACRO_TEMPLATES } from '../core/templates.ts';
import type { ThemeMode } from '../editor/theme.ts';

export const WORKSPACE_STORAGE_KEY = 'revoscript.workspace.v2';
export const LEGACY_CODE_KEY = 'revo-code';
export const LEGACY_LANG_KEY = 'revo-lang';

export interface MacroTab {
  readonly id: string;
  readonly name: string;
  readonly content: string;
  readonly updatedAt: number;
}

export interface WorkspaceState {
  readonly tabs: readonly MacroTab[];
  readonly activeTabId: string;
  readonly locale: Locale;
  readonly theme: ThemeMode;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

let idCounter = 0;

function nextTabId(): string {
  idCounter += 1;
  return `tab-${Date.now().toString(36)}-${idCounter}`;
}

function defaultScript(): string {
  return (
    MACRO_TEMPLATES[0]?.code ??
    'WaitUntil (IP >= 1000)\nif (IP >= 1000)\n\tBreakInfinity(false)\n\tEnterIC(1, true)\n\tBreakInfinity(true)\n'
  );
}

function makeDefaultTab(name = 'ic-auto.revo', content = defaultScript()): MacroTab {
  return {
    id: nextTabId(),
    name,
    content,
    updatedAt: Date.now(),
  };
}

function isValidLocale(value: unknown): value is Locale {
  return value === 'ja' || value === 'en';
}

function isValidTheme(value: unknown): value is ThemeMode {
  return value === 'dark' || value === 'light';
}

function isValidTab(value: unknown): value is MacroTab {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    obj.id.length > 0 &&
    typeof obj.name === 'string' &&
    obj.name.length > 0 &&
    typeof obj.content === 'string'
  );
}

export function createInitialWorkspace(storage?: Pick<StorageLike, 'getItem'>): WorkspaceState {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);

  if (store) {
    try {
      const raw = store.getItem(WORKSPACE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (Array.isArray(parsed.tabs)) {
          const validTabs = parsed.tabs.filter(isValidTab).map((t) => ({
            id: t.id,
            name: t.name,
            content: t.content,
            updatedAt: typeof t.updatedAt === 'number' ? t.updatedAt : Date.now(),
          }));

          if (validTabs.length > 0) {
            const activeExists =
              typeof parsed.activeTabId === 'string' &&
              validTabs.some((t) => t.id === parsed.activeTabId);

            return {
              tabs: validTabs,
              activeTabId: activeExists ? (parsed.activeTabId as string) : validTabs[0]!.id,
              locale: isValidLocale(parsed.locale) ? parsed.locale : 'ja',
              theme: isValidTheme(parsed.theme) ? parsed.theme : 'dark',
            };
          }
        }
      }

      const legacyCode = store.getItem(LEGACY_CODE_KEY);
      const legacyLang = store.getItem(LEGACY_LANG_KEY);
      if (legacyCode !== null || legacyLang !== null) {
        const migratedTab = makeDefaultTab(
          'macro.revo',
          legacyCode !== null ? legacyCode : defaultScript(),
        );
        return {
          tabs: [migratedTab],
          activeTabId: migratedTab.id,
          locale: isValidLocale(legacyLang) ? legacyLang : 'ja',
          theme: 'dark',
        };
      }
    } catch {
      // Fall back to clean default state if storage is malformed or inaccessible.
    }
  }

  const initialTab = makeDefaultTab();
  return {
    tabs: [initialTab],
    activeTabId: initialTab.id,
    locale: 'ja',
    theme: 'dark',
  };
}

export function saveWorkspace(
  state: WorkspaceState,
  storage?: Pick<StorageLike, 'setItem'>,
): void {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (!store) {
    return;
  }
  try {
    store.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors cleanly.
  }
}

export function getActiveTab(state: WorkspaceState): MacroTab {
  return state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0]!;
}

export function selectTab(state: WorkspaceState, tabId: string): WorkspaceState {
  if (state.activeTabId === tabId || !state.tabs.some((t) => t.id === tabId)) {
    return state;
  }
  return { ...state, activeTabId: tabId };
}

function generateUniqueTabName(tabs: readonly MacroTab[], base = 'macro'): string {
  const existing = new Set(tabs.map((t) => t.name));
  let index = tabs.length + 1;
  while (existing.has(`${base}-${index}.revo`)) {
    index++;
  }
  return `${base}-${index}.revo`;
}

export function createTab(
  state: WorkspaceState,
  options: { readonly name?: string; readonly content?: string } = {},
): WorkspaceState {
  const name = options.name?.trim() || generateUniqueTabName(state.tabs);
  const tab: MacroTab = {
    id: nextTabId(),
    name,
    content: options.content ?? '',
    updatedAt: Date.now(),
  };
  return {
    ...state,
    tabs: [...state.tabs, tab],
    activeTabId: tab.id,
  };
}

export function duplicateTab(state: WorkspaceState, tabId: string): WorkspaceState {
  const source = state.tabs.find((t) => t.id === tabId);
  if (!source) {
    return state;
  }
  const stem = source.name.replace(/(\.[^.]+)?$/, '');
  const extMatch = /(\.[^.]+)$/.exec(source.name);
  const ext = extMatch ? extMatch[1] : '.revo';
  const existing = new Set(state.tabs.map((t) => t.name));
  let copyName = `${stem}-copy${ext}`;
  let idx = 2;
  while (existing.has(copyName)) {
    copyName = `${stem}-copy-${idx}${ext}`;
    idx++;
  }

  const duplicated: MacroTab = {
    id: nextTabId(),
    name: copyName,
    content: source.content,
    updatedAt: Date.now(),
  };

  const sourceIdx = state.tabs.findIndex((t) => t.id === tabId);
  const nextTabs = [...state.tabs];
  nextTabs.splice(sourceIdx + 1, 0, duplicated);

  return {
    ...state,
    tabs: nextTabs,
    activeTabId: duplicated.id,
  };
}

export function closeTab(state: WorkspaceState, tabId: string): WorkspaceState {
  if (state.tabs.length <= 1) {
    return state;
  }
  const idx = state.tabs.findIndex((t) => t.id === tabId);
  if (idx === -1) {
    return state;
  }
  const nextTabs = state.tabs.filter((t) => t.id !== tabId);
  const nextActiveId =
    state.activeTabId === tabId
      ? (nextTabs[Math.min(idx, nextTabs.length - 1)]?.id ?? nextTabs[0]!.id)
      : state.activeTabId;

  return {
    ...state,
    tabs: nextTabs,
    activeTabId: nextActiveId,
  };
}

export function renameTab(state: WorkspaceState, tabId: string, nextName: string): WorkspaceState {
  const trimmed = nextName.trim();
  if (!trimmed) {
    return state;
  }
  return {
    ...state,
    tabs: state.tabs.map((t) =>
      t.id === tabId ? { ...t, name: trimmed, updatedAt: Date.now() } : t,
    ),
  };
}

export function updateTabContent(
  state: WorkspaceState,
  tabId: string,
  content: string,
): WorkspaceState {
  const target = state.tabs.find((t) => t.id === tabId);
  if (!target || target.content === content) {
    return state;
  }
  return {
    ...state,
    tabs: state.tabs.map((t) =>
      t.id === tabId ? { ...t, content, updatedAt: Date.now() } : t,
    ),
  };
}

export function setLocale(state: WorkspaceState, locale: Locale): WorkspaceState {
  return state.locale === locale ? state : { ...state, locale };
}

export function setTheme(state: WorkspaceState, theme: ThemeMode): WorkspaceState {
  return state.theme === theme ? state : { ...state, theme };
}
