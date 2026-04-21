import { Injectable, signal, computed } from '@angular/core';

/** Manages sidebar collapsed/expanded state across the shell layout. */
@Injectable({ providedIn: 'root' })
export class SidebarService {
  private _collapsed = signal<boolean>(false);

  readonly collapsed  = this._collapsed.asReadonly();
  readonly expanded   = computed(() => !this._collapsed());

  toggle(): void {
    this._collapsed.update(v => !v);
  }

  collapse(): void {
    this._collapsed.set(true);
  }

  expand(): void {
    this._collapsed.set(false);
  }
}
