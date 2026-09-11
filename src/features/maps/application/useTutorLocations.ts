import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { createTutorLocationRepository } from '../infrastructure/tutorLocationRepository';
import { startTutorLocationFeed, type TutorLocationFeedState } from './locationFeed';

const repository = createTutorLocationRepository(supabase);
const disabledSnapshot: TutorLocationFeedState = { locations: [], status: 'unavailable' };

/** Read public teaching points only while enabled; disabling withdraws markers and the subscription. */
export function useTutorLocations(enabled = true) {
  const [snapshot, setSnapshot] = useState<TutorLocationFeedState>(
    enabled ? { locations: [], status: 'connecting' } : disabledSnapshot,
  );
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((previous) => previous + 1), []);

  useEffect(() => {
    if (!enabled) {
      setSnapshot(disabledSnapshot);
      return;
    }
    return startTutorLocationFeed(repository, setSnapshot);
  }, [attempt, enabled]);

  return { ...(enabled ? snapshot : disabledSnapshot), retry };
}
