import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE } from './api';
import { Label, LabelCreate, LabelUpdate, LabelUsage } from './models';

/** The label catalog (the labels a user can apply to sentences). */
@Injectable({ providedIn: 'root' })
export class LabelService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/labels`;

  /** List labels with per-label document usage counts. */
  list(): Observable<LabelUsage[]> {
    return this.http.get<LabelUsage[]>(this.url);
  }

  create(payload: LabelCreate): Observable<Label> {
    return this.http.post<Label>(this.url, payload);
  }

  update(id: number, payload: LabelUpdate): Observable<Label> {
    return this.http.patch<Label>(`${this.url}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
