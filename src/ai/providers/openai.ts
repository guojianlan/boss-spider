import { createDecisionPrompt } from '../prompts/decisionPrompt';
import { extractJsonObject, normalizeAIDecision } from '../../shared/schema/aiDecision';
import type { AIProvider, DecisionInput } from '../provider';

type MessageContent = string | Array<{ type?: string; text?: string }> | undefined;

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: MessageContent;
    };
  }>;
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '');
  if (!trimmed) {
    throw new Error('请先配置 baseUrl');
  }
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

function getTextContent(content: MessageContent): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((item) => item.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text)
      .join('\n');
  }

  return '';
}

export class OpenAICompatibleProvider implements AIProvider {
  async decide(input: DecisionInput) {
    const endpoint = `${normalizeBaseUrl(input.settings.baseUrl)}/chat/completions`;
    const prompt = createDecisionPrompt(input.plan, input.evidence);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.settings.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: input.settings.model.trim() || 'gpt-4.1-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: '你是一个严格输出 JSON 的候选人筛选助手。'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: input.screenshotDataUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`模型请求失败: ${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const rawContent = getTextContent(payload.choices?.[0]?.message?.content);
    const jsonText = extractJsonObject(rawContent);
    return normalizeAIDecision(JSON.parse(jsonText));
  }
}
