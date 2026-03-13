import type { AIDecision, DecisionKind } from '../types';

const ALLOWED_DECISIONS = new Set<DecisionKind>(['favorite', 'skip', 'unsure']);

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

export function extractJsonObject(input: string): string {
  const start = input.indexOf('{');
  const end = input.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('模型返回中未找到 JSON 对象');
  }

  return input.slice(start, end + 1);
}

export function normalizeAIDecision(value: unknown): AIDecision {
  if (!value || typeof value !== 'object') {
    throw new Error('模型返回格式无效');
  }

  const record = value as Record<string, unknown>;
  const decision = typeof record.decision === 'string' ? (record.decision.trim() as DecisionKind) : 'unsure';
  if (!ALLOWED_DECISIONS.has(decision)) {
    throw new Error(`不支持的 decision: ${String(record.decision)}`);
  }

  const reason = typeof record.reason === 'string' ? record.reason.trim() : '';
  const confidenceValue = Number(record.confidence);
  const confidence = Number.isFinite(confidenceValue) ? Math.min(1, Math.max(0, confidenceValue)) : 0;

  return {
    decision,
    reason: reason || '模型未提供原因',
    matched: toStringArray(record.matched),
    missing: toStringArray(record.missing),
    confidence
  };
}
