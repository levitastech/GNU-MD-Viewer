import { describe, expect, it, vi } from 'vitest';

import type {
  DocumentSelection,
  DocumentService,
  DocumentSnapshot,
  RenderResult,
  RenderService,
  ResourceService,
  SessionId,
} from '../contracts/document';
import {
  toDocumentId,
  toResourceToken,
  toSessionId,
} from '../contracts/document';
import { asUnsanitizedHtml } from '../rendering/sanitize';
import { OpenCoordinator } from './open-coordinator';

interface Deferred<Value> {
  readonly promise: Promise<Value>;
  resolve(value: Value): void;
}

const deferred = <Value>(): Deferred<Value> => {
  let resolve!: (value: Value) => void;
  return {
    promise: new Promise<Value>((done) => {
      resolve = done;
    }),
    resolve,
  };
};

const snapshot = (name: string): DocumentSnapshot => ({
  documentId: toDocumentId(`doc-${name}`),
  sessionId: toSessionId(`session-${name}`),
  text: `# ${name}`,
  displayName: `${name}.md`,
  encoding: 'utf-8',
  revision: 1,
});

const rendered = (name: string): RenderResult => ({
  html: asUnsanitizedHtml(`<h1>${name}</h1>`),
  headings: [],
  resources: [],
  enrichments: [],
  diagnostics: [],
});

const serviceDoubles = (
  openFirst: DocumentService['openFirst'],
  render: RenderService['render'] = async (value) =>
    rendered(value.displayName),
) => {
  const releaseDocument = vi.fn(async (sessionId: SessionId) => {
    void sessionId;
  });
  const releaseResources = vi.fn(async (sessionId: SessionId) => {
    void sessionId;
  });

  const documents: DocumentService = {
    selectDocument: async (): Promise<DocumentSelection | null> => null,
    openFirst,
    releaseSession: releaseDocument,
  };
  const renderer: RenderService = { render };
  const resources: ResourceService = {
    resolve: async () => ({
      token: toResourceToken('unused'),
      url: 'unused://localhost',
      mime: 'image/png',
      encodedBytes: 0,
      width: 1,
      height: 1,
    }),
    releaseSession: releaseResources,
  };

  return {
    documents,
    renderer,
    resources,
    releaseDocument,
    releaseResources,
  };
};

describe('automate d’ouverture', () => {
  it('active seulement la dernière intention et libère le candidat tardif', async () => {
    const slow = deferred<DocumentSnapshot>();
    const fast = deferred<DocumentSnapshot>();
    const doubles = serviceDoubles(async (selection) =>
      selection.paths[0] === 'a.md' ? slow.promise : fast.promise,
    );
    const coordinator = new OpenCoordinator(
      doubles.documents,
      doubles.renderer,
      doubles.resources,
    );

    const openingA = coordinator.open({ paths: ['a.md'] });
    const openingB = coordinator.open({ paths: ['b.md', 'ignored.md'] });

    fast.resolve(snapshot('b'));
    await expect(openingB).resolves.toMatchObject({
      status: 'activated',
      ignoredPaths: 1,
      active: { snapshot: { displayName: 'b.md' } },
    });

    slow.resolve(snapshot('a'));
    await expect(openingA).resolves.toMatchObject({
      status: 'superseded',
      active: { snapshot: { displayName: 'b.md' } },
    });
    expect(coordinator.active?.snapshot.displayName).toBe('b.md');
    expect(doubles.releaseResources).toHaveBeenCalledWith(
      toSessionId('session-a'),
    );
    expect(doubles.releaseDocument).toHaveBeenCalledWith(
      toSessionId('session-a'),
    );
  });

  it('conserve le document actif si le candidat suivant échoue', async () => {
    const doubles = serviceDoubles(async (selection) => {
      if (selection.paths[0] === 'bad.md') throw new Error('UTF-8 invalide');
      return snapshot('good');
    });
    const coordinator = new OpenCoordinator(
      doubles.documents,
      doubles.renderer,
      doubles.resources,
    );

    await coordinator.open({ paths: ['good.md'] });
    await expect(
      coordinator.open({ paths: ['bad.md'] }),
    ).resolves.toMatchObject({
      status: 'failed',
      active: { snapshot: { displayName: 'good.md' } },
    });
    expect(coordinator.active?.snapshot.displayName).toBe('good.md');
  });

  it('révoque les ressources après activation du remplaçant puis à la fermeture', async () => {
    const doubles = serviceDoubles(async (selection) =>
      snapshot(selection.paths[0]?.replace('.md', '') ?? 'unknown'),
    );
    const coordinator = new OpenCoordinator(
      doubles.documents,
      doubles.renderer,
      doubles.resources,
    );

    await coordinator.open({ paths: ['a.md'] });
    await coordinator.open({ paths: ['b.md'] });
    expect(doubles.releaseResources).toHaveBeenCalledWith(
      toSessionId('session-a'),
    );

    await coordinator.close();
    expect(doubles.releaseResources).toHaveBeenCalledWith(
      toSessionId('session-b'),
    );
    expect(coordinator.active).toBeNull();
  });
});
