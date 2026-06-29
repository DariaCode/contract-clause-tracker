import { Component, computed, input, output } from '@angular/core';

import { tint } from '../../core/ui';

/**
 * A label shown as a pill: colour dot + name.
 *   tone="neutral" — grey pill (dashboard tags)
 *   tone="color"   — tinted in the label colour, optionally removable (editor)
 */
@Component({
  selector: 'app-label-chip',
  templateUrl: './label-chip.html',
  styleUrl: './label-chip.scss',
})
export class LabelChip {
  readonly color = input.required<string>();
  readonly name = input.required<string>();
  readonly tone = input<'neutral' | 'color'>('neutral');
  readonly removable = input(false);
  readonly count = input<number | null>(null);
  readonly remove = output<void>();

  readonly tintColor = computed(() => tint(this.color()));

  onRemove(event: Event): void {
    event.stopPropagation();
    this.remove.emit();
  }
}
