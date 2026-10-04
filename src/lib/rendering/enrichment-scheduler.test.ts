import { describe, expect, it, vi } from 'vitest';

import {
  EnrichmentCancelledError,
  EnrichmentQueueFullError,
  EnrichmentScheduler,
} from './enrichment-scheduler';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('scheduler des enrichisseurs', () => {
  it('borne les travaux actifs et démarre la file dans l’ordre', async () => {
    const first = deferred();
    const second = deferred();
    const third = deferred();
    const started: number[] = [];
    const scheduler = new EnrichmentScheduler(2, 2);

    const jobs = [first, second, third].map((gate, index) =>
      scheduler.schedule(async () => {
        started.push(index);
        await gate.promise;
        return index;
      }),
    );

    await vi.waitFor(() => expect(started).toEqual([0, 1]));
    first.resolve();
    await vi.waitFor(() => expect(started).toEqual([0, 1, 2]));
    second.resolve();
    third.resolve();
    await expect(Promise.all(jobs)).resolves.toEqual([0, 1, 2]);
  });

  it('annule un travail en file sans le lancer', async () => {
    const active = deferred();
    const controller = new AbortController();
    const queued = vi.fn(async () => 'indésirable');
    const scheduler = new EnrichmentScheduler(1, 1);

    const first = scheduler.schedule(async () => active.promise);
    const second = scheduler.schedule(queued, controller.signal);
    controller.abort();
    active.resolve();

    await first;
    await expect(second).rejects.toBeInstanceOf(EnrichmentCancelledError);
    expect(queued).not.toHaveBeenCalled();
  });

  it('refuse immédiatement au-delà de la file bornée', async () => {
    const active = deferred();
    const scheduler = new EnrichmentScheduler(1, 1);
    const first = scheduler.schedule(async () => active.promise);
    const queued = scheduler.schedule(async () => undefined);

    await expect(
      scheduler.schedule(async () => undefined),
    ).rejects.toBeInstanceOf(EnrichmentQueueFullError);
    active.resolve();
    await Promise.all([first, queued]);
  });
});
