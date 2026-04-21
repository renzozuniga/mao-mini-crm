import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { authCardAnimation } from '../../../core/animations/route.animations';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  animations: [authCardAnimation],
  template: `
    <div class="auth-page">
      <div class="auth-card" @authCard>

        <!-- Brand -->
        <div class="auth-card__brand">
          <div class="auth-card__logo">M</div>
          <h1 class="auth-card__title">MAO CRM</h1>
          <p class="auth-card__subtitle">Sign in to your account</p>
        </div>

        <!-- Error banner -->
        @if (errorMsg()) {
          <div class="auth-card__error" role="alert">{{ errorMsg() }}</div>
        }

        <!-- Form -->
        <form class="auth-card__form" [formGroup]="form" (ngSubmit)="submit()">

          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input
              id="email"
              class="form-input"
              type="email"
              formControlName="email"
              placeholder="you@example.com"
              autocomplete="email"
            />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <span class="form-error">Enter a valid email address.</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input
              id="password"
              class="form-input"
              type="password"
              formControlName="password"
              placeholder="••••••••"
              autocomplete="current-password"
            />
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <span class="form-error">Password is required.</span>
            }
          </div>

          <button
            class="btn btn--primary btn--full"
            type="submit"
            [disabled]="loading()"
          >
            @if (loading()) {
              <span class="btn__spinner"></span> Signing in…
            } @else {
              Sign in
            }
          </button>

        </form>

        <p class="auth-card__footer">
          Don't have an account?
          <a routerLink="/auth/register" class="auth-card__link">Create one</a>
        </p>

      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-bg-secondary);
      padding: var(--space-4);
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: var(--space-8);
      box-shadow: var(--shadow-lg);
    }

    .auth-card__brand {
      text-align: center;
      margin-bottom: var(--space-6);
    }

    .auth-card__logo {
      width: 48px;
      height: 48px;
      background: var(--color-primary);
      color: #fff;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 auto var(--space-3);
    }

    .auth-card__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-1);
    }

    .auth-card__subtitle {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .auth-card__error {
      background-color: var(--color-danger-light);
      color: var(--color-danger);
      border: 1px solid currentColor;
      border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4);
      font-size: 0.875rem;
      margin-bottom: var(--space-4);
    }

    .auth-card__form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .auth-card__footer {
      text-align: center;
      margin-top: var(--space-5);
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .auth-card__link {
      color: var(--color-primary);
      font-weight: 600;
      text-decoration: none;
    }

    .auth-card__link:hover {
      text-decoration: underline;
    }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private fb   = inject(FormBuilder);

  readonly loading  = signal(false);
  readonly errorMsg = signal('');

  readonly form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    const { email, password } = this.form.getRawValue();

    this.auth.login({ email: email!, password: password! }).subscribe({
      next:  ()  => this.loading.set(false),
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Invalid email or password.');
      },
    });
  }
}
