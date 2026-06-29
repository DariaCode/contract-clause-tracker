import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** App logo + wordmark, links to the dashboard. Reused in the navbar (and
 * anywhere else the brand mark is needed). */
@Component({
  selector: 'app-brand',
  imports: [RouterLink],
  templateUrl: './brand.html',
  styleUrl: './brand.scss',
})
export class Brand {}
