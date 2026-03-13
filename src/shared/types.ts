export type DecisionKind = 'favorite' | 'skip' | 'unsure';
export type RuntimeState = 'idle' | 'running' | 'stopping' | 'complete' | 'error';

export interface ProviderSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface RunDefaults {
  keywordsMustMatch: string;
  keywordsOptional: string;
  keywordsExclude: string;
  notesForAI: string;
  maxItems: number;
  delayMs: number;
  skipIfAlreadyFavorited: boolean;
}

export interface DebugSettings {
  enabled: boolean;
}

export interface ExtensionSettings {
  provider: ProviderSettings;
  defaults: RunDefaults;
  debug: DebugSettings;
}

export interface RunPlan {
  keywordsMustMatch: string[];
  keywordsOptional: string[];
  keywordsExclude: string[];
  notesForAI: string;
  maxItems: number;
  delayMs: number;
  skipIfAlreadyFavorited: boolean;
  screenshotMode: 'always';
}

export interface AIDecision {
  decision: DecisionKind;
  reason: string;
  matched: string[];
  missing: string[];
  confidence: number;
}

export interface PageSupportStatus {
  supported: boolean;
  url: string;
  reason?: string;
  candidateCount: number;
}

export interface CandidateEvidence {
  index: number;
  label: string;
  itemId: string;
  detailText: string;
  summaryText: string;
  tags: string[];
  alreadyFavorited: boolean;
}

export interface RunItemResult {
  index: number;
  label: string;
  itemId: string;
  action: 'favorited' | 'skipped' | 'already-favorited' | 'error';
  reason: string;
  decision?: AIDecision;
}

export interface RunSummary {
  startedAt: string;
  completedAt: string;
  processed: number;
  favorited: number;
  skipped: number;
  alreadyFavorited: number;
  errors: number;
  items: RunItemResult[];
}

export interface RuntimeStatus {
  state: RuntimeState;
  message: string;
  processed: number;
  total: number;
  favorited: number;
  currentLabel?: string;
  stopRequested: boolean;
}
