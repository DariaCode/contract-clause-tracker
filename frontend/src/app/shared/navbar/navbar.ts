import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Brand } from '../brand/brand';

/** Sticky app navbar shown on every screen: brand + nav links. (Search lives
 * on the dashboard.) */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, Brand],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {}
