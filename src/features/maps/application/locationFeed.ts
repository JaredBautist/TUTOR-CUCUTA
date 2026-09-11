import type { LocationFeedStatus, PublishedTutorLocation, TutorLocationRepository } from '../domain/contracts';

export interface TutorLocationFeedState {
  locations: PublishedTutorLocation[];
  status: LocationFeedStatus;
  error?: string;
}

/**
 * Subscribe and reconcile authoritative snapshots. Connected means both a joined
 * channel and a successful read after that join. Returns idempotent disposal.
 */
export function startTutorLocationFeed(
  repository: TutorLocationRepository,
  onChange: (snapshot: TutorLocationFeedState) => void,
): () => void {
  let disposed = false;
  let channelReady = false;
  let previouslyConnected = false;
  let revision = 0;
  let reading = false;
  let pending = false;
  let snapshot: TutorLocationFeedState = { locations: [], status: 'connecting' };

  const publish = (next: TutorLocationFeedState) => {
    if (disposed) return;
    snapshot = next;
    onChange(next);
  };

  const reconcile = async () => {
    if (disposed || reading || !pending) return;
    pending = false;
    reading = true;
    const readRevision = revision;
    try {
      const locations = await repository.read();
      if (!disposed && channelReady && readRevision === revision) {
        previouslyConnected = true;
        publish({ locations, status: 'connected' });
      }
    } catch (cause) {
      if (!disposed && readRevision === revision) {
        publish({
          locations: [], status: 'unavailable',
          error: cause instanceof Error ? cause.message : 'No se pudieron actualizar las ubicaciones publicadas.',
        });
      }
    } finally {
      reading = false;
      if (pending && !disposed) void reconcile();
    }
  };

  const invalidate = () => {
    if (disposed || !channelReady) return;
    revision += 1;
    pending = true;
    if (snapshot.status === 'unavailable') {
      publish({ locations: [], status: previouslyConnected ? 'reconnecting' : 'connecting' });
    }
    void reconcile();
  };

  const changeStatus = (status: LocationFeedStatus) => {
    if (disposed) return;
    revision += 1;
    channelReady = status === 'connected';
    pending = channelReady;
    if (channelReady) {
      publish({ locations: [], status: previouslyConnected ? 'reconnecting' : 'connecting' });
      void reconcile();
    } else {
      publish({
        locations: [], status,
        error: status === 'unavailable' ? 'Las ubicaciones publicadas no están disponibles. Intenta de nuevo.' : undefined,
      });
    }
  };

  publish(snapshot);
  let unsubscribe = () => {};
  try {
    unsubscribe = repository.subscribe(invalidate, changeStatus);
    // An initial read detects missing migrations/configuration even before the
    // channel joins. It never publishes markers until a post-join reconciliation.
    pending = true;
    void reconcile();
  } catch (cause) {
    publish({
      locations: [], status: 'unavailable',
      error: cause instanceof Error ? cause.message : 'No se pudo conectar con las ubicaciones publicadas.',
    });
  }

  return () => {
    if (disposed) return;
    disposed = true;
    revision += 1;
    pending = false;
    unsubscribe();
  };
}
