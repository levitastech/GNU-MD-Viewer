// One pending timer/poll per active document, never overlapping reads.
export const watchDocument = (
  poll: () => Promise<boolean>,
  reload: () => Promise<void>,
  onError: (error: unknown) => void,
): (() => void) => {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const check = async (): Promise<void> => {
    try {
      const changed = await poll();
      if (!stopped && changed) await reload();
    } catch (error) {
      if (!stopped) onError(error);
    } finally {
      if (!stopped)
        timer = setTimeout(() => {
          void check();
        }, 150);
    }
  };
  timer = setTimeout(() => {
    void check();
  }, 150);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
};
