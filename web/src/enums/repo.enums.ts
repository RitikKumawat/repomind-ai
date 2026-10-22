export enum RepoStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
  FAILED = 'FAILED',
}

export enum IndexingPhase {
  QUEUED = 'QUEUED',
  FETCHING = 'FETCHING',
  PARSING = 'PARSING',
  INDEXING = 'INDEXING',
  READY = 'READY',
  FAILED = 'FAILED',
}
