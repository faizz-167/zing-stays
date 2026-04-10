import assert from 'node:assert/strict';
import type { Request } from 'express';
import { getAuthPayload } from '../middleware/auth';

export async function runAuthTests(): Promise<void> {
  const malformedRequest = {
    headers: {},
  } as unknown as Request;

  const payload = await getAuthPayload(malformedRequest);
  assert.equal(payload, undefined);
}
