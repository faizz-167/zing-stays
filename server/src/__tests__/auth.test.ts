import assert from 'node:assert/strict';
import type { Request } from 'express';
import { extractAuthToken, getAuthPayload } from '../middleware/auth';
import { signToken } from '../lib/jwt';

export function runAuthTests(): void {
  const request = {
    cookies: { auth_token: 'cookie-token' },
    headers: { authorization: 'Bearer header-token' },
  } as unknown as Request;

  assert.equal(extractAuthToken(request), 'cookie-token');
 
  const headerOnlyRequest = {
    headers: { authorization: 'Bearer header-token' },
  } as unknown as Request;

  assert.equal(extractAuthToken(headerOnlyRequest), 'header-token');

  const malformedRequest = {
    headers: { authorization: 'Bearer definitely-not-a-jwt' },
  } as unknown as Request;

  assert.equal(getAuthPayload(malformedRequest), undefined);

  const token = signToken({ userId: 42, email: 'admin@example.com', isAdmin: true });
  const signedRequest = {
    headers: { authorization: `Bearer ${token}` },
  } as unknown as Request;

  const payload = getAuthPayload(signedRequest);
  assert.ok(payload);
  assert.equal(payload.userId, 42);
  assert.equal(payload.email, 'admin@example.com');
  assert.equal(payload.isAdmin, true);
}
