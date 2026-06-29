import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { ConfirmService } from '../../core/confirm.service';
import { DocumentService } from '../../core/document.service';
import { LabelService } from '../../core/label.service';
import { DocumentSummary, Label } from '../../core/models';
import { SearchService } from '../../core/search.service';
import { extBadge, lastSeen } from '../../core/ui';
import { Badge } from '../../shared/badge/badge';
import { DocumentCard } from '../../shared/document-card/document-card';
import { LabelChip } from '../../shared/label-chip/label-chip';
import { PageHeader } from '../../shared/page-header/page-header';
import { SearchBox } from '../../shared/search-box/search-box';

type GroupMode = 'document' | 'label';

interface LabelGroup {
  label: Label;
  docs: DocumentSummary[];
  count: number;
  pct: number;
  last: string;
}

/**
 * Dashboard — the document list with grouping (by document / by label), text
 * search and a label filter. Grouping is derived client-side from the
 * per-document label summaries the API already returns.
 */
@Component({
  selector: 'app-dashboard',
  imports: [Badge, LabelChip, DocumentCard, SearchBox, PageHeader],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly documentService = inject(DocumentService);
  private readonly labelService = inject(LabelService);
  readonly searchService = inject(SearchService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly summaries = signal<DocumentSummary[]>([]);
  readonly labels = signal<Label[]>([]);

  readonly groupMode = signal<GroupMode>('document');
  readonly labelFilter = signal<Label | null>(null);
  readonly filterMenuOpen = signal(false);
  readonly openGroups = signal<Set<number>>(new Set());
  readonly loading = signal(false);

  // exposed to the template (the by-label table still renders an ext badge)
  readonly ext = extBadge;

  // --- header counts ---
  readonly docCount = computed(() => this.summaries().length);
  readonly labelCount = computed(() => this.labels().length);
  readonly totalAnnotations = computed(() =>
    this.summaries().reduce((n, d) => n + d.annotation_count, 0),
  );

  // --- by label ---
  // Only labels that actually appear in the (possibly searched/filtered) result
  // set, so the table narrows as you search.
  readonly groups = computed<LabelGroup[]>(() => {
    const total = this.summaries().length || 1;
    return this.labels()
      .map((label) => {
        const docs = this.summaries().filter((d) => d.labels.some((l) => l.id === label.id));
        return {
          label,
          docs,
          count: docs.length,
          pct: Math.round((docs.length / total) * 100),
          last: lastSeen(docs),
        };
      })
      .filter((g) => g.count > 0)
      .sort((a, b) => b.count - a.count);
  });

  constructor() {
    // Reload whenever the (debounced) navbar search changes — fires once on
    // subscribe for the initial empty query. Set up here because toObservable()
    // must run inside an injection context.
    toObservable(this.searchService.query)
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload());
  }

  ngOnInit(): void {
    this.labelService.list().subscribe((labels) => this.labels.set(labels));
  }

  reload(): void {
    this.loading.set(true);
    this.documentService
      .list({
        search: this.searchService.query() || undefined,
        label_id: this.labelFilter()?.id ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.summaries.set(res.documents ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  setGroupMode(mode: GroupMode): void {
    this.groupMode.set(mode);
  }

  toggleGroup(id: number): void {
    const next = new Set(this.openGroups());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.openGroups.set(next);
  }

  isOpen(id: number): boolean {
    return this.openGroups().has(id);
  }

  applyFilter(label: Label): void {
    this.labelFilter.set(label);
    this.filterMenuOpen.set(false);
    this.reload();
  }

  clearFilter(): void {
    this.labelFilter.set(null);
    this.reload();
  }

  openDoc(id: number): void {
    this.router.navigate(['/documents', id]);
  }

  /** Delete a document (after confirm). The card already suppresses its open-click. */
  deleteDoc(id: number, title: string): void {
    this.confirm
      .ask({
        title: 'Delete document',
        message: `Delete "${title}"? This permanently removes the document and its labels.`,
      })
      .then((ok) => {
        if (ok) this.documentService.delete(id).subscribe(() => this.reload());
      });
  }

  goUpload(): void {
    this.router.navigate(['/upload']);
  }
}
