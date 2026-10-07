import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchDocument } from './watch-document';
afterEach(() => vi.useRealTimers());
describe('L17 propriétaire du polling', () => {
  it('ne cumule aucun timer après 50 changements et ignore un poll tardif', async () => {
    vi.useFakeTimers();
    const poll = vi.fn(async () => false);
    for (let cycle = 0; cycle < 50; cycle++) {
      const stop = watchDocument(
        poll,
        async () => {},
        () => {},
      );
      await vi.advanceTimersByTimeAsync(150);
      stop();
    }
    expect(vi.getTimerCount()).toBe(0);
    let resolve!: (changed: boolean) => void;
    const reload = vi.fn(async () => {});
    const stop = watchDocument(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
      reload,
      () => {},
    );
    await vi.advanceTimersByTimeAsync(150);
    stop();
    resolve(true);
    await Promise.resolve();
    expect(reload).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('garde la boucle après une erreur et déclenche une seule relecture à la fois', async () => {
    vi.useFakeTimers();
    const error = new Error('absent');
    const poll = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    const reload = vi.fn(async () => {});
    const onError = vi.fn();
    const stop = watchDocument(poll, reload, onError);
    await vi.advanceTimersByTimeAsync(450);
    stop();
    expect(onError).toHaveBeenCalledWith(error);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
