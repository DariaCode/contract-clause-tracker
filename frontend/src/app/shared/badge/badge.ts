import { Component, input } from '@angular/core';

/** Small mono uppercase badge — used for ext tags (TXT/MD) and the CUSTOM mark.
 * `variant`: 'orange' (default) or 'grey'. */
@Component({
  selector: 'app-badge',
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
})
export class Badge {
  readonly variant = input<'orange' | 'grey'>('orange');
}
