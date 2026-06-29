import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE } from './api';
import { Annotation, AnnotationCreate } from './models';

/** Annotations — a label applied to a sentence. */
@Injectable({ providedIn: 'root' })
export class AnnotationService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/annotations`;

  /** Apply a label to a sentence (idempotent on the server). */
  create(payload: AnnotationCreate): Observable<Annotation> {
    return this.http.post<Annotation>(this.url, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
