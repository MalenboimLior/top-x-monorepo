import { httpsCallable } from 'firebase/functions';
import { functions } from '@top-x/shared';
import type {
  GameCounterEvent,
  RecordGameEventRequest,
  RecordGameEventResponse,
} from '@top-x/shared/types/counters';

const recordGameEventCallable = httpsCallable<RecordGameEventRequest, RecordGameEventResponse>(
  functions,
  'recordGameEvent',
);

export async function recordGameEvents(
  gameId: string,
  events: GameCounterEvent[],
  context?: { dailyChallengeId?: string; dailyChallengeDate?: string }
): Promise<GameCounterEvent[]> {
  if (!gameId || !events.length) {
    return [];
  }

  try {
    const { data } = await recordGameEventCallable({
      gameId,
      events,
      dailyChallengeId: context?.dailyChallengeId,
      dailyChallengeDate: context?.dailyChallengeDate,
    });
    if (!data?.success) {
      return [];
    }
    return data.appliedEvents;
  } catch (error) {
    console.error('recordGameEvents error:', error);
    return [];
  }
}
