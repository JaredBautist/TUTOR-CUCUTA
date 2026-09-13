/** Private authenticated-student favorites; adapters throw FavoritesError on failure. */
export interface FavoritesRepository {
  list(): Promise<string[]>;
  set(tutorId: string, saved: boolean): Promise<boolean>;
}

export class FavoritesError extends Error {
  constructor(readonly code: string, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'FavoritesError';
  }
}
