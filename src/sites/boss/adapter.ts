import type { CandidateEvidence, PageSupportStatus } from '../../shared/types';
import { clickFavorite, getPageSupportStatus, processCandidate } from './actions';

export interface BossAdapter {
  getPageStatus(): PageSupportStatus;
  processCandidate(index: number): Promise<CandidateEvidence | null>;
  clickFavorite(): Promise<boolean>;
}

export const bossAdapter: BossAdapter = {
  getPageStatus() {
    return getPageSupportStatus();
  },
  processCandidate(index) {
    return processCandidate(index);
  },
  clickFavorite() {
    return clickFavorite();
  }
};
