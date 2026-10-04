import { LIMITS } from '../contracts/limits';

export class EnrichmentCancelledError extends Error {
  constructor() {
    super('Travail d’enrichissement annulé.');
    this.name = 'EnrichmentCancelledError';
  }
}

export class EnrichmentQueueFullError extends Error {
  constructor() {
    super('File d’enrichissement saturée.');
    this.name = 'EnrichmentQueueFullError';
  }
}

interface QueuedJob<Value> {
  readonly signal?: AbortSignal;
  readonly run: () => Promise<Value>;
  readonly resolve: (value: Value) => void;
  readonly reject: (reason: unknown) => void;
}

export class EnrichmentScheduler {
  private activeJobs = 0;
  private readonly queue: QueuedJob<unknown>[] = [];

  constructor(
    private readonly concurrency: number = LIMITS.enrichmentConcurrentJobs,
    private readonly queueLimit: number = LIMITS.enrichmentQueuedJobs,
  ) {
    if (concurrency < 1 || queueLimit < 0) {
      throw new RangeError('Configuration de scheduler invalide.');
    }
  }

  schedule<Value>(
    run: () => Promise<Value>,
    signal?: AbortSignal,
  ): Promise<Value> {
    if (signal?.aborted) {
      return Promise.reject(new EnrichmentCancelledError());
    }

    if (
      this.activeJobs >= this.concurrency &&
      this.queue.length >= this.queueLimit
    ) {
      return Promise.reject(new EnrichmentQueueFullError());
    }

    return new Promise<Value>((resolve, reject) => {
      this.queue.push({ run, signal, resolve, reject } as QueuedJob<unknown>);
      this.pump();
    });
  }

  private pump(): void {
    while (this.activeJobs < this.concurrency) {
      const job = this.queue.shift();
      if (!job) return;
      if (job.signal?.aborted) {
        job.reject(new EnrichmentCancelledError());
        continue;
      }

      this.activeJobs += 1;
      void job
        .run()
        .then((value) => {
          if (job.signal?.aborted) {
            job.reject(new EnrichmentCancelledError());
          } else {
            job.resolve(value);
          }
        })
        .catch(job.reject)
        .finally(() => {
          this.activeJobs -= 1;
          this.pump();
        });
    }
  }
}
