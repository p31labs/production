import type { DispatchRequest, DispatchResponse } from './types';

export function dispatchRoute(request: DispatchRequest): DispatchResponse {
  if (!request.passportId) {
    return { ok: false, type: request.type, passportId: '', error: 'passportId required' };
  }

  if (request.type === 'health') {
    return { ok: true, type: 'health', passportId: request.passportId };
  }

  return { ok: true, type: request.type, passportId: request.passportId };
}
