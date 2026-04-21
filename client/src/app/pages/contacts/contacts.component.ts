import { Component } from '@angular/core';

@Component({
  selector: 'app-contacts',
  standalone: true,
  template: `
    <div class="placeholder">
      <div class="placeholder__icon">👥</div>
      <h2 class="placeholder__title">Contacts</h2>
      <p class="placeholder__text">Contact list with search, filters and CRUD operations coming in Phase 3.</p>
    </div>
  `,
  styles: [`
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
      gap: var(--space-4);
      animation: fadeIn 0.4s ease both;
    }

    .placeholder__icon {
      font-size: 3rem;
      opacity: 0.3;
    }

    .placeholder__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;
    }

    .placeholder__text {
      font-size: 0.95rem;
      color: var(--color-text-secondary);
      max-width: 400px;
      margin: 0;
    }
  `],
})
export class ContactsComponent {}
