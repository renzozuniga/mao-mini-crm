import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarService } from '../../shared/services/sidebar.service';

interface NavItem {
  path:  string;
  label: string;
  icon:  string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.sidebar--collapsed]="sidebar.collapsed()">

      <!-- Brand -->
      <div class="sidebar__brand">
        <span class="sidebar__logo">M</span>
        <span class="sidebar__brand-name">MAO CRM</span>
      </div>

      <!-- Navigation -->
      <nav class="sidebar__nav" aria-label="Main navigation">
        @for (item of navItems; track item.path) {
          <a
            class="sidebar__link"
            [routerLink]="item.path"
            routerLinkActive="sidebar__link--active"
            [title]="item.label"
          >
            <span class="sidebar__icon" [innerHTML]="item.icon"></span>
            <span class="sidebar__label">{{ item.label }}</span>
          </a>
        }
      </nav>

      <!-- Toggle button -->
      <button
        class="sidebar__toggle"
        (click)="sidebar.toggle()"
        [attr.aria-label]="sidebar.collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <span class="sidebar__toggle-icon">{{ sidebar.collapsed() ? '→' : '←' }}</span>
      </button>

    </aside>
  `,
  styles: [`
    .sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      background-color: var(--color-surface);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: width var(--transition-base);
      width: var(--sidebar-width);
      z-index: 100;
    }

    .sidebar--collapsed {
      width: var(--sidebar-collapsed-width);
    }

    /* Brand */
    .sidebar__brand {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-5) var(--space-4);
      border-bottom: 1px solid var(--color-border);
      min-height: 64px;
    }

    .sidebar__logo {
      width: 32px;
      height: 32px;
      min-width: 32px;
      background: var(--color-primary);
      color: #fff;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
    }

    .sidebar__brand-name {
      font-weight: 700;
      font-size: 1rem;
      color: var(--color-text-primary);
      white-space: nowrap;
      opacity: 1;
      transition: opacity var(--transition-base);
    }

    .sidebar--collapsed .sidebar__brand-name {
      opacity: 0;
      pointer-events: none;
    }

    /* Nav */
    .sidebar__nav {
      flex: 1;
      padding: var(--space-4) var(--space-2);
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .sidebar__link {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-3);
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color var(--transition-fast), color var(--transition-fast);
      white-space: nowrap;
      overflow: hidden;
    }

    .sidebar__link:hover {
      background-color: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }

    .sidebar__link--active {
      background-color: var(--color-primary-light);
      color: var(--color-primary);
    }

    .sidebar__icon {
      min-width: 20px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }

    .sidebar__label {
      opacity: 1;
      transition: opacity var(--transition-base);
    }

    .sidebar--collapsed .sidebar__label {
      opacity: 0;
      pointer-events: none;
    }

    /* Toggle */
    .sidebar__toggle {
      margin: var(--space-4);
      padding: var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: transparent;
      cursor: pointer;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color var(--transition-fast), color var(--transition-fast);
    }

    .sidebar__toggle:hover {
      background-color: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }

    .sidebar__toggle-icon {
      font-size: 0.85rem;
      font-style: normal;
      transition: transform var(--transition-base);
    }
  `],
})
export class SidebarComponent {
  readonly sidebar = inject(SidebarService);

  readonly navItems: NavItem[] = [
    { path: '/dashboard',  label: 'Dashboard',   icon: '⊞' },
    { path: '/contacts',   label: 'Contacts',     icon: '👥' },
    { path: '/pipeline',   label: 'Pipeline',     icon: '⬡' },
    { path: '/activities', label: 'Activities',   icon: '⚡' },
  ];
}
