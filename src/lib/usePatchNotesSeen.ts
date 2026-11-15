'use client';

import { useCallback, useEffect, useState } from 'react';
import { patchNotes } from '@/lib/patchNotes';

const STORAGE_KEY = 'tinywatch-seen-patch-note';
const CHANGE_EVENT = 'tinywatch:patch-notes-seen';

/** Identifies the newest released note; a new entry at the top of patchNotes changes it. */
const latestNote = patchNotes.find((note) => note.status === 'released');
const LATEST_ID = latestNote ? `${latestNote.date}|${latestNote.title}` : null;

function readSeen() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Whether the viewer has opened Patch Notes since the newest note was added. */
export function usePatchNotesSeen() {
  // Assume seen until mounted, so the server render and first paint never flash a dot
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    const update = () => setHasUnseen(LATEST_ID !== null && readSeen() !== LATEST_ID);
    update();
    window.addEventListener(CHANGE_EVENT, update);
    // Another tab opening Patch Notes clears the dot here too
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(CHANGE_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const markSeen = useCallback(() => {
    if (LATEST_ID === null) return;
    try {
      localStorage.setItem(STORAGE_KEY, LATEST_ID);
    } catch {
      // Storage unavailable; the dot just comes back next visit
    }
    setHasUnseen(false);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { hasUnseen, markSeen };
}
