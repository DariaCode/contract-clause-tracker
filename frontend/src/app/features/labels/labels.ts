import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ConfirmService } from '../../core/confirm.service';
import { DocumentService } from '../../core/document.service';
import { LabelService } from '../../core/label.service';
import { LabelUsage } from '../../core/models';
import { LABEL_PALETTE } from '../../core/ui';
import { AutofocusDirective } from '../../shared/autofocus.directive';
import { Badge } from '../../shared/badge/badge';
import { PageHeader } from '../../shared/page-header/page-header';
import { SearchBox } from '../../shared/search-box/search-box';

type EditingId = number | 'new' | null;

/**
 * Labels management — view the label catalog with usage, create custom labels,
 * edit any label (name / colour / hotkey), and delete custom labels (which
 * cascades to the annotations referencing them). Predefined labels are editable
 * but not deletable.
 */
@Component({
  selector: 'app-labels',
  imports: [FormsModule, NgTemplateOutlet, AutofocusDirective, Badge, SearchBox, PageHeader],
  templateUrl: './labels.html',
  styleUrl: './labels.scss',
})
export class Labels implements OnInit {
  private readonly labelService = inject(LabelService);
  private readonly documentService = inject(DocumentService);
  private readonly confirm = inject(ConfirmService);

  readonly palette = LABEL_PALETTE;

  readonly labels = signal<LabelUsage[]>([]);
  readonly docCount = signal(0);
  readonly error = signal<string | null>(null);

  // client-side filter over the loaded label catalog
  readonly search = signal('');
  readonly filteredLabels = computed(() => {
    const q = this.search().trim().toLowerCase();
    const all = this.labels();
    return q ? all.filter((l) => l.name.toLowerCase().includes(q)) : all;
  });

  // editor state
  readonly editingId = signal<EditingId>(null);
  readonly editName = signal('');
  readonly editColor = signal(LABEL_PALETTE[0]);
  readonly editHotkey = signal('');

  readonly labelCount = computed(() => this.labels().length);

  ngOnInit(): void {
    this.load();
    this.documentService.list().subscribe((res) => this.docCount.set(res.documents?.length ?? 0));
  }

  private load(): void {
    this.labelService.list().subscribe((labels) => this.labels.set(labels));
  }

  isEditing(id: number): boolean {
    return this.editingId() === id;
  }
  get isCreating(): boolean {
    return this.editingId() === 'new';
  }

  startCreate(): void {
    this.error.set(null);
    this.editingId.set('new');
    this.editName.set('');
    this.editColor.set(this.palette[this.labels().length % this.palette.length]);
    this.editHotkey.set('');
  }

  startEdit(label: LabelUsage): void {
    this.error.set(null);
    this.editingId.set(label.id);
    this.editName.set(label.name);
    this.editColor.set(label.color);
    this.editHotkey.set(label.hotkey ?? '');
  }

  cancel(): void {
    this.editingId.set(null);
    this.error.set(null);
  }

  pickColor(hex: string): void {
    this.editColor.set(hex);
  }

  onHotkey(value: string): void {
    this.editHotkey.set(value.slice(0, 1));
  }

  save(): void {
    const name = this.editName().trim();
    if (!name) return;
    const payload = {
      name,
      color: this.editColor(),
      hotkey: this.editHotkey() || null,
    };
    const id = this.editingId();
    const done = {
      next: () => {
        this.editingId.set(null);
        this.load();
      },
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err?.error?.detail ?? 'Could not save the label.'),
    };
    if (id === 'new') this.labelService.create(payload).subscribe(done);
    else if (id != null) this.labelService.update(id, payload).subscribe(done);
  }

  remove(label: LabelUsage): void {
    if (!label.is_custom) return;
    const used = label.documents_count
      ? ` It's applied across ${label.documents_count} document${label.documents_count === 1 ? '' : 's'} — those labels will be removed too.`
      : '';
    this.confirm
      .ask({ title: 'Delete label', message: `Delete the "${label.name}" label?${used}` })
      .then((ok) => {
        if (!ok) return;
        this.labelService.delete(label.id).subscribe({
          next: () => this.load(),
          error: (err) => this.error.set(err?.error?.detail ?? 'Could not delete the label.'),
        });
      });
  }
}
