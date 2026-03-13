import { OpenAICompatibleProvider } from '../ai/providers/openai';
import type {
  AIDecision,
  CandidateEvidence,
  ExtensionSettings,
  PageSupportStatus,
  RunPlan,
  RunSummary,
  RuntimeStatus
} from '../shared/types';
import { saveLastSummary } from '../shared/storage';
import { runnerStateLabels, type RunnerState } from './stateMachine';

interface RunnerDependencies {
  getPageStatus(): Promise<chrome.tabs.Tab>;
  requestPageStatus(tabId: number): Promise<PageSupportStatus>;
  processCandidate(tabId: number, index: number): Promise<CandidateEvidence>;
  clickFavorite(tabId: number): Promise<boolean>;
  captureVisibleTab(windowId?: number): Promise<string>;
  updateOverlay(tabId: number, runtime: RuntimeStatus): Promise<void>;
  showCompletion(tabId: number, summary: RunSummary): Promise<void>;
  showError(tabId: number, message: string): Promise<void>;
  getSettings(): Promise<ExtensionSettings>;
}

export class AutomationRunner {
  private runtime: RuntimeStatus = {
    state: 'idle',
    message: '等待任务',
    processed: 0,
    total: 0,
    favorited: 0,
    stopRequested: false
  };
  private isRunning = false;
  private stopRequested = false;

  constructor(private readonly deps: RunnerDependencies) {}

  getRuntimeStatus(): RuntimeStatus {
    return this.runtime;
  }

  requestStop(): void {
    this.stopRequested = true;
    this.runtime = {
      ...this.runtime,
      state: 'stopping',
      stopRequested: true,
      message: '停止中'
    };
  }

  async run(plan: RunPlan): Promise<void> {
    if (this.isRunning) {
      throw new Error('已有任务正在运行');
    }

    this.isRunning = true;
    this.stopRequested = false;

    const startedAt = new Date().toISOString();
    let tabId: number | undefined;

    try {
      const settings = await this.deps.getSettings();
      this.ensureProviderSettings(settings);

      const tab = await this.deps.getPageStatus();
      tabId = tab.id;
      if (tabId === undefined) {
        throw new Error('当前标签页无效');
      }

      const pageStatus = await this.deps.requestPageStatus(tabId);
      if (!pageStatus.supported) {
        throw new Error(pageStatus.reason ?? '当前页面不受支持');
      }

      const provider = new OpenAICompatibleProvider();
      const results: RunSummary['items'] = [];
      let favorited = 0;
      let skipped = 0;
      let alreadyFavorited = 0;
      let errors = 0;
      const total = Math.min(pageStatus.candidateCount, plan.maxItems);

      this.updateState('precheck', {
        processed: 0,
        total,
        favorited,
        currentLabel: undefined,
        message: total > 0 ? runnerStateLabels.precheck : '未找到可处理条目'
      });
      await this.syncOverlay(tabId);

      for (let index = 0; index < total; index += 1) {
        if (this.stopRequested) {
          this.updateState('stopped', { message: '用户停止了任务' });
          break;
        }

        this.updateState('open-item', { currentLabel: `条目 ${index + 1}` });
        await this.syncOverlay(tabId);

        try {
          const evidence = await this.deps.processCandidate(tabId, index);
          this.updateState('capture-evidence', { currentLabel: evidence.label });
          await this.syncOverlay(tabId);

          if (plan.skipIfAlreadyFavorited && evidence.alreadyFavorited) {
            alreadyFavorited += 1;
            results.push({
              index,
              label: evidence.label,
              itemId: evidence.itemId,
              action: 'already-favorited',
              reason: '该条目已收藏'
            });
            this.markProcessed(index + 1, favorited, evidence.label);
            await this.syncOverlay(tabId);
            await this.delay(plan.delayMs);
            continue;
          }

          this.updateState('request-decision', { currentLabel: evidence.label });
          await this.syncOverlay(tabId);

          const screenshotDataUrl = await this.deps.captureVisibleTab(tab.windowId);
          const decision = await provider.decide({
            evidence,
            screenshotDataUrl,
            plan,
            settings: settings.provider
          });

          const action = await this.applyDecision(tabId, decision);
          if (action === 'favorited') {
            favorited += 1;
          } else {
            skipped += 1;
          }

          results.push({
            index,
            label: evidence.label,
            itemId: evidence.itemId,
            action,
            reason: decision.reason,
            decision
          });
        } catch (error) {
          errors += 1;
          const message = error instanceof Error ? error.message : String(error);
          results.push({
            index,
            label: `条目 ${index + 1}`,
            itemId: `item-${index}`,
            action: 'error',
            reason: message
          });
          await this.deps.showError(tabId, message);
        }

        this.markProcessed(index + 1, favorited, this.runtime.currentLabel);
        await this.syncOverlay(tabId);
        await this.delay(plan.delayMs);
      }

      const summary: RunSummary = {
        startedAt,
        completedAt: new Date().toISOString(),
        processed: results.length,
        favorited,
        skipped,
        alreadyFavorited,
        errors,
        items: results
      };

      await saveLastSummary(summary);
      this.updateState(this.stopRequested ? 'stopped' : 'complete', {
        processed: results.length,
        total,
        favorited,
        currentLabel: undefined,
        message: this.stopRequested ? '任务已停止' : '任务完成'
      });
      await this.syncOverlay(tabId);
      await this.deps.showCompletion(tabId, summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateState('error', { message });
      if (tabId !== undefined) {
        await this.syncOverlay(tabId);
        await this.deps.showError(tabId, message);
      }
    } finally {
      this.isRunning = false;
      this.stopRequested = false;
      if (this.runtime.state === 'running') {
        this.runtime = {
          ...this.runtime,
          state: 'idle',
          stopRequested: false,
          currentLabel: undefined
        };
      }
    }
  }

  private ensureProviderSettings(settings: ExtensionSettings): void {
    if (!settings.provider.baseUrl.trim() || !settings.provider.apiKey.trim()) {
      throw new Error('请先在设置页配置 baseUrl 和 apiKey');
    }
  }

  private async applyDecision(tabId: number, decision: AIDecision): Promise<'favorited' | 'skipped'> {
    if (decision.decision !== 'favorite') {
      return 'skipped';
    }

    this.updateState('apply-action', { message: '执行收藏动作' });
    await this.syncOverlay(tabId);
    const favorited = await this.deps.clickFavorite(tabId);
    return favorited ? 'favorited' : 'skipped';
  }

  private markProcessed(processed: number, favorited: number, currentLabel?: string): void {
    this.updateState('record-result', {
      processed,
      favorited,
      currentLabel,
      message: `已处理 ${processed} 条`
    });
  }

  private updateState(state: RunnerState, partial: Partial<RuntimeStatus> = {}): void {
    this.runtime = {
      ...this.runtime,
      state: state === 'complete' ? 'complete' : state === 'error' ? 'error' : state === 'stopped' ? 'stopping' : 'running',
      message: partial.message ?? runnerStateLabels[state],
      stopRequested: this.stopRequested,
      ...partial
    };
  }

  private async syncOverlay(tabId: number): Promise<void> {
    await this.deps.updateOverlay(tabId, this.runtime);
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => globalThis.setTimeout(resolve, ms));
  }
}
