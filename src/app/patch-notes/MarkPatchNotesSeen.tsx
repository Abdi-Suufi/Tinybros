'use client';

import { useEffect } from 'react';
import { usePatchNotesSeen } from '@/lib/usePatchNotesSeen';

/** Clears the "new" dot in the account menu once the viewer opens Patch Notes. */
export default function MarkPatchNotesSeen() {
  const { markSeen } = usePatchNotesSeen();
  useEffect(() => {
    markSeen();
  }, [markSeen]);
  return null;
}
