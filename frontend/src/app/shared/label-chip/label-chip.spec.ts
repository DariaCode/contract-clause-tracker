import { TestBed } from '@angular/core/testing';

import { LabelChip } from './label-chip';

function chip() {
  const f = TestBed.createComponent(LabelChip);
  f.componentRef.setInput('color', '#1d4ed8');
  f.componentRef.setInput('name', 'Confidentiality');
  return f;
}

describe('LabelChip', () => {
  it('renders the label name', () => {
    const f = chip();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Confidentiality');
  });

  it('shows a count when one is provided', () => {
    const f = chip();
    f.componentRef.setInput('count', 3);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.chip__count')?.textContent?.trim()).toBe('3');
  });

  it('renders the remove control only when removable and emits remove on click', () => {
    const f = chip();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.chip__remove')).toBeNull();

    f.componentRef.setInput('removable', true);
    f.detectChanges();
    let removed = 0;
    f.componentInstance.remove.subscribe(() => removed++);
    f.nativeElement.querySelector('.chip__remove').click();
    expect(removed).toBe(1);
  });
});
