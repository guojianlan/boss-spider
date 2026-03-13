import type { CandidateEvidence, RunPlan } from '../../shared/types';

function section(title: string, content: string): string {
  return `${title}\n${content.trim() || '无'}\n`;
}

export function createDecisionPrompt(plan: RunPlan, evidence: CandidateEvidence): string {
  return [
    '你是一个职位筛选助手。你只能根据用户给定的规则，对当前职位输出是否应该收藏。',
    '只能返回 JSON，不要输出 Markdown，不要输出额外说明。',
    '输出格式必须是：{"decision":"favorite|skip|unsure","reason":"...","matched":["..."],"missing":["..."],"confidence":0.0}',
    '如果信息不足，返回 unsure。',
    section('必须命中的关键词：', plan.keywordsMustMatch.join('，')),
    section('加分关键词：', plan.keywordsOptional.join('，')),
    section('排除关键词：', plan.keywordsExclude.join('，')),
    section('用户补充说明：', plan.notesForAI),
    section('左侧摘要：', evidence.summaryText),
    section('右侧详情文本：', evidence.detailText),
    section('页面标签：', evidence.tags.join('，')),
    `当前职位/公司摘要：${evidence.label}`,
    `当前职位是否已收藏：${evidence.alreadyFavorited ? '是' : '否'}`,
    '请结合职位要求、公司信息、行业/阶段/规模、关键词匹配情况判断是否值得收藏。'
  ].join('\n');
}
