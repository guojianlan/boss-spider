import type { CandidateEvidence, RunPlan } from '../../shared/types';

function section(title: string, content: string): string {
  return `${title}\n${content.trim() || '无'}\n`;
}

export function createDecisionPrompt(plan: RunPlan, evidence: CandidateEvidence): string {
  const isCandidateMode = evidence.pageKind === 'candidate';
  const roleText = isCandidateMode ? '候选人筛选助手' : '职位筛选助手';
  const targetText = isCandidateMode ? '候选人' : '职位';
  const labelText = isCandidateMode ? '当前候选人摘要' : '当前职位/公司摘要';
  const summaryTitle = isCandidateMode ? '左侧候选人摘要：' : '左侧职位摘要：';
  const detailTitle = isCandidateMode ? '右侧候选人详情文本：' : '右侧职位详情文本：';
  const guidance = isCandidateMode
    ? '请结合候选人的工作经历、技能标签、行业背景、稳定性、近年经验和关键词匹配情况判断是否值得收藏。'
    : '请结合职位要求、公司信息、行业/阶段/规模、关键词匹配情况判断是否值得收藏。';

  return [
    `你是一个${roleText}。你只能根据用户给定的规则，对当前${targetText}输出是否应该收藏。`,
    '只能返回 JSON，不要输出 Markdown，不要输出额外说明。',
    '输出格式必须是：{"decision":"favorite|skip|unsure","reason":"...","matched":["..."],"missing":["..."],"confidence":0.0}',
    '如果信息不足，返回 unsure。',
    section('当前页面模式：', evidence.modeLabel),
    section('必须命中的关键词：', plan.keywordsMustMatch.join('，')),
    section('加分关键词：', plan.keywordsOptional.join('，')),
    section('排除关键词：', plan.keywordsExclude.join('，')),
    section('用户补充说明：', plan.notesForAI),
    section(summaryTitle, evidence.summaryText),
    section(detailTitle, evidence.detailText),
    section('页面标签：', evidence.tags.join('，')),
    `${labelText}：${evidence.label}`,
    `当前${targetText}是否已收藏：${evidence.alreadyFavorited ? '是' : '否'}`,
    guidance
  ].join('\n');
}
