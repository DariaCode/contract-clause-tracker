import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { DocumentService } from '../../core/document.service';
import { Badge } from '../../shared/badge/badge';
import { PageHeader } from '../../shared/page-header/page-header';

const ALLOWED = ['txt', 'md', 'markdown'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Add a contract — upload a `.txt`/`.md` file (drag/drop or browse) or paste
 * text. Either way the document is created and we jump straight into labeling.
 */
@Component({
  selector: 'app-upload',
  imports: [FormsModule, Badge, PageHeader],
  templateUrl: './upload.html',
  styleUrl: './upload.scss',
})
export class Upload {
  private readonly documentService = inject(DocumentService);
  private readonly router = inject(Router);

  readonly dragging = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly pasteName = signal('');
  readonly pasteText = signal('');

  // live paste stats (client-side; the server does the authoritative split)
  readonly sentenceCount = computed(() => (this.pasteText().match(/[^.!?]+[.!?]+/g) ?? []).length);
  readonly wordCount = computed(() => {
    const words = this.pasteText().trim().split(/\s+/).filter(Boolean);
    return words.length;
  });
  readonly pasteStats = computed(() =>
    this.pasteText().trim()
      ? `${this.sentenceCount()} sentences · ${this.wordCount()} words detected`
      : 'Paste text to detect sentences',
  );
  readonly canSubmit = computed(() => this.pasteText().trim().length > 0);

  // --- file ---
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(true);
  }
  onDragLeave(): void {
    this.dragging.set(false);
  }
  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) this.uploadFile(file);
  }
  onBrowse(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.uploadFile(file);
    input.value = '';
  }

  private uploadFile(file: File, title?: string): void {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED.includes(ext)) {
      this.error.set('Only .txt and .md files are supported.');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.error.set('File is too large (max 5 MB).');
      return;
    }
    this.error.set(null);
    this.busy.set(true);
    this.documentService.upload(file, title).subscribe({
      next: (doc) => this.router.navigate(['/documents', doc.id]),
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.detail ?? 'Upload failed.');
      },
    });
  }

  // --- paste ---
  submitPaste(): void {
    if (!this.canSubmit() || this.busy()) return;
    const name = this.pasteName().trim() || 'Pasted contract';
    const file = new File([this.pasteText()], `${name}.txt`, {
      type: 'text/plain',
    });
    this.uploadFile(file, name);
  }

  clearPaste(): void {
    this.pasteName.set('');
    this.pasteText.set('');
  }

  goDashboard(): void {
    this.router.navigate(['/']);
  }
}
