import { convertFileSrc, invoke } from '@tauri-apps/api/core';

import type {
  AppError,
  ResourceRequest,
  ResourceService,
  ResolvedResource,
  SessionId,
} from '../contracts/document';
import { toResourceToken } from '../contracts/document';
import { isAppError } from './native-errors';

interface NativeResolvedResource {
  readonly token: string;
  readonly mime: ResolvedResource['mime'];
  readonly encodedBytes: number;
  readonly width: number;
  readonly height: number;
}

export const RESOURCE_PROTOCOL = 'gnu-mdv-resource';

export class TauriResourceService implements ResourceService {
  async resolve(request: ResourceRequest): Promise<ResolvedResource> {
    try {
      const resource = await invoke<NativeResolvedResource>(
        'resolve_resource',
        {
          request,
        },
      );

      return {
        ...resource,
        token: toResourceToken(resource.token),
        url: convertFileSrc(resource.token, RESOURCE_PROTOCOL),
      };
    } catch (error) {
      if (isAppError(error)) throw error;
      throw {
        code: 'resource_invalid',
        message: 'La ressource locale ne peut pas être résolue.',
      } satisfies AppError;
    }
  }

  async releaseSession(sessionId: SessionId): Promise<void> {
    await invoke('release_resource_session', { sessionId });
  }
}
