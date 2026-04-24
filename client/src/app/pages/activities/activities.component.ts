import {
  Component, OnInit, OnDestroy, inject, signal, computed,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { ActivitiesService } from '../../shared/services/activities.service';
import { ContactsService }   from '../../shared/services/contacts.service';
import { OpportunitiesService } from '../../shared/services/opportunities.service';
import {
  Activity, ActivityType, CreateActivityDto,
  ACTIVITY_TYPES, ACTIVITY_TYPE_MAP,
} from '../../core/models/activity.model';

// ── Date grouping ─────────────────────────────────────────────────────────────

interface ActivityGroup {
  label: string;
  date:  string;
  items: Activity[];
}

function groupByDate(activities: Activity[]): ActivityGroup[] {
  const now   = new Date();
  const today = toDateKey(now);
  const yest  = toDateKey(new Date(now.getTime() - 86_400_000));

  const map = new Map<string, Activity[]>();
  for (const a of activities) {
    const key = toDateKey(new Date(a.activityDate));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }

  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    label: date === today ? 'Today'
         : date === yest  ? 'Yesterday'
         : fmtGroupLabel(new Date(date + 'T12:00:00')),
    items,
  }));
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtGroupLabel(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff < 7)   return d.toLocaleDateString('en-US', { weekday: 'long' });
  if (diff < 365) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector:   'app-activities',
  standalone:  true,
  imports:    [ReactiveFormsModule],
  animations: [
    trigger('fade', [
      transition(':enter',  [style({ opacity: 0 }), animate('160ms ease', style({ opacity: 1 }))]),
      transition(':leave',  [animate('130ms ease', style({ opacity: 0 }))]),
    ]),
    trigger('drawer', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('260ms cubic-bezier(0.4,0,0.2,1)', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4,0,0.2,1)', style({ transform: 'translateX(100%)', opacity: 0 })),
      ]),
    ]),
    trigger('groups', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger('60ms', [
            animate('320ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
  ],
  template: `
    <!-- ── Toolbar ──────────────────────────────────────────────────────────── -->
    <div class="ac-toolbar">
      <div class="ac-toolbar__left">
        <div class="ac-search">
          <span class="ac-search__icon">🔍</span>
          <input class="ac-search__input" type="text" placeholder="Search activities…"
            [value]="searchQuery()" (input)="onSearch($event)" />
          @if (searchQuery()) {
            <button class="ac-search__clear" (click)="clearSearch()">✕</button>
          }
        </div>

        <div class="ac-filters">
          <button class="ac-filter-pill" [class.ac-filter-pill--active]="activeType() === null"
            (click)="setType(null)">
            All <span class="ac-filter-pill__count">{{ totalCount() }}</span>
          </button>
          @for (t of activityTypes; track t.key) {
            <button class="ac-filter-pill"
              [class.ac-filter-pill--active]="activeType() === t.key"
              [style.--pill-color]="t.color" (click)="setType(t.key)">
              {{ t.icon }} {{ t.label }}
              <span class="ac-filter-pill__count">{{ typeCounts()[t.key] ?? 0 }}</span>
            </button>
          }
        </div>
      </div>
      <button class="btn btn--primary btn--sm" (click)="openCreate()">+ New Activity</button>
    </div>

    <!-- ── Skeleton ─────────────────────────────────────────────────────────── -->
    @if (loading()) {
      <div class="ac-timeline">
        @for (_ of [1,2,3]; track $index) {
          <div class="ac-group">
            <div class="ac-group__header"><div class="sk sk--label"></div></div>
            <div class="ac-group__items">
              @for (__ of [1,2]; track $index) {
                <div class="ac-item ac-item--skeleton">
                  <div class="ac-item__dot-wrap"><div class="sk sk--dot"></div></div>
                  <div class="ac-item__card ac-item__card--sk">
                    <div class="sk sk--title"></div>
                    <div class="sk sk--sub"></div>
                    <div class="sk sk--sub sk--sub-short"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>

    <!-- ── Empty ────────────────────────────────────────────────────────────── -->
    } @else if (groups().length === 0) {
      <div class="ac-empty" @fade>
        <p class="ac-empty__icon">⚡</p>
        <h3 class="ac-empty__title">No activities yet</h3>
        <p class="ac-empty__sub">
          {{ searchQuery() || activeType() ? 'Try different filters.' : 'Log your first call, email or meeting.' }}
        </p>
        @if (!searchQuery() && !activeType()) {
          <button class="btn btn--primary" (click)="openCreate()">+ New Activity</button>
        }
      </div>

    <!-- ── Timeline ─────────────────────────────────────────────────────────── -->
    } @else {
      <div class="ac-timeline" [@groups]="groups().length">
        @for (group of groups(); track group.date) {
          <div class="ac-group">
            <div class="ac-group__header">
              <span class="ac-group__label">{{ group.label }}</span>
              <span class="ac-group__count">{{ group.items.length }}</span>
            </div>
            <div class="ac-group__items">
              @for (act of group.items; track act.id) {
                <div class="ac-item">
                  <div class="ac-item__dot-wrap">
                    <div class="ac-item__dot"
                      [style.background]="typeOf(act.type).bg"
                      [style.border-color]="typeOf(act.type).color">
                      <span class="ac-item__dot-icon">{{ typeOf(act.type).icon }}</span>
                    </div>
                    <div class="ac-item__line"></div>
                  </div>

                  <div class="ac-item__card" (click)="openEdit(act)">
                    <div class="ac-item__header">
                      <span class="ac-item__type-badge"
                        [style.background]="typeOf(act.type).bg"
                        [style.color]="typeOf(act.type).color">
                        {{ typeOf(act.type).label }}
                      </span>
                      <span class="ac-item__time">{{ relTime(act.activityDate) }}</span>
                    </div>

                    <p class="ac-item__desc">{{ act.description }}</p>

                    <div class="ac-item__footer">
                      <div class="ac-item__contact">
                        <span class="ac-item__avatar" [style.background]="avatarColor(act.contact.name)">
                          {{ initials(act.contact.name) }}
                        </span>
                        <span class="ac-item__contact-name">{{ act.contact.name }}</span>
                        @if (act.contact.company) {
                          <span class="ac-item__contact-co">· {{ act.contact.company }}</span>
                        }
                      </div>
                      @if (act.opportunity) {
                        <span class="ac-item__opp-chip">🎯 {{ act.opportunity.title }}</span>
                      }
                    </div>

                    <div class="ac-item__actions" (click)="$event.stopPropagation()">
                      <button class="ac-item__act-btn" (click)="openEdit(act)" title="Edit">✏️</button>
                      <button class="ac-item__act-btn ac-item__act-btn--del" (click)="confirmDelete(act)" title="Delete">🗑</button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (hasMore()) {
          <div class="ac-load-more">
            <button class="btn btn--ghost btn--sm" (click)="loadMore()" [disabled]="loadingMore()">
              @if (loadingMore()) { <span class="btn__spinner"></span> }
              Load more
            </button>
          </div>
        }
      </div>
    }

    <!-- ── Drawer ───────────────────────────────────────────────────────────── -->
    @if (drawerMode()) {
      <div class="ac-overlay" @fade (click)="closeDrawer()"></div>
      <aside class="ac-drawer" @drawer>
        <div class="ac-drawer__header">
          <h2 class="ac-drawer__title">{{ drawerMode() === 'create' ? 'Log Activity' : 'Edit Activity' }}</h2>
          <button class="ac-drawer__close" (click)="closeDrawer()">✕</button>
        </div>

        <form class="ac-drawer__form" [formGroup]="form" (ngSubmit)="submitForm()">

          <div class="form-group">
            <label class="form-label">Type *</label>
            <div class="ac-type-select">
              @for (t of activityTypes; track t.key) {
                <button type="button" class="ac-type-btn"
                  [class.ac-type-btn--active]="form.get('type')?.value === t.key"
                  [style.--type-color]="t.color" [style.--type-bg]="t.bg"
                  (click)="form.patchValue({ type: t.key })">
                  <span class="ac-type-btn__icon">{{ t.icon }}</span>
                  <span class="ac-type-btn__label">{{ t.label }}</span>
                </button>
              }
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Contact *</label>
            <div class="ac-contact-field">
              <input class="form-input" type="text" placeholder="Search contact…"
                autocomplete="off" [value]="contactQuery()"
                (input)="onContactQuery($event)"
                (focus)="showContactDrop.set(true)"
                (blur)="onContactBlur()" />
              @if (showContactDrop() && filteredContacts().length > 0) {
                <div class="ac-contact-drop" @fade>
                  @for (c of filteredContacts(); track c.id) {
                    <button type="button" class="ac-contact-opt"
                      (mousedown)="$event.preventDefault()" (click)="selectContact(c)">
                      <span class="ac-contact-opt__avatar" [style.background]="avatarColor(c.name)">
                        {{ initials(c.name) }}
                      </span>
                      <span class="ac-contact-opt__info">
                        <strong>{{ c.name }}</strong>
                        @if (c.company) { <small>{{ c.company }}</small> }
                      </span>
                    </button>
                  }
                </div>
              }
            </div>
            @if (form.get('contactId')?.invalid && form.get('contactId')?.touched) {
              <span class="form-error">Select a contact.</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label">
              Opportunity <span class="form-label--opt">(optional)</span>
            </label>
            <select class="form-input" formControlName="opportunityId">
              <option [ngValue]="null">— None —</option>
              @for (o of contactOpportunities(); track o.id) {
                <option [ngValue]="o.id">{{ o.title }}</option>
              }
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="act-desc">Description *</label>
            <textarea id="act-desc" class="form-input ac-textarea"
              formControlName="description"
              placeholder="What happened? Key points, next steps…"
              rows="4"></textarea>
            @if (form.get('description')?.invalid && form.get('description')?.touched) {
              <span class="form-error">Description is required.</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="act-date">Date & Time *</label>
            <input id="act-date" class="form-input" type="datetime-local" formControlName="activityDate" />
          </div>

          @if (formError()) {
            <div class="ac-form-error" role="alert">{{ formError() }}</div>
          }

          <div class="ac-drawer__actions">
            <button type="button" class="btn btn--ghost" (click)="closeDrawer()">Cancel</button>
            <button type="submit" class="btn btn--primary" [disabled]="saving()">
              @if (saving()) { <span class="btn__spinner"></span> }
              {{ drawerMode() === 'create' ? 'Log Activity' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </aside>
    }

    <!-- ── Delete confirm ───────────────────────────────────────────────────── -->
    @if (deleteTarget()) {
      <div class="ac-overlay" @fade (click)="cancelDelete()"></div>
      <div class="ac-confirm" @fade>
        <p class="ac-confirm__icon">🗑</p>
        <h3 class="ac-confirm__title">Delete activity?</h3>
        <p class="ac-confirm__msg">This action cannot be undone.</p>
        <div class="ac-confirm__actions">
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
    .ac-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--space-4); flex-wrap: wrap;
      position: sticky; top: -1px; z-index: 10;
      background: rgba(10,12,18,.92); backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(255,255,255,.05);
      padding: var(--space-4) 0; margin-bottom: var(--space-6);
    }
    .ac-toolbar__left { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; flex: 1; }

    .ac-search {
      position: relative; display: flex; align-items: center;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 0 var(--space-3); min-width: 220px;
      transition: border-color var(--transition-fast);
    }
    .ac-search:focus-within { border-color: var(--color-primary); }
    .ac-search__icon  { font-size: 0.875rem; pointer-events: none; flex-shrink: 0; }
    .ac-search__input {
      flex: 1; background: none; border: none; outline: none;
      padding: var(--space-2); color: var(--color-text-primary); font-size: 0.875rem;
    }
    .ac-search__clear {
      background: none; border: none; color: var(--color-text-muted); cursor: pointer;
      font-size: 0.75rem; padding: 2px; border-radius: 4px; line-height: 1;
    }
    .ac-search__clear:hover { color: var(--color-text-primary); }

    .ac-filters { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
    .ac-filter-pill {
      display: flex; align-items: center; gap: var(--space-1);
      padding: var(--space-1) var(--space-3); background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: var(--radius-full);
      color: var(--color-text-secondary); font-size: 0.78rem; font-weight: 500;
      cursor: pointer; transition: all var(--transition-fast); white-space: nowrap;
    }
    .ac-filter-pill:hover { border-color: var(--pill-color, var(--color-primary)); color: var(--color-text-primary); }
    .ac-filter-pill--active {
      background: var(--pill-color, var(--color-primary));
      border-color: var(--pill-color, var(--color-primary));
      color: #fff; font-weight: 600;
    }
    .ac-filter-pill__count {
      background: rgba(255,255,255,.2); border-radius: var(--radius-full);
      padding: 0 5px; font-size: 0.68rem; font-weight: 700; line-height: 1.5;
    }
    .ac-filter-pill--active .ac-filter-pill__count { background: rgba(0,0,0,.2); }

    /* Timeline */
    .ac-timeline { display: flex; flex-direction: column; gap: var(--space-6); }

    .ac-group { display: flex; flex-direction: column; }
    .ac-group__header {
      display: flex; align-items: center; gap: var(--space-2);
      padding-bottom: var(--space-3); margin-bottom: var(--space-1);
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .ac-group__label {
      font-size: 0.8125rem; font-weight: 700; color: var(--color-text-muted);
      text-transform: uppercase; letter-spacing: .06em;
    }
    .ac-group__count {
      background: rgba(255,255,255,.06); color: var(--color-text-muted);
      font-size: 0.68rem; font-weight: 700; padding: 1px 7px; border-radius: var(--radius-full);
    }
    .ac-group__items { display: flex; flex-direction: column; }

    /* Activity item */
    .ac-item { display: flex; gap: 0; align-items: flex-start; }
    .ac-item__dot-wrap {
      display: flex; flex-direction: column; align-items: center;
      padding-top: var(--space-4); width: 52px; flex-shrink: 0;
    }
    .ac-item__dot {
      width: 36px; height: 36px; border-radius: 50%; border: 2px solid transparent;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .ac-item__dot-icon { font-size: 1rem; line-height: 1; }
    .ac-item__line {
      flex: 1; width: 2px; background: rgba(255,255,255,.06);
      margin-top: var(--space-1); min-height: 20px;
    }

    .ac-item__card {
      flex: 1; background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-xl); padding: var(--space-4);
      margin: var(--space-2) 0 var(--space-3); cursor: pointer; position: relative;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }
    .ac-item__card:hover { border-color: rgba(255,255,255,.1); box-shadow: var(--shadow-md); }
    .ac-item__card--sk   { cursor: default; pointer-events: none; min-height: 90px; }

    .ac-item__header {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--space-2); margin-bottom: var(--space-2);
    }
    .ac-item__type-badge {
      font-size: 0.72rem; font-weight: 700; padding: 2px 10px;
      border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: .04em;
    }
    .ac-item__time { font-size: 0.72rem; color: var(--color-text-muted); white-space: nowrap; }
    .ac-item__desc {
      font-size: 0.875rem; color: var(--color-text-primary); line-height: 1.6;
      margin: 0 0 var(--space-3);
    }
    .ac-item__footer { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
    .ac-item__contact { display: flex; align-items: center; gap: var(--space-2); }
    .ac-item__avatar {
      width: 20px; height: 20px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.6rem; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .ac-item__contact-name { font-size: 0.78rem; color: var(--color-text-secondary); font-weight: 600; }
    .ac-item__contact-co  { font-size: 0.72rem; color: var(--color-text-muted); }
    .ac-item__opp-chip {
      font-size: 0.72rem; color: var(--color-text-muted);
      background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
      border-radius: var(--radius-full); padding: 2px 10px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;
    }
    .ac-item__actions {
      position: absolute; top: var(--space-3); right: var(--space-3);
      display: flex; gap: 4px; opacity: 0; transition: opacity var(--transition-fast);
    }
    .ac-item__card:hover .ac-item__actions { opacity: 1; }
    .ac-item__act-btn {
      background: rgba(255,255,255,.06); border: none; border-radius: var(--radius-sm);
      font-size: 0.75rem; padding: 3px 5px; cursor: pointer; transition: background var(--transition-fast);
    }
    .ac-item__act-btn:hover      { background: rgba(255,255,255,.12); }
    .ac-item__act-btn--del:hover { background: rgba(220,38,38,.2); }

    /* Skeleton */
    .ac-item--skeleton { pointer-events: none; }
    .sk {
      background: linear-gradient(90deg,
        var(--color-surface) 25%, var(--color-surface-hover) 50%, var(--color-surface) 75%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: var(--radius-sm);
    }
    .sk--label { width: 80px; height: 13px; }
    .sk--dot   { width: 36px; height: 36px; border-radius: 50%; }
    .sk--title { width: 70%; height: 14px; margin-bottom: 10px; }
    .sk--sub   { width: 55%; height: 12px; margin-bottom: 6px; }
    .sk--sub-short { width: 35%; }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .ac-load-more { display: flex; justify-content: center; padding: var(--space-4) 0; }

    /* Empty */
    .ac-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: var(--space-3); padding: 6rem var(--space-8); text-align: center;
    }
    .ac-empty__icon  { font-size: 3rem; margin: 0; }
    .ac-empty__title { font-size: 1.25rem; font-weight: 700; color: var(--color-text-primary); margin: 0; }
    .ac-empty__sub   { font-size: 0.9375rem; color: var(--color-text-secondary); margin: 0; }

    /* Overlay & Drawer */
    .ac-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(3px); z-index: 200; }
    .ac-drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: min(520px, 100vw);
      background: var(--color-surface); border-left: 1px solid var(--color-border);
      box-shadow: var(--shadow-xl); z-index: 201; display: flex; flex-direction: column; overflow: hidden;
    }
    .ac-drawer__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-5) var(--space-6); border-bottom: 1px solid var(--color-border); flex-shrink: 0;
    }
    .ac-drawer__title { font-size: 1.125rem; font-weight: 700; color: var(--color-text-primary); margin: 0; }
    .ac-drawer__close {
      background: none; border: none; color: var(--color-text-secondary); font-size: 1rem;
      cursor: pointer; padding: var(--space-2); border-radius: var(--radius-sm);
      transition: background var(--transition-fast);
    }
    .ac-drawer__close:hover { background: rgba(255,255,255,.08); }
    .ac-drawer__form {
      flex: 1; overflow-y: auto; padding: var(--space-6);
      display: flex; flex-direction: column; gap: var(--space-4);
    }
    .ac-drawer__actions {
      display: flex; gap: var(--space-3); justify-content: flex-end;
      padding-top: var(--space-4); border-top: 1px solid var(--color-border); margin-top: auto;
    }

    /* Type selector */
    .ac-type-select { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); }
    .ac-type-btn {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: var(--space-3) var(--space-2);
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition-fast);
    }
    .ac-type-btn:hover { background: rgba(255,255,255,.04); border-color: var(--type-color); }
    .ac-type-btn--active {
      background: var(--type-bg); border-color: var(--type-color);
      box-shadow: 0 0 0 1px var(--type-color);
    }
    .ac-type-btn__icon  { font-size: 1.375rem; line-height: 1; }
    .ac-type-btn__label { font-size: 0.72rem; font-weight: 600; color: var(--color-text-secondary); }
    .ac-type-btn--active .ac-type-btn__label { color: var(--type-color); }

    /* Contact field */
    .ac-contact-field { position: relative; }
    .ac-contact-drop {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); box-shadow: var(--shadow-xl);
      z-index: 10; max-height: 240px; overflow-y: auto;
    }
    .ac-contact-opt {
      display: flex; align-items: center; gap: var(--space-3); width: 100%;
      padding: var(--space-2) var(--space-3); background: none; border: none;
      cursor: pointer; transition: background var(--transition-fast);
    }
    .ac-contact-opt:hover { background: rgba(255,255,255,.05); }
    .ac-contact-opt__avatar {
      width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; font-size: 0.65rem; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .ac-contact-opt__info { display: flex; flex-direction: column; overflow: hidden; }
    .ac-contact-opt__info strong { font-size: 0.8125rem; color: var(--color-text-primary); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ac-contact-opt__info small  { font-size: 0.72rem; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .ac-textarea { resize: vertical; min-height: 100px; }
    .form-label--opt { font-size: 0.72rem; color: var(--color-text-muted); font-weight: 400; }
    .ac-form-error {
      background: rgba(220,38,38,.12); color: var(--color-danger);
      border: 1px solid var(--color-danger); border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4); font-size: 0.875rem;
    }

    /* Confirm */
    .ac-confirm {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
      width: min(380px, calc(100vw - 2rem)); background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl); padding: var(--space-8); z-index: 201;
      text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
    }
    .ac-confirm__icon  { font-size: 2.5rem; margin: 0; }
    .ac-confirm__title { font-size: 1.125rem; font-weight: 700; color: var(--color-text-primary); margin: 0; }
    .ac-confirm__msg   { font-size: 0.875rem; color: var(--color-text-secondary); margin: 0; }
    .ac-confirm__actions { display: flex; gap: var(--space-3); margin-top: var(--space-2); }
    .btn--danger {
      background: var(--color-danger); color: #fff; padding: var(--space-2) var(--space-5);
      border-radius: var(--radius-md); font-size: 0.9375rem; font-weight: 600;
      border: none; cursor: pointer; transition: background var(--transition-fast);
    }
    .btn--danger:hover:not(:disabled) { background: #b91c1c; }
    .btn--danger:disabled { opacity: .5; cursor: not-allowed; }
  `],
})
export class ActivitiesComponent implements OnInit, OnDestroy {
  private svc         = inject(ActivitiesService);
  private contactsSvc = inject(ContactsService);
  private oppsSvc     = inject(OpportunitiesService);
  private fb          = inject(FormBuilder);
  private destroy$    = new Subject<void>();

  readonly activityTypes = ACTIVITY_TYPES;

  readonly loading     = signal(true);
  readonly loadingMore = signal(false);
  readonly saving      = signal(false);
  readonly drawerMode  = signal<'create' | 'edit' | null>(null);
  readonly editTarget  = signal<Activity | null>(null);
  readonly deleteTarget = signal<Activity | null>(null);
  readonly formError   = signal('');
  readonly searchQuery = signal('');
  readonly activeType  = signal<ActivityType | null>(null);

  private allActivities = signal<Activity[]>([]);
  private page = 1;
  readonly hasMore    = signal(false);
  readonly totalCount = signal(0);

  readonly typeCounts = computed(() => {
    const counts: Partial<Record<ActivityType, number>> = {};
    for (const a of this.allActivities()) {
      counts[a.type] = (counts[a.type] ?? 0) + 1;
    }
    return counts;
  });

  readonly groups = computed<ActivityGroup[]>(() => {
    const q    = this.searchQuery().toLowerCase().trim();
    const type = this.activeType();
    let list   = this.allActivities();
    if (type) list = list.filter(a => a.type === type);
    if (q)    list = list.filter(a =>
      a.description.toLowerCase().includes(q) ||
      a.contact.name.toLowerCase().includes(q) ||
      (a.contact.company ?? '').toLowerCase().includes(q),
    );
    return groupByDate(list);
  });

  allContacts: { id: number; name: string; company: string | null }[] = [];
  readonly contactQuery    = signal('');
  readonly showContactDrop = signal(false);
  readonly filteredContacts = computed(() => {
    const q = this.contactQuery().toLowerCase().trim();
    if (!q) return this.allContacts.slice(0, 8);
    return this.allContacts
      .filter(c => c.name.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q))
      .slice(0, 8);
  });

  allOpportunities: { id: number; contactId: number; title: string; stage: string }[] = [];
  readonly contactOpportunities = computed(() => {
    const cid = this.form.get('contactId')?.value;
    if (!cid) return [];
    return this.allOpportunities.filter(o => o.contactId === cid);
  });

  readonly form = this.fb.group({
    contactId:     [null as number | null, Validators.required],
    opportunityId: [null as number | null],
    type:          ['CALL' as ActivityType, Validators.required],
    description:   ['', [Validators.required, Validators.minLength(1)]],
    activityDate:  [this.nowLocal(), Validators.required],
  });

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$),
    ).subscribe(q => this.searchQuery.set(q));

    this.loadPage(1, true);
    this.loadContacts();
    this.loadOpportunities();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  /**
   * Loads one page of activities from the server.
   * @param page  Page number
   * @param isInitial  true = first load (resets list); false = "load more" (appends)
   */
  private loadPage(page: number, isInitial: boolean): void {
    if (isInitial) this.loading.set(true);
    else           this.loadingMore.set(true);

    this.svc.list({ page, limit: 30 }).subscribe({
      next: res => {
        if (isInitial) { this.allActivities.set(res.data); this.loading.set(false); }
        else           { this.allActivities.update(p => [...p, ...res.data]); this.loadingMore.set(false); }
        this.totalCount.set(res.total);
        this.hasMore.set(page < res.totalPages);
        this.page = page;
      },
      error: () => { this.loading.set(false); this.loadingMore.set(false); },
    });
  }

  loadMore(): void { this.loadPage(this.page + 1, false); }

  /** Preloads contacts for the search dropdown (up to 500). */
  private loadContacts(): void {
    this.contactsSvc.list({ limit: 500 }).subscribe({
      next: res => { this.allContacts = res.data.map(c => ({ id: c.id, name: c.name, company: c.company })); },
    });
  }

  /** Preloads all opportunities so the selector can filter by contact. */
  private loadOpportunities(): void {
    this.oppsSvc.list().subscribe({
      next: opps => {
        this.allOpportunities = opps.map(o => ({ id: o.id, contactId: o.contactId, title: o.title, stage: o.stage }));
      },
    });
  }

  onSearch(e: Event): void { this.searchSubject.next((e.target as HTMLInputElement).value); }
  clearSearch(): void      { this.searchQuery.set(''); this.searchSubject.next(''); }
  setType(t: ActivityType | null): void { this.activeType.set(t); }

  openCreate(): void {
    this.form.reset({ contactId: null, opportunityId: null, type: 'CALL', description: '', activityDate: this.nowLocal() });
    this.contactQuery.set(''); this.showContactDrop.set(false);
    this.editTarget.set(null); this.formError.set('');
    this.drawerMode.set('create');
  }

  openEdit(act: Activity): void {
    this.form.reset({
      contactId: act.contactId, opportunityId: act.opportunityId,
      type: act.type, description: act.description,
      activityDate: act.activityDate.slice(0, 16),
    });
    this.contactQuery.set(act.contact.name); this.showContactDrop.set(false);
    this.editTarget.set(act); this.formError.set('');
    this.drawerMode.set('edit');
  }

  closeDrawer(): void { this.drawerMode.set(null); this.editTarget.set(null); }

  submitForm(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');

    const raw = this.form.getRawValue();
    const dto: CreateActivityDto = {
      contactId:     raw.contactId!,
      opportunityId: raw.opportunityId || null,
      type:          raw.type as ActivityType,
      description:   raw.description!,
      activityDate:  new Date(raw.activityDate!).toISOString(),
    };

    const op$ = this.drawerMode() === 'create'
      ? this.svc.create(dto)
      : this.svc.update(this.editTarget()!.id, dto);

    op$.subscribe({
      next:  () => { this.saving.set(false); this.closeDrawer(); this.loadPage(1, true); },
      error: err => { this.saving.set(false); this.formError.set(err?.error?.message ?? 'An error occurred.'); },
    });
  }

  onContactQuery(e: Event): void {
    this.contactQuery.set((e.target as HTMLInputElement).value);
    this.showContactDrop.set(true);
    this.form.patchValue({ contactId: null, opportunityId: null });
  }

  selectContact(c: { id: number; name: string }): void {
    this.form.patchValue({ contactId: c.id, opportunityId: null });
    this.contactQuery.set(c.name); this.showContactDrop.set(false);
  }

  /** Delays close to let option click fire before blur hides the dropdown. */
  onContactBlur(): void { setTimeout(() => this.showContactDrop.set(false), 160); }

  confirmDelete(act: Activity): void { this.deleteTarget.set(act); }
  cancelDelete():  void              { this.deleteTarget.set(null); }

  executeDelete(): void {
    const t = this.deleteTarget();
    if (!t) return;
    this.saving.set(true);
    this.svc.delete(t.id).subscribe({
      next:  () => { this.saving.set(false); this.deleteTarget.set(null); this.loadPage(1, true); },
      error: () => this.saving.set(false),
    });
  }

  typeOf(type: ActivityType) { return ACTIVITY_TYPE_MAP[type]; }

  /** Human-readable relative time label for an ISO date string. */
  relTime(iso: string): string {
    const d    = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)    return 'Just now';
    if (mins < 60)   return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    if (diff < 7 * 86_400_000)
      return d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
             d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  }

  avatarColor(name: string): string {
    const C = ['#2563eb', '#7c3aed', '#ea580c', '#16a34a', '#0891b2', '#db2777'];
    return C[name.charCodeAt(0) % C.length];
  }

  private nowLocal(): string {
    const d = new Date(); d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  }
}
