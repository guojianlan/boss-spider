import type { CandidateEvidence, PageSupportStatus } from '../../shared/types';
import { clickJobsFavorite, getJobsPageSupportStatus, processJob } from './actions';

export interface JobsAdapter {
  getPageStatus(): PageSupportStatus;
  processCandidate(index: number): Promise<CandidateEvidence>;
  clickFavorite(): Promise<boolean>;
}

export const jobsAdapter: JobsAdapter = {
  getPageStatus() {
    return getJobsPageSupportStatus();
  },
  processCandidate(index) {
    return processJob(index);
  },
  clickFavorite() {
    return clickJobsFavorite();
  }
};
