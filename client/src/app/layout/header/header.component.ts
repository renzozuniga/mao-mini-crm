import { Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { SidebarService } from '../../shared/services/sidebar.service';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/contacts':   'Contacts',
  '/pipeline':   'Pipeline',
  '/activities': 'Activities',
  '/reports':    'Reports',
  '/settings':   'Settings',
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <header class="header">

      <!-- Left: hamburger (mobile) + page title -->
      <div class="header__left">
        <button
          class="header__hamburger"
          (click)="sidebar.toggle()"
          aria-label="Toggle sidebar"
        >☰</button>

        <h1 class="header__title">{{ pageTitle$ | async }}</h1>
      </div>

      <!-- Right: user info + logout -->
      <div class="header__right">
        @if (auth.currentUser(); as user) {
          <div class="header__user">
            <div class="header__avatar">{{ initials(user.fullName) }}</div>
            <span class="header__name">{{ user.fullName }}</span>
          </div>
        }

        <button class="header__logout btn btn--ghost" (click)="auth.logout()">
          Logout
        </button>
      </div>

    </header>
  `,
  styles: [`
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-6);
      height: 64px;
      background-color: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      position: sticky;
      top: 0;
      z-index: 90;
    }

    .header__left {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .header__hamburger {
      display: none;
      background: transparent;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      color: var(--color-text-secondary);
      padding: var(--space-2);
      border-radius: var(--radius-sm);

      @media (max-width: 768px) {
        display: flex;
      }
    }

    .header__title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .header__right {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .header__user {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .header__avatar {
      width: 32px;
      height: 32px;
      min-width: 32px;
      background: var(--color-primary);
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .header__name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-primary);

      @media (max-width: 480px) {
        display: none;
      }
    }

    .header__logout {
      font-size: 0.8rem;
      padding: var(--space-2) var(--space-3);
    }
  `],
})
export class HeaderComponent {
  readonly auth    = inject(AuthService);
  readonly sidebar = inject(SidebarService);
  private router   = inject(Router);

  readonly pageTitle$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    startWith(null),
    map(() => ROUTE_TITLES[this.router.url] ?? 'MAO CRM'),
  );

  /** Returns up to two uppercase initials from a full name. */
  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() ?? '')
      .join('');
  }
}
