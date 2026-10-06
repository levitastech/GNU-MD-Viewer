// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeActiveSection } from './active-section';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const setup = (withHeadings = true) => {
  document.body.innerHTML = '<main class="reader"><article></article></main>';
  const root = document.querySelector<HTMLElement>('main')!;
  const article = document.querySelector<HTMLElement>('article')!;
  article.innerHTML = withHeadings
    ? '<h1 data-mdv-heading="a">A</h1><h2 data-mdv-heading="b">B</h2><h2 data-mdv-heading="c">C</h2>'
    : '<p>Sans titre</p>';
  let tops = [100, 800, 1800];
  Object.defineProperties(root, {
    clientHeight: { value: 500 },
    scrollHeight: { value: 2300 },
  });
  const measurements = Array.from(
    article.querySelectorAll<HTMLElement>('[data-mdv-heading]'),
    (heading, index) =>
      vi
        .spyOn(heading, 'getBoundingClientRect')
        .mockImplementation(
          () => ({ top: tops[index]! - root.scrollTop }) as DOMRect,
        ),
  );
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  let resize!: () => void;
  const disconnect = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
    },
  );
  const onSection = vi.fn();
  const stop = observeActiveSection(article, onSection);
  const flush = () => {
    frames.splice(0).forEach((callback) => callback(0));
  };
  const scroll = (top: number) => {
    root.scrollTop = top;
    root.dispatchEvent(new Event('scroll'));
    flush();
  };
  return {
    root,
    article,
    onSection,
    stop,
    flush,
    scroll,
    measurements,
    resize: () => resize(),
    disconnect,
    move: (values: number[]) => {
      tops = values;
    },
  };
};

describe('section active L11', () => {
  it('suit un saut rapide et le retour sans remesurer les titres au scroll', () => {
    const fixture = setup();
    fixture.flush();
    expect(fixture.onSection.mock.calls).toEqual([[null], ['a']]);
    fixture.scroll(1700);
    expect(fixture.onSection).toHaveBeenLastCalledWith('b');
    fixture.scroll(1800);
    expect(fixture.onSection).toHaveBeenLastCalledWith('c');
    fixture.scroll(300);
    expect(fixture.onSection).toHaveBeenLastCalledWith('a');
    for (const measure of fixture.measurements)
      expect(measure).toHaveBeenCalledTimes(1);
    fixture.stop();
  });

  it('recalibre les positions après layout ou chargement sans changer le focus', () => {
    const fixture = setup();
    fixture.flush();
    fixture.move([100, 400, 1800]);
    fixture.root.scrollTop = 500;
    fixture.resize();
    fixture.flush();
    expect(fixture.onSection).toHaveBeenLastCalledWith('b');
    fixture.article.dispatchEvent(new Event('load'));
    fixture.flush();
    for (const measure of fixture.measurements)
      expect(measure).toHaveBeenCalledTimes(3);
    expect(document.activeElement).toBe(document.body);
    fixture.stop();
  });

  it('neutralise les callbacks tardifs et retire listeners/observer à la fermeture', () => {
    const fixture = setup();
    fixture.flush();
    fixture.resize();
    fixture.stop();
    const calls = fixture.onSection.mock.calls.length;
    fixture.flush();
    fixture.scroll(1800);
    fixture.resize();
    fixture.flush();
    expect(fixture.onSection).toHaveBeenCalledTimes(calls);
    expect(fixture.disconnect).toHaveBeenCalledOnce();
    expect(window.cancelAnimationFrame).toHaveBeenCalledOnce();
  });

  it('réinitialise sans abonnement pour un document sans titre', () => {
    const fixture = setup(false);
    fixture.flush();
    expect(fixture.onSection.mock.calls).toEqual([[null]]);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    fixture.stop();
  });
});
