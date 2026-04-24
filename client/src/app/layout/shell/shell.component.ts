import { Component, inject, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { SidebarService } from '../../shared/services/sidebar.service';
import { routeAnimations } from '../../core/animations/route.animations';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, CdkScrollable, SidebarComponent, HeaderComponent],
  animations: [routeAnimations],
  template: `
    <div class="shell" [class.shell--collapsed]="sidebar.collapsed()">
      <app-sidebar />

      <div class="shell__main">
        <app-header />

        <!-- cdkScrollable registers this scroll container with CDK's ScrollDispatcher
             so drag-drop previews are offset-corrected when the content is scrolled. -->
        <main class="shell__content" cdkScrollable [@routeAnimations]="getRouteState(outlet)">
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
export class ShellComponent implements AfterViewInit {
  readonly sidebar = inject(SidebarService);
  private  cdr     = inject(ChangeDetectorRef);

  /**
   * Runs an extra change-detection pass after the view initialises so that
   * the router outlet's activatedRouteData is available before Angular checks
   * the @routeAnimations binding — prevents NG0100.
   */
  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }

  /** Provides the animation trigger value from the active route's data. */
  getRouteState(outlet: RouterOutlet): string {
    return outlet?.activatedRouteData?.['animation'] ?? '';
  }
}
