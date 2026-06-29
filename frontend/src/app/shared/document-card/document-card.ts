import { Component, input, output } from '@angular/core';

import { DocumentSummary } from '../../core/models';
import { extBadge } from '../../core/ui';
import { Badge } from '../badge/badge';
import { LabelChip } from '../label-chip/label-chip';

/** A document summary card for the dashboard grid. Emits `open` (card click)
 * and `remove` (the hover ✕); the parent owns navigation + deletion. */
@Component({
  selector: 'app-document-card',
  imports: [Badge, LabelChip],
  templateUrl: './document-card.html',
  styleUrl: './document-card.scss',
})
export class DocumentCard {
  readonly doc = input.required<DocumentSummary>();

  readonly open = output<void>();
  readonly remove = output<void>();

  readonly ext = extBadge;

  /** Share of sentences that carry a label (drives the coverage bar). */
  coveragePct(): number {
    const total = this.doc().sentence_count;
    return total ? Math.min(100, (this.doc().annotation_count / total) * 100) : 0;
  }

  onRemove(event: Event): void {
    event.stopPropagation();
    this.remove.emit();
  }
}
