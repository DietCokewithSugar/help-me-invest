'use client';

import { useEffect, useState } from 'react';

const ID_STORAGE_KEY = 'feedback_voter_id';
const NAME_STORAGE_KEY = 'feedback_display_name';

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Stable per-browser identity for the feedback board.
 *
 * This is not real authentication — it is just a random UUID that we persist in
 * localStorage so we can attribute issues/comments and prevent double voting.
 * The display name is also stored locally so subsequent submissions can prefill
 * it; users can change it on each submission.
 */
export function useFeedbackIdentity() {
  const [identityId, setIdentityId] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let id = window.localStorage.getItem(ID_STORAGE_KEY);
    if (!id) {
      id = randomId();
      window.localStorage.setItem(ID_STORAGE_KEY, id);
    }
    setIdentityId(id);
    const name = window.localStorage.getItem(NAME_STORAGE_KEY) || '';
    setDisplayName(name);
  }, []);

  const updateDisplayName = (next: string) => {
    setDisplayName(next);
    if (typeof window !== 'undefined') {
      if (next) {
        window.localStorage.setItem(NAME_STORAGE_KEY, next);
      } else {
        window.localStorage.removeItem(NAME_STORAGE_KEY);
      }
    }
  };

  return {
    identityId,
    displayName,
    setDisplayName: updateDisplayName,
    ready: identityId.length > 0,
  };
}
