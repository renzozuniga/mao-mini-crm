import {
  Component, OnInit, OnDestroy,
  inject, signal, computed, ElementRef, ViewChild,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import {
  trigger, transition, style, animate, query, stagger,
} from '@angular/animations';

import { ContactsService } from '../../shared/services/contacts.service';
import {
  Contact, ContactStatus, ContactsQuery,
  CreateContactDto,
} from '../../core/models/contact.model';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ContactStatus, { label: string; color: string; bg: string }> = {
  LEAD:     { label: 'Lead',     color: '#2563eb', bg: 'rgba(37,99,235,.12)'   },
  ACTIVE:   { label: 'Active',   color: '#16a34a', bg: 'rgba(22,163,74,.12)'   },
  INACTIVE: { label: 'Inactive', color: '#6b7280', bg: 'rgba(107,114,128,.12)' },
};

const STATUSES: ContactStatus[] = ['LEAD', 'ACTIVE', 'INACTIVE'];

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [ReactiveFormsModule],
  animations: [
    /* Spring-pop entrance for each card; stagger applied from parent @list trigger */
    trigger('cardEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(28px) scale(0.94)' }),
        animate(
          '420ms cubic-bezier(0.34,1.56,0.64,1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }),
        ),
      ]),
    ]),

    /* Grid container trigger — staggers only newly entered cards */
    trigger('list', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(28px) scale(0.94)' }),
          stagger('45ms', [
            animate(
              '420ms cubic-bezier(0.34,1.56,0.64,1)',
              style({ opacity: 1, transform: 'translateY(0) scale(1)' }),
            ),
          ]),
        ], { optional: true }),
      ]),
    ]),

    /* Drawer slide-in from right */
    trigger('drawer', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('240ms cubic-bezier(0.4,0,0.2,1)',
          style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4,0,0.2,1)',
          style({ transform: 'translateX(100%)', opacity: 0 })),
      ]),
    ]),

    /* Overlay / modal fade */
    trigger('fade', [
      transition(':enter',  [style({ opacity: 0 }), animate('180ms ease', style({ opacity: 1 }))]),
      transition(':leave',  [animate('150ms ease', style({ opacity: 0 }))]),
    ]),
  ],
  template: `
    <!-- ── Sticky toolbar ──────────────────────────────────────────────────── -->
    <div class="ct-toolbar">
      <div class="ct-toolbar__left">
        <div class="ct-search">
          <span class="ct-search__icon">🔍</span>
          <input
            class="ct-search__input"
            type="text"
            placeholder="Search name, email or company…"
            [value]="searchTerm()"
            (input)="onSearch($event)"
          />
          @if (searchTerm()) {
            <button class="ct-search__clear" (click)="clearSearch()">✕</button>
          }
        </div>

        <div class="ct-filter-tabs">
          <button
            class="ct-filter-tab"
            [class.ct-filter-tab--active]="activeStatus() === ''"
            (click)="setStatus('')"
          >All <span class="ct-filter-tab__count">{{ total() }}</span></button>
          @for (s of statuses; track s) {
            <button
              class="ct-filter-tab"
              [class.ct-filter-tab--active]="activeStatus() === s"
              (click)="setStatus(s)"
            >{{ statusLabel(s) }}</button>
          }
        </div>
      </div>

      <button class="btn btn--primary btn--sm" (click)="openCreate()">
        + New Contact
      </button>
    </div>

    <!-- ── Initial full-page skeleton ─────────────────────────────────────── -->
    @if (loading()) {
      <div class="ct-grid">
        @for (_ of skeletonRows(); track $index) {
          <div class="ct-card ct-card--skeleton">
            <div class="ct-sk-header">
              <div class="sk sk--avatar"></div>
              <div class="sk sk--badge"></div>
            </div>
            <div class="sk-body">
              <div class="sk sk--title"></div>
              <div class="sk sk--sub"></div>
              <div class="sk sk--sub2"></div>
            </div>
            <div class="ct-sk-footer">
              <div class="sk sk--stat"></div>
              <div class="sk sk--stat"></div>
            </div>
          </div>
        }
      </div>

    <!-- ── Empty state ─────────────────────────────────────────────────────── -->
    } @else if (contacts().length === 0) {
      <div class="ct-empty">
        <p class="ct-empty__icon">👥</p>
        <h3 class="ct-empty__title">
          {{ searchTerm() || activeStatus() ? 'No contacts found' : 'No contacts yet' }}
        </h3>
        <p class="ct-empty__sub">
          {{ searchTerm() || activeStatus()
            ? 'Try a different search or filter.'
            : 'Create your first contact to get started.' }}
        </p>
        @if (!searchTerm() && !activeStatus()) {
          <button class="btn btn--primary" (click)="openCreate()">+ New Contact</button>
        }
      </div>

    <!-- ── Cards grid (infinite scroll) ───────────────────────────────────── -->
    } @else {
      <div class="ct-grid" [@list]="contacts().length">
        @for (c of contacts(); track c.id) {
          <article class="ct-card" (click)="openEdit(c)">
            <div class="ct-card__header">
              <div class="ct-card__avatar" [style.background]="avatarColor(c.name)">
                {{ initials(c.name) }}
              </div>
              <span
                class="ct-card__badge"
                [style.color]="statusColor(c.status)"
                [style.background]="statusBg(c.status)"
              >{{ statusLabel(c.status) }}</span>
            </div>

            <div class="ct-card__body">
              <h3 class="ct-card__name">{{ c.name }}</h3>
              @if (c.company) {
                <p class="ct-card__company">🏢 {{ c.company }}</p>
              }
              @if (c.email) {
                <p class="ct-card__info">✉️ {{ c.email }}</p>
              }
              @if (c.phone) {
                <p class="ct-card__info">📞 {{ c.phone }}</p>
              }
            </div>

            <div class="ct-card__footer">
              <span class="ct-card__stat" title="Opportunities">⬡ {{ c._count?.opportunities ?? 0 }}</span>
              <span class="ct-card__stat" title="Activities">⚡ {{ c._count?.activities ?? 0 }}</span>
              <div class="ct-card__actions" (click)="$event.stopPropagation()">
                <button
                  class="ct-card__action-btn"
                  (click)="openEdit(c)"
                  title="Edit"
                >✏️</button>
                <button
                  class="ct-card__action-btn ct-card__action-btn--del"
                  (click)="confirmDelete(c)"
                  title="Delete"
                >🗑</button>
              </div>
            </div>
          </article>
        }
      </div>

      <!-- Bottom loading-more skeletons -->
      @if (loadingMore()) {
        <div class="ct-grid ct-grid--more">
          @for (_ of skeletonMore; track $index) {
            <div class="ct-card ct-card--skeleton">
              <div class="ct-sk-header">
                <div class="sk sk--avatar"></div>
                <div class="sk sk--badge"></div>
              </div>
              <div class="sk-body">
                <div class="sk sk--title"></div>
                <div class="sk sk--sub"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Sentinel element — triggers the IntersectionObserver -->
      @if (hasMore() && !loadingMore()) {
        <div #sentinel class="ct-sentinel"></div>
      }

      <!-- All loaded -->
      @if (!hasMore()) {
        <div class="ct-end">
          <span class="ct-end__line"></span>
          <span class="ct-end__text">{{ total() }} contacts loaded</span>
          <span class="ct-end__line"></span>
        </div>
      }
    }

    <!-- ── Drawer overlay ──────────────────────────────────────────────────── -->
    @if (drawerMode()) {
      <div class="ct-overlay" @fade (click)="closeDrawer()"></div>

      <aside class="ct-drawer" @drawer>
        <div class="ct-drawer__header">
          <h2 class="ct-drawer__title">
            {{ drawerMode() === 'create' ? 'New Contact' : 'Edit Contact' }}
          </h2>
          <button class="ct-drawer__close" (click)="closeDrawer()">✕</button>
        </div>

        <form class="ct-drawer__form" [formGroup]="form" (ngSubmit)="submitForm()">
          <div class="form-group">
            <label class="form-label" for="name">Full Name *</label>
            <input id="name" class="form-input" formControlName="name" placeholder="John Doe" />
            @if (form.get('name')?.invalid && form.get('name')?.touched) {
              <span class="form-error">Name must be at least 2 characters.</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label">Status *</label>
            <div class="ct-status-select">
              @for (s of statuses; track s) {
                <button
                  type="button"
                  class="ct-status-btn"
                  [class.ct-status-btn--active]="form.get('status')?.value === s"
                  [style.border-color]="form.get('status')?.value === s ? statusColor(s) : ''"
                  [style.color]="form.get('status')?.value === s ? statusColor(s) : ''"
                  (click)="form.get('status')?.setValue(s)"
                >{{ statusLabel(s) }}</button>
              }
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="company">Company</label>
            <input id="company" class="form-input" formControlName="company" placeholder="Acme Corp" />
          </div>

          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input id="email" class="form-input" type="email" formControlName="email" placeholder="john@example.com" />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <span class="form-error">Enter a valid email address.</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="phone">Phone</label>
            <input id="phone" class="form-input" formControlName="phone" placeholder="+1 555 000 000" />
          </div>

          <div class="form-group">
            <label class="form-label" for="notes">Notes</label>
            <textarea
              id="notes" class="form-input form-input--textarea"
              formControlName="notes"
              rows="3"
              placeholder="Any relevant context…"
            ></textarea>
          </div>

          @if (formError()) {
            <div class="ct-form-error" role="alert">{{ formError() }}</div>
          }

          <div class="ct-drawer__actions">
            <button type="button" class="btn btn--ghost" (click)="closeDrawer()">Cancel</button>
            <button type="submit" class="btn btn--primary" [disabled]="saving()">
              @if (saving()) { <span class="btn__spinner"></span> }
              {{ drawerMode() === 'create' ? 'Create Contact' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </aside>
    }

    <!-- ── Delete confirmation modal ──────────────────────────────────────── -->
    @if (deleteTarget()) {
      <div class="ct-overlay" @fade (click)="cancelDelete()"></div>
      <div class="ct-confirm" @fade>
        <p class="ct-confirm__icon">🗑</p>
        <h3 class="ct-confirm__title">Delete contact?</h3>
        <p class="ct-confirm__msg">
          <strong>{{ deleteTarget()!.name }}</strong> and all their associated
          activities and opportunities will be permanently removed.
          This cannot be undone.
        </p>
        <div class="ct-confirm__actions">
          <button class="btn btn--ghost" (click)="cancelDelete()">Cancel</button>
          <button class="btn btn--danger" [disabled]="saving()" (click)="executeDelete()">
            @if (saving()) { <span class="btn__spinner"></span> }
            Delete
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Sticky toolbar ────────────────────────────────────────────────────── */
    .ct-toolbar {
      position: sticky;
      top: -1px;
      z-index: 10;
      background: rgba(15,17,23,0.92);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding-top: var(--space-3);
      padding-bottom: var(--space-4);
      margin-bottom: var(--space-2);
      flex-wrap: wrap;
      border-bottom: 1px solid rgba(255,255,255,.05);
    }
    .ct-toolbar__left {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-wrap: wrap;
      flex: 1;
    }

    /* ── Search ────────────────────────────────────────────────────────────── */
    .ct-search {
      position: relative;
      display: flex;
      align-items: center;
      min-width: 240px;
    }
    .ct-search__icon {
      position: absolute;
      left: var(--space-3);
      font-size: 0.85rem;
      pointer-events: none;
    }
    .ct-search__input {
      width: 100%;
      padding: var(--space-2) var(--space-3) var(--space-2) 2.2rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-primary);
      font-size: 0.875rem;
      outline: none;
      transition: border-color var(--transition-fast);
    }
    .ct-search__input:focus { border-color: var(--color-primary); }
    .ct-search__input::placeholder { color: var(--color-text-secondary); }
    .ct-search__clear {
      position: absolute;
      right: var(--space-3);
      background: none;
      border: none;
      color: var(--color-text-secondary);
      font-size: 0.75rem;
      cursor: pointer;
      padding: 2px;
    }

    /* ── Filter tabs ───────────────────────────────────────────────────────── */
    .ct-filter-tabs {
      display: flex;
      gap: var(--space-1);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 3px;
    }
    .ct-filter-tab {
      padding: var(--space-1) var(--space-3);
      border-radius: calc(var(--radius-md) - 2px);
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      background: none;
      border: none;
      cursor: pointer;
      transition: background var(--transition-fast), color var(--transition-fast);
      display: flex;
      align-items: center;
      gap: var(--space-1);
      white-space: nowrap;
    }
    .ct-filter-tab:hover { color: var(--color-text-primary); }
    .ct-filter-tab--active { background: var(--color-primary); color: #fff; }
    .ct-filter-tab__count {
      font-size: 0.7rem;
      background: rgba(255,255,255,.2);
      border-radius: 99px;
      padding: 0 5px;
    }

    /* ── Cards grid ────────────────────────────────────────────────────────── */
    .ct-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }
    .ct-grid--more { margin-top: 0; }

    /* ── Contact card ──────────────────────────────────────────────────────── */
    .ct-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      cursor: pointer;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast),
                  border-color var(--transition-fast);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      will-change: transform;
    }
    .ct-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-md);
      border-color: rgba(255,255,255,.12);
    }
    .ct-card--skeleton { cursor: default; pointer-events: none; min-height: 160px; }

    .ct-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .ct-card__avatar {
      width: 42px; height: 42px; min-width: 42px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.875rem; font-weight: 700; color: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,.3);
    }
    .ct-card__badge {
      font-size: 0.68rem; font-weight: 700;
      padding: 3px 9px; border-radius: var(--radius-full);
      letter-spacing: .04em;
    }
    .ct-card__name {
      font-size: 0.9375rem; font-weight: 700;
      color: var(--color-text-primary); margin: 0;
    }
    .ct-card__company {
      font-size: 0.8rem; color: var(--color-text-secondary); margin: 0;
    }
    .ct-card__info {
      font-size: 0.78rem; color: var(--color-text-secondary); margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ct-card__body { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .ct-card__footer {
      display: flex; align-items: center; gap: var(--space-3);
      border-top: 1px solid var(--color-border);
      padding-top: var(--space-3);
      margin-top: auto;
    }
    .ct-card__stat {
      font-size: 0.75rem; color: var(--color-text-secondary);
      display: flex; align-items: center; gap: 4px;
    }
    .ct-card__actions {
      margin-left: auto; display: flex; gap: var(--space-2);
      opacity: 0; transition: opacity var(--transition-fast);
    }
    .ct-card:hover .ct-card__actions { opacity: 1; }
    .ct-card__action-btn {
      background: none; border: none; cursor: pointer;
      font-size: 0.85rem; padding: 4px; border-radius: var(--radius-sm);
      transition: background var(--transition-fast);
    }
    .ct-card__action-btn:hover { background: rgba(255,255,255,.08); }
    .ct-card__action-btn--del:hover { background: rgba(220,38,38,.15); }

    /* ── Skeleton ──────────────────────────────────────────────────────────── */
    .sk {
      background: linear-gradient(90deg,
        var(--color-surface) 25%,
        var(--color-surface-hover) 50%,
        var(--color-surface) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-sm);
    }
    .sk--avatar  { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; }
    .sk--badge   { width: 56px; height: 20px; border-radius: var(--radius-full); }
    .sk--title   { width: 60%; height: 14px; }
    .sk--sub     { width: 80%; height: 11px; }
    .sk--sub2    { width: 55%; height: 11px; }
    .sk--stat    { width: 40px; height: 11px; }
    .ct-sk-header {
      display: flex; align-items: center; justify-content: space-between;
    }
    .ct-sk-footer {
      display: flex; gap: var(--space-3);
      border-top: 1px solid var(--color-border);
      padding-top: var(--space-3);
    }
    .sk-body { flex: 1; display: flex; flex-direction: column; gap: var(--space-2); justify-content: center; }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Sentinel & end-of-list ────────────────────────────────────────────── */
    .ct-sentinel {
      height: 32px;
      width: 100%;
    }
    .ct-end {
      display: flex; align-items: center; gap: var(--space-4);
      padding: var(--space-6) 0 var(--space-8);
    }
    .ct-end__line {
      flex: 1; height: 1px;
      background: var(--color-border);
    }
    .ct-end__text {
      font-size: 0.75rem; color: var(--color-text-muted);
      white-space: nowrap;
    }

    /* ── Empty state ───────────────────────────────────────────────────────── */
    .ct-empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 50vh; gap: var(--space-3); text-align: center;
    }
    .ct-empty__icon  { font-size: 3rem; opacity: .3; margin: 0; }
    .ct-empty__title { font-size: 1.25rem; font-weight: 700; color: var(--color-text-primary); margin: 0; }
    .ct-empty__sub   { color: var(--color-text-secondary); font-size: 0.875rem; margin: 0; }

    /* ── Overlay ───────────────────────────────────────────────────────────── */
    .ct-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.55); backdrop-filter: blur(2px);
      z-index: 200;
    }

    /* ── Drawer ────────────────────────────────────────────────────────────── */
    .ct-drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: min(460px, 100vw);
      background: var(--color-surface);
      border-left: 1px solid var(--color-border);
      box-shadow: var(--shadow-xl);
      z-index: 201;
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    .ct-drawer__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-5) var(--space-6);
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
    }
    .ct-drawer__title {
      font-size: 1.125rem; font-weight: 700;
      color: var(--color-text-primary); margin: 0;
    }
    .ct-drawer__close {
      background: none; border: none; color: var(--color-text-secondary);
      font-size: 1rem; cursor: pointer; padding: var(--space-2);
      border-radius: var(--radius-sm);
      transition: background var(--transition-fast);
    }
    .ct-drawer__close:hover { background: rgba(255,255,255,.08); }
    .ct-drawer__form {
      flex: 1; overflow-y: auto;
      padding: var(--space-6);
      display: flex; flex-direction: column; gap: var(--space-4);
    }
    .ct-drawer__actions {
      display: flex; gap: var(--space-3); justify-content: flex-end;
      padding-top: var(--space-4); border-top: 1px solid var(--color-border);
      margin-top: auto;
    }
    .form-input--textarea { resize: vertical; min-height: 80px; }

    /* ── Status selector ───────────────────────────────────────────────────── */
    .ct-status-select { display: flex; gap: var(--space-2); }
    .ct-status-btn {
      flex: 1; padding: var(--space-2) var(--space-3);
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); color: var(--color-text-secondary);
      font-size: 0.8125rem; font-weight: 600; cursor: pointer;
      transition: border-color var(--transition-fast), color var(--transition-fast),
                  background var(--transition-fast);
    }
    .ct-status-btn:hover { background: rgba(255,255,255,.04); }
    .ct-status-btn--active { background: rgba(255,255,255,.04); }

    /* ── Form error banner ─────────────────────────────────────────────────── */
    .ct-form-error {
      background: rgba(220,38,38,.12); color: var(--color-danger);
      border: 1px solid var(--color-danger);
      border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);
      font-size: 0.875rem;
    }

    /* ── Delete confirmation ───────────────────────────────────────────────── */
    .ct-confirm {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
      width: min(400px, calc(100vw - 2rem));
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      padding: var(--space-8);
      z-index: 201;
      text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
    }
    .ct-confirm__icon  { font-size: 2.5rem; margin: 0; }
    .ct-confirm__title { font-size: 1.125rem; font-weight: 700; color: var(--color-text-primary); margin: 0; }
    .ct-confirm__msg   { font-size: 0.875rem; color: var(--color-text-secondary); margin: 0; line-height: 1.6; }
    .ct-confirm__actions { display: flex; gap: var(--space-3); margin-top: var(--space-2); }

    /* ── Danger button ─────────────────────────────────────────────────────── */
    .btn--danger {
      background: var(--color-danger); color: #fff;
      padding: var(--space-2) var(--space-5);
      border-radius: var(--radius-md); font-size: 0.9375rem; font-weight: 600;
      border: none; cursor: pointer;
      transition: background var(--transition-fast);
    }
    .btn--danger:hover:not(:disabled) { background: #b91c1c; }
    .btn--danger:disabled { opacity: .5; cursor: not-allowed; }
  `],
})
export class ContactsComponent implements OnInit, OnDestroy {
  private svc      = inject(ContactsService);
  private fb       = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  readonly statuses     = STATUSES;

  /** Dynamically calculated — filled to cover the visible viewport on first load. */
  readonly pageSize     = signal(12);
  readonly skeletonRows = computed(() => Array(this.pageSize()));
  readonly skeletonMore = Array(4);

  /* ── State ─────────────────────────────────────────────────────────────── */
  readonly loading      = signal(true);
  readonly loadingMore  = signal(false);
  readonly saving       = signal(false);
  readonly contacts     = signal<Contact[]>([]);
  readonly total        = signal(0);
  readonly hasMore      = signal(true);
  readonly searchTerm   = signal('');
  readonly activeStatus = signal<ContactStatus | ''>('');
  readonly drawerMode   = signal<'create' | 'edit' | null>(null);
  readonly editTarget   = signal<Contact | null>(null);
  readonly deleteTarget = signal<Contact | null>(null);
  readonly formError    = signal('');

  private page     = 1;
  private observer?: IntersectionObserver;

  /* ── Form ──────────────────────────────────────────────────────────────── */
  readonly form = this.fb.group({
    name:    ['', [Validators.required, Validators.minLength(2)]],
    status:  ['LEAD' as ContactStatus, Validators.required],
    company: [''],
    email:   ['', Validators.email],
    phone:   [''],
    notes:   [''],
  });

  private searchSubject = new Subject<string>();

  /* ── Sentinel @ViewChild — wires IntersectionObserver when element appears ── */
  @ViewChild('sentinel')
  set sentinel(el: ElementRef<HTMLDivElement> | undefined) {
    this.observer?.disconnect();
    if (!el?.nativeElement) return;

    this.observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !this.loadingMore() && !this.loading() && this.hasMore()) {
        this.loadNextPage();
      }
    }, { threshold: 0.1 });

    this.observer.observe(el.nativeElement);
  }

  ngOnInit(): void {
    this.pageSize.set(this.calcPageSize());
    this.resetAndLoad();

    // Debounce search — waits 350 ms after the user stops typing
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(term => {
      this.searchTerm.set(term);
      this.resetAndLoad();
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ── Data ──────────────────────────────────────────────────────────────── */

  /**
   * Calculates how many cards are needed to fill the visible viewport.
   * Uses the shell layout dimensions: sidebar (240px), header (64px),
   * toolbar (~72px), content padding (48px), card min-width (260px + 16px gap),
   * and an estimated card height (200px + 16px gap).
   * Adds one extra row as a scroll-trigger buffer so the sentinel is reachable.
   */
  private calcPageSize(): number {
    const SIDEBAR   = 240;   // --sidebar-width
    const HEADER    = 64;    // --header-height
    const TOOLBAR   = 72;    // sticky toolbar estimated height
    const PADDING   = 48;    // content horizontal padding (2 × 24px)
    const GAP       = 16;    // grid gap
    const CARD_W    = 260;   // card min-width
    const CARD_H    = 200;   // estimated card height

    const availW = Math.max(300, window.innerWidth  - SIDEBAR - PADDING);
    const availH = Math.max(300, window.innerHeight - HEADER  - TOOLBAR);

    const cols   = Math.max(1, Math.floor((availW + GAP) / (CARD_W + GAP)));
    const rows   = Math.ceil(availH / (CARD_H + GAP)) + 1; // +1 buffer row

    return Math.max(4, Math.min(cols * rows, 60)); // clamp 4–60
  }

  /**
   * Resets pagination state and loads page 1 fresh.
   * Used on search/filter change or initial load.
   */
  private resetAndLoad(): void {
    this.page = 1;
    this.contacts.set([]);
    this.hasMore.set(true);
    this.loading.set(true);
    this.fetchPage(1, true);
  }

  /**
   * Loads the next page and appends results.
   * Called by the IntersectionObserver sentinel.
   */
  private loadNextPage(): void {
    this.page += 1;
    this.loadingMore.set(true);
    this.fetchPage(this.page, false);
  }

  /**
   * Calls the contacts service and merges results into the signal.
   *
   * @param page      Page number to fetch
   * @param isInitial True when resetting (replaces list); false when appending
   */
  private fetchPage(page: number, isInitial: boolean): void {
    const query: ContactsQuery = {
      page,
      limit:  this.pageSize(),
      search: this.searchTerm(),
      status: this.activeStatus() || undefined,
    };

    this.svc.list(query).subscribe({
      next: res => {
        if (isInitial) {
          this.contacts.set(res.data);
          this.loading.set(false);
        } else {
          this.contacts.update(prev => [...prev, ...res.data]);
          this.loadingMore.set(false);
        }
        this.total.set(res.total);
        this.hasMore.set(page < res.totalPages);
      },
      error: () => {
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  /* ── Toolbar interactions ──────────────────────────────────────────────── */

  onSearch(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.resetAndLoad();
  }

  setStatus(status: ContactStatus | ''): void {
    this.activeStatus.set(status);
    this.resetAndLoad();
  }

  /* ── Drawer ────────────────────────────────────────────────────────────── */

  openCreate(): void {
    this.form.reset({ name: '', status: 'LEAD', company: '', email: '', phone: '', notes: '' });
    this.editTarget.set(null);
    this.formError.set('');
    this.drawerMode.set('create');
  }

  openEdit(contact: Contact): void {
    this.form.reset({
      name:    contact.name,
      status:  contact.status,
      company: contact.company ?? '',
      email:   contact.email   ?? '',
      phone:   contact.phone   ?? '',
      notes:   contact.notes   ?? '',
    });
    this.editTarget.set(contact);
    this.formError.set('');
    this.drawerMode.set('edit');
  }

  closeDrawer(): void {
    this.drawerMode.set(null);
    this.editTarget.set(null);
  }

  submitForm(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    this.formError.set('');

    const raw = this.form.getRawValue();
    const dto: CreateContactDto = {
      name:    raw.name!,
      status:  raw.status as ContactStatus,
      company: raw.company || undefined,
      email:   raw.email   || undefined,
      phone:   raw.phone   || undefined,
      notes:   raw.notes   || undefined,
    };

    const op$ = this.drawerMode() === 'create'
      ? this.svc.create(dto)
      : this.svc.update(this.editTarget()!.id, dto);

    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDrawer();
        this.resetAndLoad();
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'An error occurred. Please try again.');
      },
    });
  }

  /* ── Delete ────────────────────────────────────────────────────────────── */

  confirmDelete(contact: Contact): void { this.deleteTarget.set(contact); }
  cancelDelete():  void { this.deleteTarget.set(null); }

  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.saving.set(true);
    this.svc.delete(target.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.deleteTarget.set(null);
        this.resetAndLoad();
      },
      error: () => this.saving.set(false),
    });
  }

  /* ── Display helpers ───────────────────────────────────────────────────── */

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  }

  /** Deterministic avatar color — cycles through 6 palette colors based on first char. */
  avatarColor(name: string): string {
    const COLORS = ['#2563eb', '#7c3aed', '#ea580c', '#16a34a', '#0891b2', '#db2777'];
    return COLORS[name.charCodeAt(0) % COLORS.length];
  }

  statusLabel(s: ContactStatus): string { return STATUS_CFG[s]?.label ?? s; }
  statusColor(s: ContactStatus): string { return STATUS_CFG[s]?.color ?? '#6b7280'; }
  statusBg(s:    ContactStatus): string { return STATUS_CFG[s]?.bg    ?? 'transparent'; }
}
