import {
  Component, OnInit, inject, signal,
} from '@angular/core';
import {
  ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors,
} from '@angular/forms';

import { AuthService } from '../../core/auth/auth.service';

// ── Custom validator: new password must not equal current ─────────────────────
function notSameAs(currentKey: string) {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const parent = ctrl.parent;
    if (!parent) return null;
    const current = parent.get(currentKey)?.value;
    return ctrl.value && ctrl.value === current ? { samePassword: true } : null;
  };
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="st-page">

      <!-- ── Page header ──────────────────────────────────────────────────── -->
      <div class="st-header">
        <h1 class="st-title">Settings</h1>
        <p class="st-subtitle">Manage your account profile and security preferences</p>
      </div>

      <div class="st-sections">

        <!-- ══ Profile section ═════════════════════════════════════════════ -->
        <section class="st-card">
          <div class="st-card__header">
            <div class="st-card__icon">👤</div>
            <div>
              <h2 class="st-card__title">Profile</h2>
              <p class="st-card__desc">Update your display name and email address</p>
            </div>
          </div>

          <!-- Avatar preview -->
          @if (auth.currentUser(); as user) {
            <div class="st-avatar-row">
              <div class="st-avatar">{{ initials(user.fullName) }}</div>
              <div class="st-avatar-info">
                <span class="st-avatar-name">{{ user.fullName }}</span>
                <span class="st-avatar-email">{{ user.email }}</span>
              </div>
            </div>
          }

          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" novalidate>
            <div class="st-form-row">

              <!-- Full Name -->
              <div class="st-field">
                <label class="st-label" for="fullName">Full Name</label>
                <input
                  id="fullName"
                  class="st-input"
                  [class.st-input--error]="profileField('fullName').touched && profileField('fullName').invalid"
                  type="text"
                  placeholder="Your full name"
                  formControlName="fullName"
                  autocomplete="name"
                />
                @if (profileField('fullName').touched && profileField('fullName').errors?.['required']) {
                  <span class="st-error">Name is required</span>
                }
                @if (profileField('fullName').touched && profileField('fullName').errors?.['minlength']) {
                  <span class="st-error">At least 2 characters</span>
                }
              </div>

              <!-- Email -->
              <div class="st-field">
                <label class="st-label" for="email">Email</label>
                <input
                  id="email"
                  class="st-input"
                  [class.st-input--error]="profileField('email').touched && profileField('email').invalid"
                  type="email"
                  placeholder="you@example.com"
                  formControlName="email"
                  autocomplete="email"
                />
                @if (profileField('email').touched && profileField('email').errors?.['required']) {
                  <span class="st-error">Email is required</span>
                }
                @if (profileField('email').touched && profileField('email').errors?.['email']) {
                  <span class="st-error">Enter a valid email address</span>
                }
              </div>

            </div>

            <!-- Feedback banners -->
            @if (profileSuccess()) {
              <div class="st-banner st-banner--success">✓ Profile updated successfully</div>
            }
            @if (profileError()) {
              <div class="st-banner st-banner--error">{{ profileError() }}</div>
            }

            <div class="st-form-actions">
              <button
                class="btn btn--primary"
                type="submit"
                [disabled]="profileForm.invalid || profileSaving()"
              >
                @if (profileSaving()) { Saving… } @else { Save Profile }
              </button>
            </div>
          </form>
        </section>

        <!-- ══ Password section ════════════════════════════════════════════ -->
        <section class="st-card">
          <div class="st-card__header">
            <div class="st-card__icon">🔒</div>
            <div>
              <h2 class="st-card__title">Security</h2>
              <p class="st-card__desc">Change your password to keep your account safe</p>
            </div>
          </div>

          <form [formGroup]="passwordForm" (ngSubmit)="savePassword()" novalidate>

            <!-- Current password -->
            <div class="st-field">
              <label class="st-label" for="currentPassword">Current Password</label>
              <div class="st-input-wrap">
                <input
                  id="currentPassword"
                  class="st-input"
                  [class.st-input--error]="pwField('currentPassword').touched && pwField('currentPassword').invalid"
                  [type]="showCurrent() ? 'text' : 'password'"
                  placeholder="••••••••"
                  formControlName="currentPassword"
                  autocomplete="current-password"
                />
                <button type="button" class="st-eye"
                  (mousedown)="$event.preventDefault()"
                  (click)="showCurrent.set(!showCurrent())"
                >{{ showCurrent() ? '🙈' : '👁️' }}</button>
              </div>
              @if (pwField('currentPassword').touched && pwField('currentPassword').errors?.['required']) {
                <span class="st-error">Current password is required</span>
              }
            </div>

            <!-- New password -->
            <div class="st-field">
              <label class="st-label" for="newPassword">New Password</label>
              <div class="st-input-wrap">
                <input
                  id="newPassword"
                  class="st-input"
                  [class.st-input--error]="pwField('newPassword').touched && pwField('newPassword').invalid"
                  [type]="showNew() ? 'text' : 'password'"
                  placeholder="Min. 8 characters"
                  formControlName="newPassword"
                  autocomplete="new-password"
                />
                <button type="button" class="st-eye"
                  (mousedown)="$event.preventDefault()"
                  (click)="showNew.set(!showNew())"
                >{{ showNew() ? '🙈' : '👁️' }}</button>
              </div>
              @if (pwField('newPassword').touched && pwField('newPassword').errors?.['required']) {
                <span class="st-error">New password is required</span>
              }
              @if (pwField('newPassword').touched && pwField('newPassword').errors?.['minlength']) {
                <span class="st-error">At least 8 characters</span>
              }
              @if (pwField('newPassword').touched && pwField('newPassword').errors?.['samePassword']) {
                <span class="st-error">New password must differ from current</span>
              }
            </div>

            <!-- Confirm password -->
            <div class="st-field">
              <label class="st-label" for="confirmPassword">Confirm New Password</label>
              <div class="st-input-wrap">
                <input
                  id="confirmPassword"
                  class="st-input"
                  [class.st-input--error]="pwField('confirmPassword').touched && passwordForm.errors?.['mismatch']"
                  [type]="showConfirm() ? 'text' : 'password'"
                  placeholder="Repeat new password"
                  formControlName="confirmPassword"
                  autocomplete="new-password"
                />
                <button type="button" class="st-eye"
                  (mousedown)="$event.preventDefault()"
                  (click)="showConfirm.set(!showConfirm())"
                >{{ showConfirm() ? '🙈' : '👁️' }}</button>
              </div>
              @if (pwField('confirmPassword').touched && passwordForm.errors?.['mismatch']) {
                <span class="st-error">Passwords don't match</span>
              }
            </div>

            <!-- Strength indicator -->
            @if (pwField('newPassword').value) {
              <div class="st-strength">
                <div class="st-strength__bars">
                  @for (i of [1,2,3,4]; track i) {
                    <div
                      class="st-strength__bar"
                      [class.st-strength__bar--active]="i <= passwordStrength()"
                      [style.background]="strengthColor()"
                    ></div>
                  }
                </div>
                <span class="st-strength__label" [style.color]="strengthColor()">
                  {{ strengthLabel() }}
                </span>
              </div>
            }

            <!-- Feedback banners -->
            @if (pwSuccess()) {
              <div class="st-banner st-banner--success">✓ Password changed successfully</div>
            }
            @if (pwError()) {
              <div class="st-banner st-banner--error">{{ pwError() }}</div>
            }

            <div class="st-form-actions">
              <button
                class="btn btn--primary"
                type="submit"
                [disabled]="passwordForm.invalid || pwSaving()"
              >
                @if (pwSaving()) { Saving… } @else { Change Password }
              </button>
            </div>
          </form>
        </section>

        <!-- ══ Account info section ════════════════════════════════════════ -->
        @if (auth.currentUser(); as user) {
          <section class="st-card st-card--muted">
            <div class="st-card__header">
              <div class="st-card__icon">ℹ️</div>
              <div>
                <h2 class="st-card__title">Account Info</h2>
                <p class="st-card__desc">Read-only details about your account</p>
              </div>
            </div>
            <dl class="st-info-grid">
              <div class="st-info-row">
                <dt class="st-info-key">User ID</dt>
                <dd class="st-info-val">#{{ user.id }}</dd>
              </div>
              <div class="st-info-row">
                <dt class="st-info-key">Member since</dt>
                <dd class="st-info-val">{{ fmtDate(user.createdAt) }}</dd>
              </div>
            </dl>
          </section>
        }

      </div>
    </div>
  `,
  styles: [`
    /* ── Page layout ────────────────────────────────────────────────────────── */
    .st-page {
      padding: var(--space-6);
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      max-width: 780px;
      margin: 0 auto;
    }

    .st-header {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .st-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;
    }

    .st-subtitle {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0;
    }

    /* ── Sections ───────────────────────────────────────────────────────────── */
    .st-sections {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    /* ── Card ───────────────────────────────────────────────────────────────── */
    .st-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
    }

    .st-card--muted {
      background: var(--color-bg-secondary);
    }

    .st-card__header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      margin-bottom: var(--space-5);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }

    .st-card__icon {
      font-size: 1.25rem;
      line-height: 1;
      margin-top: 2px;
    }

    .st-card__title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-1);
    }

    .st-card__desc {
      font-size: 0.8rem;
      color: var(--color-text-tertiary);
      margin: 0;
    }

    /* ── Avatar row ─────────────────────────────────────────────────────────── */
    .st-avatar-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-5);
      padding: var(--space-3) var(--space-4);
      background: var(--color-bg-secondary);
      border-radius: var(--radius-md);
    }

    .st-avatar {
      width: 48px;
      height: 48px;
      min-width: 48px;
      background: var(--color-primary);
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: 700;
    }

    .st-avatar-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .st-avatar-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .st-avatar-email {
      font-size: 0.8rem;
      color: var(--color-text-tertiary);
    }

    /* ── Form layout ────────────────────────────────────────────────────────── */
    .st-form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
    }

    @media (max-width: 600px) { .st-form-row { grid-template-columns: 1fr; } }

    .st-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      margin-bottom: var(--space-4);
    }

    .st-label {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }

    .st-input-wrap {
      position: relative;
    }

    .st-input {
      width: 100%;
      padding: var(--space-3) var(--space-4);
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-primary);
      font-size: 0.9rem;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
      box-sizing: border-box;
    }

    .st-input-wrap .st-input {
      padding-right: 2.5rem;
    }

    .st-input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-light);
    }

    .st-input--error {
      border-color: var(--color-error) !important;
      box-shadow: 0 0 0 3px rgba(220, 38, 38, .12) !important;
    }

    .st-input::placeholder { color: var(--color-text-tertiary); }

    .st-eye {
      position: absolute;
      right: var(--space-3);
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      padding: 0;
      color: var(--color-text-tertiary);
    }

    .st-error {
      font-size: 0.75rem;
      color: var(--color-error);
    }

    /* ── Password strength ──────────────────────────────────────────────────── */
    .st-strength {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }

    .st-strength__bars {
      display: flex;
      gap: 4px;
    }

    .st-strength__bar {
      width: 36px;
      height: 5px;
      border-radius: 999px;
      background: var(--color-bg-tertiary);
      transition: background 300ms;
    }

    .st-strength__bar--active {
      /* color set via inline style */
    }

    .st-strength__label {
      font-size: 0.75rem;
      font-weight: 600;
      transition: color 300ms;
    }

    /* ── Feedback banners ───────────────────────────────────────────────────── */
    .st-banner {
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: var(--space-4);
    }

    .st-banner--success {
      background: rgba(22, 163, 74, .12);
      color: #4ade80;
      border: 1px solid rgba(22, 163, 74, .25);
    }

    .st-banner--error {
      background: rgba(220, 38, 38, .12);
      color: #f87171;
      border: 1px solid rgba(220, 38, 38, .25);
    }

    /* ── Form actions ───────────────────────────────────────────────────────── */
    .st-form-actions {
      display: flex;
      justify-content: flex-end;
    }

    /* ── Account info ───────────────────────────────────────────────────────── */
    .st-info-grid {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .st-info-row {
      display: flex;
      gap: var(--space-4);
    }

    .st-info-key {
      font-size: 0.8rem;
      color: var(--color-text-tertiary);
      width: 120px;
      min-width: 120px;
    }

    .st-info-val {
      font-size: 0.8rem;
      color: var(--color-text-primary);
      font-weight: 500;
    }
  `],
})
export class SettingsComponent implements OnInit {

  readonly auth = inject(AuthService);
  private  fb   = inject(FormBuilder);

  // ── Profile form ────────────────────────────────────────────────────────────
  profileForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email:    ['', [Validators.required, Validators.email]],
  });

  readonly profileSaving = signal(false);
  readonly profileSuccess = signal(false);
  readonly profileError   = signal<string | null>(null);

  // ── Password form ────────────────────────────────────────────────────────────
  passwordForm = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(8), notSameAs('currentPassword')]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchPasswords },
  );

  readonly pwSaving  = signal(false);
  readonly pwSuccess = signal(false);
  readonly pwError   = signal<string | null>(null);

  // ── Visibility toggles ────────────────────────────────────────────────────────
  readonly showCurrent = signal(false);
  readonly showNew     = signal(false);
  readonly showConfirm = signal(false);

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.profileForm.patchValue({ fullName: user.fullName, email: user.email });
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  profileField(name: string) {
    return this.profileForm.get(name)!;
  }

  pwField(name: string) {
    return this.passwordForm.get(name)!;
  }

  /** Returns up to two uppercase initials from a full name. */
  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  }

  fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ── Password strength ─────────────────────────────────────────────────────────

  passwordStrength(): number {
    const pw: string = this.pwField('newPassword').value ?? '';
    let score = 0;
    if (pw.length >= 8)  score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  strengthColor(): string {
    const s = this.passwordStrength();
    if (s <= 1) return '#dc2626';
    if (s === 2) return '#ea580c';
    if (s === 3) return '#ca8a04';
    return '#16a34a';
  }

  strengthLabel(): string {
    const s = this.passwordStrength();
    if (s <= 1) return 'Weak';
    if (s === 2) return 'Fair';
    if (s === 3) return 'Good';
    return 'Strong';
  }

  // ── Form submissions ─────────────────────────────────────────────────────────

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.profileSaving.set(true);
    this.profileSuccess.set(false);
    this.profileError.set(null);

    const { fullName, email } = this.profileForm.value;
    this.auth.updateProfile({ fullName: fullName!, email: email! }).subscribe({
      next: () => {
        this.profileSaving.set(false);
        this.profileSuccess.set(true);
        setTimeout(() => this.profileSuccess.set(false), 4000);
      },
      error: (err) => {
        this.profileSaving.set(false);
        this.profileError.set(err?.error?.message ?? 'Failed to update profile. Please try again.');
      },
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) return;
    this.pwSaving.set(true);
    this.pwSuccess.set(false);
    this.pwError.set(null);

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.auth.changePassword({ currentPassword: currentPassword!, newPassword: newPassword! }).subscribe({
      next: () => {
        this.pwSaving.set(false);
        this.pwSuccess.set(true);
        this.passwordForm.reset();
        setTimeout(() => this.pwSuccess.set(false), 4000);
      },
      error: (err) => {
        this.pwSaving.set(false);
        this.pwError.set(err?.error?.message ?? 'Failed to change password. Please verify your current password.');
      },
    });
  }
}

// ── Group-level validator: confirmPassword must match newPassword ──────────────
function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const np = group.get('newPassword')?.value;
  const cp = group.get('confirmPassword')?.value;
  return np && cp && np !== cp ? { mismatch: true } : null;
}
