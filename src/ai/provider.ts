import type { AIDecision, CandidateEvidence, ProviderSettings, RunPlan } from '../shared/types';

export interface DecisionInput {
  evidence: CandidateEvidence;
  screenshotDataUrl: string;
  plan: RunPlan;
  settings: ProviderSettings;
}

export interface DecisionResult {
  prompt: string;
  rawOutput: string;
  decision: AIDecision;
}

export interface AIProvider {
  decide(input: DecisionInput): Promise<DecisionResult>;
}
