import type { RunDefaults, RunPlan } from '../types';

export interface RunPlanInput {
  keywordsMustMatch?: string;
  keywordsOptional?: string;
  keywordsExclude?: string;
  notesForAI?: string;
  maxItems?: number | string;
  delayMs?: number | string;
  skipIfAlreadyFavorited?: boolean;
}

function parseKeywordList(value: string | undefined): string[] {
  return (value ?? '')
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRunPlan(input: RunPlanInput): RunPlan {
  const maxItemsValue = Number(input.maxItems ?? 20);
  const delayMsValue = Number(input.delayMs ?? 1200);

  return {
    keywordsMustMatch: parseKeywordList(input.keywordsMustMatch),
    keywordsOptional: parseKeywordList(input.keywordsOptional),
    keywordsExclude: parseKeywordList(input.keywordsExclude),
    notesForAI: (input.notesForAI ?? '').trim(),
    maxItems: Number.isFinite(maxItemsValue) ? clampNumber(Math.round(maxItemsValue), 1, 500) : 20,
    delayMs: Number.isFinite(delayMsValue) ? clampNumber(Math.round(delayMsValue), 300, 20_000) : 1200,
    skipIfAlreadyFavorited: input.skipIfAlreadyFavorited ?? true,
    screenshotMode: 'always'
  };
}

export function defaultsToRunPlan(defaults: RunDefaults): RunPlan {
  return normalizeRunPlan(defaults);
}
