import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import packageMetadata from '../package.json';
import tauriConfig from '../src-tauri/tauri.conf.json';

const cargoManifest = readFileSync(
  new URL('../src-tauri/Cargo.toml', import.meta.url),
  'utf8',
);
const cargoPackageVersion = cargoManifest.match(
  /^version = "(?<version>[^"]+)"$/m,
)?.groups?.version;

describe('contrat de version applicative', () => {
  it('synchronise les trois manifestes depuis package.json', () => {
    expect(tauriConfig.version).toBe(packageMetadata.version);
    expect(cargoPackageVersion).toBe(packageMetadata.version);
  });

  it('conserve le binaire et l’identifiant de bundle retenus pour L03', () => {
    expect(packageMetadata.name).toBe('gnu-md-viewer');
    expect(tauriConfig.identifier).toBe('com.levitastech.gnu-mdv');
  });
});
