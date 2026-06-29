import { Component, input } from '@angular/core';

import { Label } from '../../core/models';
import { LabelChip } from '../label-chip/label-chip';

export interface SidebarLabel {
  label: Label;
  count: number;
}

/** The labeling editor's sidebar: per-document stats + the labels present. */
@Component({
  selector: 'app-document-sidebar',
  imports: [LabelChip],
  templateUrl: './document-sidebar.html',
  styleUrl: './document-sidebar.scss',
})
export class DocumentSidebar {
  readonly sentenceCount = input(0);
  readonly labeledCount = input(0);
  readonly candidateCount = input(0);
  readonly labels = input<SidebarLabel[]>([]);
}
