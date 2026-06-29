import { Routes } from '@angular/router';

/**
 * Routed screens (lazy-loaded):
 *   '' .................. dashboard: document list with search / filter / group
 *   'upload' ............ upload contracts
 *   'labels' ............ manage the label catalog
 *   'documents/:id' ..... editor: read the contract and label sentences
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'upload',
    loadComponent: () => import('./features/upload/upload').then((m) => m.Upload),
  },
  {
    path: 'labels',
    loadComponent: () => import('./features/labels/labels').then((m) => m.Labels),
  },
  {
    path: 'documents/:id',
    loadComponent: () =>
      import('./features/document-editor/document-editor').then((m) => m.DocumentEditor),
  },
  { path: '**', redirectTo: '' },
];
