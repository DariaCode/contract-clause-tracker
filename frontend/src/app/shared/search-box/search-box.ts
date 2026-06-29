import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** Reusable search field: magnifier + input + clear ✕. Two-way via
 * `[value]` / `(valueChange)`. */
@Component({
  selector: 'app-search-box',
  imports: [FormsModule],
  templateUrl: './search-box.html',
  styleUrl: './search-box.scss',
})
export class SearchBox {
  readonly value = input('');
  readonly placeholder = input('Search…');
  readonly valueChange = output<string>();
}
