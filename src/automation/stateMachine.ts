export type RunnerState =
  | 'idle'
  | 'precheck'
  | 'scan-list'
  | 'open-item'
  | 'capture-evidence'
  | 'request-decision'
  | 'apply-action'
  | 'record-result'
  | 'complete'
  | 'stopped'
  | 'error';

export const runnerStateLabels: Record<RunnerState, string> = {
  idle: '空闲',
  precheck: '检查页面状态',
  'scan-list': '读取候选人列表',
  'open-item': '打开候选人详情',
  'capture-evidence': '采集页面证据',
  'request-decision': '请求模型判断',
  'apply-action': '执行收藏动作',
  'record-result': '记录处理结果',
  complete: '已完成',
  stopped: '已停止',
  error: '发生异常'
};
