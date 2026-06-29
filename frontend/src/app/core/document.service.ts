import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE } from './api';
import { DocumentDetail, DocumentListQuery, DocumentListResponse } from './models';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/documents`;

  /** Dashboard list with optional search / clause-type filter / grouping. */
  list(query: DocumentListQuery = {}): Observable<DocumentListResponse> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.label_id != null) params = params.set('label_id', query.label_id);
    if (query.group_by) params = params.set('group_by', query.group_by);
    return this.http.get<DocumentListResponse>(this.url, { params });
  }

  get(id: number): Observable<DocumentDetail> {
    return this.http.get<DocumentDetail>(`${this.url}/${id}`);
  }

  /** Upload a .txt or .md contract; the backend splits it into sentences. */
  upload(file: File, title?: string): Observable<DocumentDetail> {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    return this.http.post<DocumentDetail>(this.url, form);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
