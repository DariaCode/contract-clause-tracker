import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { AnnotationService } from '../../core/annotation.service';
import { DocumentService } from '../../core/document.service';
import { LabelService } from '../../core/label.service';
import { Annotation, DocumentDetail, Label } from '../../core/models';
import { DocumentEditor } from './document-editor';

const LABELS: Label[] = [
  { id: 1, name: 'Limitation of Liability', color: '#1d4ed8', hotkey: '1', is_custom: false },
  { id: 2, name: 'Confidentiality', color: '#047857', hotkey: '2', is_custom: true },
];

function sentence(id: number, text: string, annotations: Annotation[] = []) {
  return { id, position: id, text, start_char: 0, end_char: text.length, annotations };
}

function fakeDoc(overrideSentences?: ReturnType<typeof sentence>[]): DocumentDetail {
  return {
    id: 1,
    title: 'Doc',
    filename: 'doc.txt',
    content_type: 'text',
    content: '...',
    created_at: '2026-01-01T00:00:00Z',
    sentences: overrideSentences ?? [
      sentence(10, 'First sentence.'),
      sentence(11, 'Second sentence.'),
    ],
  };
}

function key(k: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: k });
}

describe('DocumentEditor keyboard labeling', () => {
  let create: ReturnType<typeof vi.fn>;
  let del: ReturnType<typeof vi.fn>;

  function setup(doc = fakeDoc()) {
    create = vi.fn().mockReturnValue(of({} as Annotation));
    del = vi.fn().mockReturnValue(of(void 0));
    TestBed.configureTestingModule({
      providers: [
        { provide: DocumentService, useValue: { get: () => of(doc), delete: () => of(void 0) } },
        { provide: LabelService, useValue: { list: () => of(LABELS) } },
        { provide: AnnotationService, useValue: { create, delete: del } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
      ],
    });
    const f = TestBed.createComponent(DocumentEditor);
    f.detectChanges(); // ngOnInit loads the doc + labels
    return f.componentInstance;
  }

  beforeEach(() => {
    // jsdom has no scrollIntoView; the cursor move calls it on the focused row.
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = vi.fn();
  });

  it('↓ / ↑ move the cursor across labelable sentences', () => {
    const c = setup();
    expect(c.focusedSid()).toBeNull();

    c.onKey(key('ArrowDown'));
    expect(c.focusedSid()).toBe(10);

    c.onKey(key('ArrowDown'));
    expect(c.focusedSid()).toBe(11);

    c.onKey(key('ArrowUp'));
    expect(c.focusedSid()).toBe(10);
  });

  it('a digit applies the matching hotkey label to the focused sentence', () => {
    const c = setup();
    c.onKey(key('ArrowDown')); // focus sentence 10
    c.onKey(key('1')); // hotkey "1" -> Limitation of Liability
    expect(create).toHaveBeenCalledWith({ sentence_id: 10, label_id: 1 });
  });

  it('Delete removes the focused sentence label', () => {
    const annotated = fakeDoc([
      sentence(10, 'First.', [{ id: 77, sentence_id: 10, label: LABELS[0], created_at: '' }]),
      sentence(11, 'Second.'),
    ]);
    const c = setup(annotated);
    c.onKey(key('ArrowDown')); // focus sentence 10
    c.onKey(key('Delete'));
    expect(del).toHaveBeenCalledWith(77);
  });

  it('Enter on the focused sentence opens the label popover', () => {
    const c = setup();
    c.onKey(key('ArrowDown'));
    expect(c.popoverSid()).toBeNull();
    c.onKey(key('Enter'));
    expect(c.popoverSid()).toBe(10);
  });
});
