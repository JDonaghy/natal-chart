import { describe, it, expect } from 'vitest';
import { FirebaseError } from 'firebase/app';
import { getAuthErrorCode, mapAuthError } from './auth';

function firebaseError(code: string): FirebaseError {
  return new FirebaseError(code, `Firebase: Error (${code}).`);
}

describe('getAuthErrorCode', () => {
  it('extracts the code from a FirebaseError', () => {
    expect(getAuthErrorCode(firebaseError('auth/unauthorized-domain'))).toBe(
      'auth/unauthorized-domain',
    );
  });

  it('returns null for a plain Error', () => {
    expect(getAuthErrorCode(new Error('boom'))).toBeNull();
  });

  it('returns null for a non-error value', () => {
    expect(getAuthErrorCode('nope')).toBeNull();
    expect(getAuthErrorCode(undefined)).toBeNull();
  });
});

describe('mapAuthError', () => {
  it('maps auth/unauthorized-domain to a human-readable message, not the raw SDK string', () => {
    const message = mapAuthError(firebaseError('auth/unauthorized-domain'));
    expect(message).not.toContain('Firebase: Error');
    expect(message).not.toContain('auth/unauthorized-domain');
    expect(message.toLowerCase()).toContain("isn't authorised for sign-in");
  });

  it('maps auth/popup-blocked to a human-readable message', () => {
    const message = mapAuthError(firebaseError('auth/popup-blocked'));
    expect(message.toLowerCase()).toContain('blocked the sign-in popup');
  });

  it('falls back to a generic message for an unmapped Firebase error code', () => {
    const message = mapAuthError(firebaseError('auth/some-future-error-code'));
    expect(message).toBe('Sign in failed. Please try again.');
  });

  it('falls back to the raw message for a non-Firebase Error', () => {
    expect(mapAuthError(new Error('network down'))).toBe('network down');
  });

  it('falls back to a generic message for a non-error value', () => {
    expect(mapAuthError('nope')).toBe('Sign in failed. Please try again.');
    expect(mapAuthError(undefined)).toBe('Sign in failed. Please try again.');
  });
});
