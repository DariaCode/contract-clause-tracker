import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

/** Focuses the host element once it is inserted — used for the popover search
 * input, which is created fresh each time the popover opens (so the native
 * `autofocus` attribute won't fire). */
@Directive({ selector: '[appAutofocus]' })
export class AutofocusDirective implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    queueMicrotask(() => this.el.nativeElement.focus());
  }
}
