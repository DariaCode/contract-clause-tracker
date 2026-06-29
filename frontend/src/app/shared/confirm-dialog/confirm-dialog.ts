import { Component, HostListener, inject } from '@angular/core';

import { ConfirmService } from '../../core/confirm.service';

/** App-wide confirmation modal, driven by ConfirmService. Mounted once in the
 * app shell. */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  readonly confirm = inject(ConfirmService);

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.confirm.pending()) this.confirm.respond(false);
  }
}
