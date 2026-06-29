import { TestBed } from '@angular/core/testing';

import { SearchBox } from './search-box';

describe('SearchBox', () => {
  it('renders the placeholder and current value', async () => {
    const f = TestBed.createComponent(SearchBox);
    f.componentRef.setInput('placeholder', 'Search labels');
    f.componentRef.setInput('value', 'msa');
    f.detectChanges();
    await f.whenStable(); // ngModel writes the value on a microtask

    const input: HTMLInputElement = f.nativeElement.querySelector('input');
    expect(input.placeholder).toBe('Search labels');
    expect(input.value).toBe('msa');
  });

  it('emits valueChange when the user types', () => {
    const f = TestBed.createComponent(SearchBox);
    f.detectChanges();
    let last = '';
    f.componentInstance.valueChange.subscribe((v) => (last = v));

    const input: HTMLInputElement = f.nativeElement.querySelector('input');
    input.value = 'hello';
    input.dispatchEvent(new Event('input'));
    expect(last).toBe('hello');
  });

  it('shows the clear ✕ only when there is a value, and clears on click', () => {
    const f = TestBed.createComponent(SearchBox);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.icon-x')).toBeNull();

    f.componentRef.setInput('value', 'x');
    f.detectChanges();
    let last: string | undefined;
    f.componentInstance.valueChange.subscribe((v) => (last = v));
    f.nativeElement.querySelector('.icon-x').click();
    expect(last).toBe('');
  });
});
