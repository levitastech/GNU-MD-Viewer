import { invoke } from '@tauri-apps/api/core';
import type { ThemeMode } from '../state/reading-preferences';
export interface ReadingPreferences {
  readonly theme: ThemeMode;
  readonly zoom: number;
  readonly tocVisible: boolean;
}
export interface Recent {
  readonly id: string;
  readonly label: string;
}
export interface PreferenceView {
  readonly reading: ReadingPreferences;
  readonly recents: readonly Recent[];
  readonly notice: string | null;
  readonly writable: boolean;
}
export class TauriPreferenceService {
  load(): Promise<PreferenceView> {
    return invoke('load_preferences');
  }
  save(reading: ReadingPreferences): Promise<void> {
    return invoke('save_preferences', { reading });
  }
  clear(): Promise<void> {
    return invoke('clear_recent_documents');
  }
  forget(id: string): Promise<void> {
    return invoke('forget_recent_document', { id });
  }
}
