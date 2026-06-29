import { TestBed } from '@angular/core/testing';

import { DocumentSummary } from '../../core/models';
import { DocumentCard } from './document-card';

function doc(over: Partial<DocumentSummary> = {}): DocumentSummary {
  return {
    id: 1,
    title: 'MSA - Acme',
    filename: 'MSA - Acme.txt',
    content_type: 'text',
    created_at: '2026-01-01T00:00:00Z',
    sentence_count: 10,
    annotation_count: 4,
    labels: [],
    ...over,
  };
}

describe('DocumentCard', () => {
  it('coverage = labeled sentences / total sentences', () => {
    const f = TestBed.createComponent(DocumentCard);
    f.componentRef.setInput('doc', doc({ sentence_count: 10, annotation_count: 4 }));
    expect(f.componentInstance.coveragePct()).toBe(40);
  });

  it('returns 0 for an empty doc and clamps above 100', () => {
    const f = TestBed.createComponent(DocumentCard);
    f.componentRef.setInput('doc', doc({ sentence_count: 0, annotation_count: 0 }));
    expect(f.componentInstance.coveragePct()).toBe(0);
    f.componentRef.setInput('doc', doc({ sentence_count: 2, annotation_count: 5 }));
    expect(f.componentInstance.coveragePct()).toBe(100);
  });

  it('emits remove on the ✕ (without opening) and open on the card', () => {
    const f = TestBed.createComponent(DocumentCard);
    f.componentRef.setInput('doc', doc());
    let opened = 0;
    let removed = 0;
    f.componentInstance.open.subscribe(() => opened++);
    f.componentInstance.remove.subscribe(() => removed++);
    f.detectChanges();

    f.nativeElement.querySelector('.doc-card__delete').click();
    expect(removed).toBe(1);
    expect(opened).toBe(0); // the ✕ stops propagation

    f.nativeElement.querySelector('.doc-card').click();
    expect(opened).toBe(1);
  });
});
