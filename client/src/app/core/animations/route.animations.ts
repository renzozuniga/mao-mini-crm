import { trigger, transition, style, animate, query } from '@angular/animations';

/**
 * Fade-only animation for page transitions inside the shell.
 * NOTE: intentionally no `transform` — any lingering transform on an ancestor
 * element breaks CDK drag-drop's `position:fixed` preview coordinates.
 */
export const routeAnimations = trigger('routeAnimations', [
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0 }),
      animate('200ms ease', style({ opacity: 1 })),
    ], { optional: true }),
  ]),
]);

/** Scale + fade animation for the auth card entering the screen. */
export const authCardAnimation = trigger('authCard', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.95) translateY(12px)' }),
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ opacity: 1, transform: 'scale(1) translateY(0)' })),
  ]),
]);
