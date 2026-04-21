import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { SidebarService } from '../../shared/services/sidebar.service';
import { routeAnimations } from '../../core/animations/route.animations';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  animations: [routeAnimations],
  template: `
    <div class="shell" [class.shell--collapsed]="sidebar.collapsed()">
      <app-sidebar />

      <div class="shell__main">
        <app-header />

        <main class="shell__content" [@routeAnimations]="getRouteState(outlet)">
          <router-outlet #outlet="outlet" />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: grid;
      grid-template-columns: var(--sidebar-width) 1fr;
      min-height: 100vh;
      transition: grid-template-columns var(--transition-base);
    }

    .shell--collapsed {
      grid-template-columns: var(--sidebar-collapsed-width) 1fr;
    }

    .shell__main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      background-color: var(--color-bg-secondary);
    }

    .shell__content {
      flex: 1;
      padding: var(--space-6);
      overflow-y: auto;
    }

    @media (max-width: 768px) {
      .shell {
        grid-template-columns: 0 1fr;
      }

      .shell--collapsed {
        grid-template-columns: 0 1fr;
      }
    }
  `],
})
export class ShellComponent {
  readonly sidebar = inject(SidebarService);

  /** Provides the animation trigger value from the active route's data. */
  getRouteState(outlet: RouterOutlet): string {
    return outlet?.activatedRouteData?.['animation'] ?? '';
  }
}
