import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DocumentService } from './document.service';

describe('DocumentService', () => {
  let svc: DocumentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(DocumentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('passes search / label_id / group_by as query params', () => {
    svc.list({ search: 'acme', label_id: 4, group_by: 'label' }).subscribe();
    const req = http.expectOne((r) => r.url === '/api/documents');
    expect(req.request.params.get('search')).toBe('acme');
    expect(req.request.params.get('label_id')).toBe('4');
    expect(req.request.params.get('group_by')).toBe('label');
    req.flush({ documents: [] });
  });

  it('omits params when the query is empty', () => {
    svc.list().subscribe();
    const req = http.expectOne('/api/documents');
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ documents: [] });
  });

  it('upload() posts multipart FormData carrying the file and title', () => {
    const file = new File(['hello'], 'c.txt', { type: 'text/plain' });
    svc.upload(file, 'My Doc').subscribe();
    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/documents');
    expect(req.request.body instanceof FormData).toBe(true);
    const body = req.request.body as FormData;
    expect((body.get('file') as File).name).toBe('c.txt');
    expect(body.get('title')).toBe('My Doc');
    req.flush({});
  });

  it('delete() issues DELETE /documents/:id', () => {
    svc.delete(7).subscribe();
    const req = http.expectOne('/api/documents/7');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
