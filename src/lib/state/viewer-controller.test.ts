// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import type {
  DocumentService,
  DocumentSnapshot,
  RenderService,
  ResourceService,
} from '../contracts/document';
import {
  toDocumentId,
  toResourceToken,
  toSessionId,
} from '../contracts/document';
import { renderMarkdown } from '../markdown/engine';
import { OpenCoordinator } from './open-coordinator';
import { ViewerController } from './viewer-controller';

const snapshot = (name: string): DocumentSnapshot => ({
  documentId: toDocumentId(`document-${name}`),
  sessionId: toSessionId(`session-${name}`),
  text: `# ${name}`,
  displayName: `${name}.md`,
  encoding: 'utf-8',
  revision: 1,
});

const setup = (openFirst: DocumentService['openFirst']) => {
  const documents: DocumentService = {
    selectDocument: vi.fn(async () => ({ paths: ['opaque-selection'] })),
    openFirst,
    releaseSession: vi.fn(async () => undefined),
  };
  const renderer: RenderService = {
    render: async (document) => renderMarkdown(document.text),
  };
  const resources: ResourceService = {
    resolve: async () => ({
      token: toResourceToken('unused'),
      url: 'unused:',
      mime: 'image/png',
      encodedBytes: 0,
      width: 1,
      height: 1,
    }),
    releaseSession: vi.fn(async () => undefined),
  };
  const coordinator = new OpenCoordinator(documents, renderer, resources);
  return {
    documents,
    controller: new ViewerController(documents, coordinator),
  };
};

describe('cycle UI L08', () => {
  it('passe de vide à chargement puis prêt avec un HTML sanitisé', async () => {
    const { controller } = setup(async () => snapshot('guide'));
    const phases: string[] = [];
    controller.subscribe((state) => phases.push(state.phase));

    await controller.openFromDialog();

    expect(phases).toEqual(['empty', 'opening', 'ready']);
    expect(controller.current.active).toMatchObject({
      displayName: 'guide.md',
      headingCount: 1,
    });
    expect(controller.current.active?.html).toContain('data-mdv-heading');
  });

  it('conserve le dernier rendu valide quand le candidat échoue', async () => {
    let call = 0;
    const { controller } = setup(async () => {
      call += 1;
      if (call === 2) {
        throw { code: 'invalid_utf8', message: 'UTF-8 invalide' };
      }
      return snapshot('valide');
    });

    await controller.openFromDialog();
    await controller.openFromDialog();

    expect(controller.current.phase).toBe('ready');
    expect(controller.current.active?.displayName).toBe('valide.md');
    expect(controller.current.error).toEqual({
      code: 'invalid_utf8',
      message: 'UTF-8 invalide',
    });
  });

  it('revient à l’état précédent si le dialogue est annulé', async () => {
    const { controller, documents } = setup(async () => snapshot('unused'));
    vi.mocked(documents.selectDocument).mockResolvedValueOnce(null);

    await controller.openFromDialog();

    expect(controller.current).toEqual({
      phase: 'empty',
      active: null,
      error: null,
      ignoredPaths: 0,
    });
  });
});
