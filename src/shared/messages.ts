import type {
  CandidateEvidence,
  DebugLogEntry,
  ExtensionSettings,
  PageSupportStatus,
  RunPlan,
  RunSummary,
  RuntimeStatus
} from './types';

export type BackgroundRequest =
  | { type: 'GET_PAGE_STATUS' }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: ExtensionSettings }
  | { type: 'GET_RUNTIME_STATUS' }
  | { type: 'GET_LAST_SUMMARY' }
  | { type: 'DEV_RELOAD_EXTENSION' }
  | { type: 'START_RUN'; plan: RunPlan }
  | { type: 'STOP_RUN' };

export type BackgroundResponse =
  | { ok: true; pageStatus: PageSupportStatus }
  | { ok: true; settings: ExtensionSettings }
  | { ok: true; runtime: RuntimeStatus }
  | { ok: true; summary: RunSummary | null }
  | { ok: true; accepted?: boolean }
  | { ok: false; error: string };

export type ContentRequest =
  | { type: 'GET_PAGE_STATUS' }
  | { type: 'PROCESS_CANDIDATE'; index: number }
  | { type: 'CLICK_FAVORITE' }
  | { type: 'DEV_PREPARE_RELOAD' }
  | { type: 'PUSH_DEBUG_LOG'; entry: DebugLogEntry }
  | { type: 'SET_DEBUG_MODE'; enabled: boolean }
  | { type: 'UPDATE_OVERLAY'; runtime: RuntimeStatus }
  | { type: 'SHOW_COMPLETION'; summary: RunSummary }
  | { type: 'SHOW_ERROR'; message: string };

export type ContentResponse =
  | { ok: true; pageStatus: PageSupportStatus }
  | { ok: true; evidence: CandidateEvidence | null }
  | { ok: true; favorited: boolean }
  | { ok: true }
  | { ok: false; error: string };
