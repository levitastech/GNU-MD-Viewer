import { describe, expect, it } from 'vitest';

import { APP_NAME, APP_VERSION, BOOTSTRAP_MESSAGE } from './metadata';

describe('métadonnées du socle', () => {
  it('expose le nom et un message de bootstrap non vides', () => {
    expect(APP_NAME).toBe('GNU-MD Viewer');
    expect(APP_VERSION).toBe('0.3.0');
    expect(BOOTSTRAP_MESSAGE.trim()).not.toBe('');
  });
});
