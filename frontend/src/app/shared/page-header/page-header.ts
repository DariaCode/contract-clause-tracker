import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Shared page header: an optional breadcrumb, a title, a projected `[subline]`
 * of meta text, and projected right-aligned `[actions]` (buttons, search, …). */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly breadcrumb = input('');
  readonly breadcrumbLink = input('/');
}
