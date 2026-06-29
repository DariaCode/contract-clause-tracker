import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AnnotationService } from '../../core/annotation.service';
import { ConfirmService } from '../../core/confirm.service';
import { DocumentService } from '../../core/document.service';
import { LabelService } from '../../core/label.service';
import { Annotation, DocumentDetail, Label, Sentence } from '../../core/models';
import { extBadge, nextCustomColor, tint } from '../../core/ui';
import { AutofocusDirective } from '../../shared/autofocus.directive';
import { DocumentSidebar } from '../../shared/document-sidebar/document-sidebar';
import { LabelChip } from '../../shared/label-chip/label-chip';
import { PageHeader } from '../../shared/page-header/page-header';

interface HotLabel {
  label: Label;
  hk: string; // quick-pick key, '' when beyond the first ten
}

/** A sentence prepared for rendering in the labeling view. */
interface Row {
  sentence: Sentence;
  isHeading: boolean;
  annotation: Annotation | null;
  text: string; // heading markers stripped for display
}

/**
 * Document labeling — read a contract and apply single labels to sentences via
 * an inline command popover (search, create, hotkeys, ↵/esc).
 *
 * The design treats a sentence as having a single label, so applying one
 * replaces any existing annotation (the API itself allows many). Markdown
 * headings are shown as structure and are not labelable.
 */
@Component({
  selector: 'app-document-editor',
  imports: [FormsModule, AutofocusDirective, LabelChip, DocumentSidebar, PageHeader],
  templateUrl: './document-editor.html',
  styleUrl: './document-editor.scss',
})
export class DocumentEditor implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documentService = inject(DocumentService);
  private readonly labelService = inject(LabelService);
  private readonly annotationService = inject(AnnotationService);
  private readonly confirm = inject(ConfirmService);

  readonly document = signal<DocumentDetail | null>(null);
  readonly labels = signal<Label[]>([]);
  readonly popoverSid = signal<number | null>(null);
  readonly focusedSid = signal<number | null>(null); // keyboard cursor (arrow nav)
  readonly query = signal('');
  readonly error = signal<string | null>(null);

  readonly tint = tint;

  // Label catalog with their configured quick-pick hotkeys.
  readonly hotLabels = computed<HotLabel[]>(() =>
    this.labels().map((label) => ({ label, hk: label.hotkey ?? '' })),
  );

  readonly rows = computed<Row[]>(() => {
    const doc = this.document();
    if (!doc) return [];
    return doc.sentences.map((s) => {
      const isHeading = s.text.startsWith('#');
      return {
        sentence: s,
        isHeading,
        annotation: s.annotations[0] ?? null,
        text: isHeading ? s.text.replace(/^#+\s*/, '') : s.text,
      };
    });
  });

  // --- right-rail stats (computed over labelable, non-heading sentences) ---
  readonly labelable = computed(() => this.rows().filter((r) => !r.isHeading));
  readonly sentenceCount = computed(() => this.labelable().length);
  readonly labeledCount = computed(() => this.labelable().filter((r) => r.annotation).length);
  readonly candidateCount = computed(() => this.sentenceCount() - this.labeledCount());
  readonly progressPct = computed(() =>
    this.sentenceCount() ? Math.round((this.labeledCount() / this.sentenceCount()) * 100) : 0,
  );

  readonly docLabels = computed(() => {
    const counts = new Map<number, { label: Label; count: number }>();
    for (const r of this.labelable()) {
      if (!r.annotation) continue;
      const label = r.annotation.label;
      const entry = counts.get(label.id) ?? { label, count: 0 };
      entry.count += 1;
      counts.set(label.id, entry);
    }
    return [...counts.values()];
  });

  // --- popover list ---
  readonly filtered = computed<HotLabel[]>(() => {
    const q = this.query().trim().toLowerCase();
    return this.hotLabels().filter((c) => !q || c.label.name.toLowerCase().includes(q));
  });

  readonly showCreate = computed(() => {
    const q = this.query().trim();
    return q.length > 0 && !this.labels().some((l) => l.name.toLowerCase() === q.toLowerCase());
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.labelService.list().subscribe((labels) => this.labels.set(labels));
    this.loadDoc(id);
  }

  private loadDoc(id: number): void {
    this.documentService.get(id).subscribe({
      next: (doc) => this.document.set(doc),
      error: () => this.error.set('Document not found.'),
    });
  }

  private reloadDoc(): void {
    const doc = this.document();
    if (doc) this.loadDoc(doc.id);
  }

  // --- presentation helpers ---
  ext(): string {
    const doc = this.document();
    return doc ? extBadge(doc) : '';
  }
  docName(): string {
    return this.document()?.title ?? '';
  }

  // --- interactions ---
  selectSentence(row: Row): void {
    if (row.isHeading) return;
    this.popoverSid.set(this.popoverSid() === row.sentence.id ? null : row.sentence.id);
    this.focusedSid.set(row.sentence.id);
    this.query.set('');
  }

  /** Move the keyboard cursor to the next/previous labelable sentence. */
  private moveFocus(delta: number): void {
    const list = this.labelable();
    if (!list.length) return;
    const idx = list.findIndex((r) => r.sentence.id === this.focusedSid());
    const next = idx === -1 ? (delta > 0 ? 0 : list.length - 1) : idx + delta;
    const target = list[Math.min(list.length - 1, Math.max(0, next))];
    this.focusedSid.set(target.sentence.id);
    document
      .querySelector(`[data-sid="${target.sentence.id}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  closePopover(): void {
    this.popoverSid.set(null);
    this.query.set('');
  }

  /** Apply a label to the focused sentence, replacing any existing one. */
  applyLabel(sentenceId: number, labelId: number): void {
    const sentence = this.document()?.sentences.find((s) => s.id === sentenceId);
    const existing = sentence?.annotations[0];
    this.closePopover();

    const create = () =>
      this.annotationService
        .create({ sentence_id: sentenceId, label_id: labelId })
        .subscribe(() => this.reloadDoc());

    if (existing) {
      if (existing.label.id === labelId) return; // no change
      this.annotationService.delete(existing.id).subscribe(() => create());
    } else {
      create();
    }
  }

  removeAnnotation(annotationId: number): void {
    this.annotationService.delete(annotationId).subscribe(() => this.reloadDoc());
  }

  createLabel(): void {
    const name = this.query().trim();
    const sid = this.popoverSid();
    if (!name || sid == null) return;
    const customCount = this.labels().filter((l) => l.is_custom).length;
    this.labelService.create({ name, color: nextCustomColor(customCount) }).subscribe((created) => {
      this.labelService.list().subscribe((labels) => this.labels.set(labels));
      this.applyLabel(sid, created.id);
    });
  }

  goDashboard(): void {
    this.router.navigate(['/']);
  }

  /** Delete the whole document (and its sentences/annotations), after confirm. */
  deleteDocument(): void {
    const doc = this.document();
    if (!doc) return;
    this.confirm
      .ask({
        title: 'Delete document',
        message: `Delete "${doc.title}"? This permanently removes the document and its labels.`,
      })
      .then((ok) => {
        if (ok) this.documentService.delete(doc.id).subscribe(() => this.goDashboard());
      });
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const sid = this.popoverSid();

    // --- popover open: search / apply / quick-pick ---
    if (sid != null) {
      if (e.key === 'Escape') {
        this.closePopover();
        return;
      }

      if (e.key === 'Enter') {
        const first = this.filtered()[0];
        if (first) this.applyLabel(sid, first.label.id);
        else if (this.query().trim()) this.createLabel();
        e.preventDefault();
        return;
      }

      // Digit quick-pick by hotkey while the search is empty; once the user has
      // typed a query, digits flow into the search box instead.
      if (/^[0-9]$/.test(e.key) && this.query().trim() === '') {
        const hit = this.hotLabels().find((c) => c.hk === e.key);
        if (hit) {
          this.applyLabel(sid, hit.label.id);
          e.preventDefault();
        }
      }
      return;
    }

    // --- popover closed: arrow-key sentence navigation ---
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      this.moveFocus(e.key === 'ArrowDown' ? 1 : -1);
      e.preventDefault();
      return;
    }

    const fsid = this.focusedSid();
    if (fsid == null) return;

    // Enter / Space opens the label popover for the focused sentence.
    if (e.key === 'Enter' || e.key === ' ') {
      this.popoverSid.set(fsid);
      this.query.set('');
      e.preventDefault();
      return;
    }

    // Delete / Backspace removes the focused sentence's label.
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const row = this.labelable().find((r) => r.sentence.id === fsid);
      if (row?.annotation) {
        this.removeAnnotation(row.annotation.id);
        e.preventDefault();
      }
      return;
    }

    // Digits apply a hotkey label directly to the focused sentence.
    if (/^[0-9]$/.test(e.key)) {
      const hit = this.hotLabels().find((c) => c.hk === e.key);
      if (hit) {
        this.applyLabel(fsid, hit.label.id);
        e.preventDefault();
      }
    }
  }
}
