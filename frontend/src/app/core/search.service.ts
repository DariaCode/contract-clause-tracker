import { Injectable, signal } from '@angular/core';

/**
 * Shared search query, written by the navbar search field and consumed by the
 * dashboard. Kept as a tiny signal service so the (always-visible) navbar and
 * the routed dashboard can communicate without a parent binding.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  readonly query = signal('');
}
