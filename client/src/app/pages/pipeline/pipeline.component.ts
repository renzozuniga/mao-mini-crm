import {
  Component, OnInit, inject, signal, computed, ChangeDetectorRef,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { trigger, transition, style, animate } from '@angular/animations';

import { OpportunitiesService } from '../../shared/services/opportunities.service';
import { ContactsService }      from '../../shared/services/contacts.service';
import {
  Opportunity, OpportunityStage, CreateOpportunityDto,
} from '../../core/models/opportunity.model';

// ── Stage config ──────────────────────────────────────────────────────────────

interface StageCfg {
  key:         OpportunityStage;
  label:       string;
  color:       string;
  glow:        string;
  defaultProb: number;
}

const STAGES: StageCfg[] = [
  { key: 'LEAD',        label: 'Lead',        color: '#6b7280', glow: 'rgba(107,114,128,.15)', defaultProb: 10  },
  { key: 'QUALIFIED',   label: 'Qualified',   color: '#2563eb', glow: 'rgba(37,99,235,.15)',   defaultProb: 30  },
  { key: 'PROPOSAL',    label: 'Proposal',    color: '#7c3aed', glow: 'rgba(124,58,237,.15)',  defaultProb: 50  },
  { key: 'NEGOTIATION', label: 'Negotiation', color: '#ea580c', glow: 'rgba(234,88,12,.15)',   defaultProb: 75  },
  { key: 'CLOSED_WON',  label: 'Won',         color: '#16a34a', glow: 'rgba(22,163,74,.15)',   defaultProb: 100 },
  { key: 'CLOSED_LOST', label: 'Lost',        color: '#dc2626', glow: 'rgba(220,38,38,.15)',   defaultProb: 0   },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s])) as Record<OpportunityStage, StageCfg>;

function emptyBoard(): Record<OpportunityStage, Opportunity[]> {
  return { LEAD: [], QUALIFIED: [], PROPOSAL: [], NEGOTIATION: [], CLOSED_WON: [], CLOSED_LOST: [] };
}

const SKELETON_COUNTS: Record<OpportunityStage, number> = {
  LEAD: 3, QUALIFIED: 2, PROPOSAL: 2, NEGOTIATION: 1, CLOSED_WON: 2, CLOSED_LOST: 1,
};

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector:   'app-pipeline',
  standalone:  true,
  imports:    [ReactiveFormsModule, DragDropModule],
  animations: [
    trigger('fade', [
      transition(':enter',  [style({ opacity: 0 }), animate('180ms ease', style({ opacity: 1 }))]),
      transition(':leave',  [animate('150ms ease', style({ opacity: 0 }))]),
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
  ],
  template: `
    <!-- ── Summary strip ───────────────────────────────────────────────────── -->
    <div class="pl-summary">
      <div class="pl-kpis">
        <div class="pl-kpi">
          <span class="pl-kpi__icon">💰</span>
          <div class="pl-kpi__data">
            <p class="pl-kpi__label">Pipeline value</p>
            <p class="pl-kpi__value">{{ pipelineValue }}</p>
          </div>
        </div>
        <div class="pl-kpi-sep"></div>
        <div class="pl-kpi">
          <span class="pl-kpi__icon">📊</span>
          <div class="pl-kpi__data">
            <p class="pl-kpi__label">Active deals</p>
            <p class="pl-kpi__value">{{ activeCount }}</p>
          </div>
        </div>
        <div class="pl-kpi-sep"></div>
        <div class="pl-kpi">
          <span class="pl-kpi__icon">🏆</span>
          <div class="pl-kpi__data">
            <p class="pl-kpi__label">Win rate</p>
            <p class="pl-kpi__value">{{ winRate }}</p>
          </div>
        </div>
        <div class="pl-kpi-sep"></div>
        <div class="pl-kpi">
          <span class="pl-kpi__icon">📈</span>
          <div class="pl-kpi__data">
            <p class="pl-kpi__label">Avg deal</p>
            <p class="pl-kpi__value">{{ avgDeal }}</p>
          </div>
        </div>
      </div>
      <button class="btn btn--primary btn--sm" (click)="openCreate()">+ New Deal</button>
    </div>

    <!-- ── Loading skeleton ─────────────────────────────────────────────────── -->
    @if (loading()) {
      <div class="pl-board">
        @for (stage of stages; track stage.key; let si = $index) {
          <div class="pl-column pl-column--skeleton" [style.animation-delay]="si * 60 + 'ms'">
            <div class="pl-col-header" [style.border-top-color]="stage.color">
              <div class="pl-col-header-left">
                <div class="sk sk--dot"></div>
                <div class="sk sk--title-col"></div>
                <div class="sk sk--badge"></div>
              </div>
            </div>
            <div class="pl-col-body pl-col-body--static">
              @for (_ of skeletonFor(stage.key); track $index) {
                <div class="pl-card pl-card--skeleton">
                  <div class="sk sk--card-title"></div>
                  <div class="sk sk--card-sub"></div>
                  <div class="sk sk--card-val"></div>
                </div>
              }
            </div>
          </div>
        }
      </div>

    <!-- ── Kanban board ──────────────────────────────────────────────────────── -->
    } @else {
      <div class="pl-board" cdkDropListGroup>
        @for (stage of stages; track stage.key; let si = $index) {
          <div class="pl-column" [style.animation-delay]="si * 70 + 'ms'">

            <!-- Column header -->
            <div class="pl-col-header" [style.border-top-color]="stage.color">
              <div class="pl-col-header-left">
                <span
                  class="pl-col-dot"
                  [style.background]="stage.color"
                  [style.box-shadow]="'0 0 8px ' + stage.color + '80'"
                ></span>
                <h3 class="pl-col-title">{{ stage.label }}</h3>
                <span
                  class="pl-col-badge"
                  [style.background]="stage.color + '22'"
                  [style.color]="stage.color"
                >{{ colCount(stage.key) }}</span>
              </div>
              <div class="pl-col-header-right">
                @if (colCount(stage.key) > 0) {
                  <span class="pl-col-value">{{ fmtVal(colValue(stage.key)) }}</span>
                }
                <button class="pl-col-add-icon" (click)="openCreate(stage.key)" title="Add deal">+</button>
              </div>
            </div>

            <!-- Drop zone -->
            <div
              cdkDropList
              [id]="stage.key"
              [cdkDropListData]="cols[stage.key]"
              (cdkDropListDropped)="onDrop($event)"
              class="pl-col-body"
              [class.pl-col-body--receiving]="receivingStage === stage.key"
              (cdkDropListEntered)="receivingStage = stage.key"
              (cdkDropListExited)="receivingStage = null"
              [style.--recv-glow]="stage.glow"
            >
              @if (cols[stage.key].length === 0) {
                <div class="pl-col-empty" @fade>
                  <span class="pl-col-empty__icon">
                    {{ stage.key === 'CLOSED_WON' ? '🏆' : stage.key === 'CLOSED_LOST' ? '🚫' : '➕' }}
                  </span>
                  <p class="pl-col-empty__text">Drop here</p>
                </div>
              }

              @for (opp of cols[stage.key]; track opp.id; let i = $index) {
                <div
                  cdkDrag
                  [cdkDragData]="opp"
                  class="pl-card"
                  [style.border-left-color]="stage.color"
                  [style.animation-delay]="i * 40 + 'ms'"
                  (click)="openEdit(opp)"
                >
                  <div cdkDragHandle class="pl-card__handle">⠿</div>

                  <p class="pl-card__title">{{ opp.title }}</p>

                  <div class="pl-card__contact">
                    <span class="pl-card__avatar" [style.background]="avatarColor(opp.contact.name)">
                      {{ initials(opp.contact.name) }}
                    </span>
                    <span class="pl-card__contact-name">{{ opp.contact.name }}</span>
                    @if (opp.contact.company) {
                      <span class="pl-card__contact-co">· {{ opp.contact.company }}</span>
                    }
                  </div>

                  <div class="pl-card__metrics">
                    <span class="pl-card__value">{{ fmtVal(opp.value) }}</span>
                    <div class="pl-card__prob-wrap">
                      <div class="pl-card__prob-track">
                        <div
                          class="pl-card__prob-fill"
                          [style.width]="opp.probability + '%'"
                          [style.background]="probColor(opp.probability)"
                        ></div>
                      </div>
                      <span class="pl-card__prob-pct" [style.color]="probColor(opp.probability)">
                        {{ opp.probability }}%
                      </span>
                    </div>
                  </div>

                  @if (relDate(opp.expectedCloseDate); as d) {
                    <div class="pl-card__date" [class.pl-card__date--danger]="d.danger">
                      📅 {{ d.text }}
                    </div>
                  }

                  <div class="pl-card__actions" (click)="$event.stopPropagation()">
                    <button class="pl-card__act-btn" (click)="openEdit(opp)" title="Edit">✏️</button>
                    <button class="pl-card__act-btn pl-card__act-btn--del" (click)="confirmDelete(opp)" title="Delete">🗑</button>
                  </div>

                  <div *cdkDragPlaceholder class="pl-drag-placeholder"></div>
                </div>
              }

              <button class="pl-col-add-inline" (click)="openCreate(stage.key)">
                <span>+</span> Add deal
              </button>
            </div>
          </div>
        }
      </div>
    }

    <!-- ── Drawer overlay ───────────────────────────────────────────────────── -->
    @if (drawerMode()) {
      <div class="pl-overlay" @fade (click)="closeDrawer()"></div>
      <aside class="pl-drawer" @drawer>
        <div class="pl-drawer__header">
          <h2 class="pl-drawer__title">{{ drawerMode() === 'create' ? 'New Deal' : 'Edit Deal' }}</h2>
          <button class="pl-drawer__close" (click)="closeDrawer()">✕</button>
        </div>

        <form class="pl-drawer__form" [formGroup]="form" (ngSubmit)="submitForm()">

          <div class="form-group">
            <label class="form-label">Contact *</label>
            <div class="pl-contact-field">
              <input
                class="form-input"
                type="text"
                placeholder="Search contact…"
                autocomplete="off"
                [value]="contactQuery()"
                (input)="onContactQuery($event)"
                (focus)="showContactDrop.set(true)"
                (blur)="onContactBlur()"
              />
              @if (showContactDrop() && filteredContacts().length > 0) {
                <div class="pl-contact-drop" @fade>
                  @for (c of filteredContacts(); track c.id) {
                    <button
                      type="button"
                      class="pl-contact-opt"
                      (mousedown)="$event.preventDefault()"
                      (click)="selectContact(c)"
                    >
                      <span class="pl-contact-opt__avatar" [style.background]="avatarColor(c.name)">{{ initials(c.name) }}</span>
                      <span class="pl-contact-opt__info">
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
            <label class="form-label" for="opp-title">Deal Title *</label>
            <input id="opp-title" class="form-input" formControlName="title" placeholder="e.g. ERP implementation" />
            @if (form.get('title')?.invalid && form.get('title')?.touched) {
              <span class="form-error">Title must be at least 2 characters.</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label">Stage *</label>
            <div class="pl-stage-select">
              @for (s of stages; track s.key) {
                <button
                  type="button"
                  class="pl-stage-btn"
                  [class.pl-stage-btn--active]="form.get('stage')?.value === s.key"
                  [style.border-color]="form.get('stage')?.value === s.key ? s.color : ''"
                  [style.color]="form.get('stage')?.value === s.key ? s.color : ''"
                  [style.background]="form.get('stage')?.value === s.key ? s.color + '18' : ''"
                  (click)="setStage(s.key)"
                >{{ s.label }}</button>
              }
            </div>
          </div>

          <div class="pl-form-row">
            <div class="form-group">
              <label class="form-label" for="opp-value">Value (USD) *</label>
              <div class="pl-currency-wrap">
                <span class="pl-currency-sym">$</span>
                <input
                  id="opp-value"
                  class="form-input pl-currency-input"
                  type="number"
                  min="1"
                  formControlName="value"
                  placeholder="0"
                />
              </div>
              @if (form.get('value')?.invalid && form.get('value')?.touched) {
                <span class="form-error">Enter a value greater than 0.</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="opp-prob">Probability</label>
              <div class="pl-prob-wrap">
                <input
                  id="opp-prob"
                  class="pl-range"
                  type="range"
                  min="0" max="100" step="5"
                  formControlName="probability"
                />
                <span class="pl-prob-val" [style.color]="probColor(form.get('probability')?.value ?? 0)">
                  {{ form.get('probability')?.value ?? 0 }}%
                </span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="opp-date">Expected Close Date</label>
            <input id="opp-date" class="form-input" type="date" formControlName="expectedCloseDate" />
          </div>

          @if (formError()) {
            <div class="pl-form-error" role="alert">{{ formError() }}</div>
          }

          <div class="pl-drawer__actions">
            <button type="button" class="btn btn--ghost" (click)="closeDrawer()">Cancel</button>
            <button type="submit" class="btn btn--primary" [disabled]="saving()">
              @if (saving()) { <span class="btn__spinner"></span> }
              {{ drawerMode() === 'create' ? 'Create Deal' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </aside>
    }

    <!-- ── Delete modal ──────────────────────────────────────────────────────── -->
    @if (deleteTarget()) {
      <div class="pl-overlay" @fade (click)="cancelDelete()"></div>
      <div class="pl-confirm" @fade>
        <p class="pl-confirm__icon">🗑</p>
        <h3 class="pl-confirm__title">Delete deal?</h3>
        <p class="pl-confirm__msg">
          <strong>{{ deleteTarget()!.title }}</strong> will be permanently removed.
          This cannot be undone.
        </p>
        <div class="pl-confirm__actions">
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
    /* ── Summary strip ─────────────────────────────────────────────────────── */
    .pl-summary {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--space-4); background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: var(--radius-xl);
      padding: var(--space-4) var(--space-6); margin-bottom: var(--space-5); flex-wrap: wrap;
    }
    .pl-kpis { display: flex; align-items: center; gap: var(--space-5); flex-wrap: wrap; }
    .pl-kpi  { display: flex; align-items: center; gap: var(--space-3); }
    .pl-kpi__icon { font-size: 1.4rem; }
    .pl-kpi__data { display: flex; flex-direction: column; }
    .pl-kpi__label {
      font-size: 0.68rem; text-transform: uppercase; letter-spacing: .06em;
      color: var(--color-text-muted); margin: 0;
    }
    .pl-kpi__value {
      font-size: 1.2rem; font-weight: 800; color: var(--color-text-primary);
      margin: 0; letter-spacing: -.02em;
    }
    .pl-kpi-sep { width: 1px; height: 32px; background: var(--color-border); flex-shrink: 0; }

    /* ── Board ─────────────────────────────────────────────────────────────── */
    .pl-board {
      display: flex; gap: var(--space-4); overflow-x: auto;
      padding-bottom: var(--space-6); align-items: flex-start;
    }
    .pl-board::-webkit-scrollbar { height: 6px; }
    .pl-board::-webkit-scrollbar-track { background: rgba(255,255,255,.03); border-radius: 3px; }
    .pl-board::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 3px; }
    .pl-board::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.22); }

    /* ── Column ────────────────────────────────────────────────────────────── */
    .pl-column {
      flex-shrink: 0; width: 292px; display: flex; flex-direction: column;
      border-radius: var(--radius-xl); background: rgba(255,255,255,.018);
      border: 1px solid var(--color-border); overflow: hidden;
      animation: colSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    .pl-column--skeleton { pointer-events: none; }
    @keyframes colSlideIn {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ── Column header ─────────────────────────────────────────────────────── */
    .pl-col-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-3) var(--space-4); border-top: 3px solid transparent;
      background: rgba(255,255,255,.025); border-bottom: 1px solid var(--color-border);
      gap: var(--space-2); flex-shrink: 0;
    }
    .pl-col-header-left  { display: flex; align-items: center; gap: var(--space-2); overflow: hidden; }
    .pl-col-header-right { display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0; }
    .pl-col-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .pl-col-title {
      font-size: 0.8125rem; font-weight: 700; color: var(--color-text-primary);
      margin: 0; white-space: nowrap;
    }
    .pl-col-badge {
      font-size: 0.68rem; font-weight: 700; padding: 1px 7px;
      border-radius: var(--radius-full);
    }
    .pl-col-value { font-size: 0.72rem; font-weight: 600; color: var(--color-text-muted); }
    .pl-col-add-icon {
      width: 22px; height: 22px; border-radius: 6px; background: rgba(255,255,255,.06);
      border: 1px solid var(--color-border); color: var(--color-text-secondary);
      font-size: 1rem; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background var(--transition-fast), color var(--transition-fast);
      line-height: 1; padding: 0;
    }
    .pl-col-add-icon:hover { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }

    /* ── Column body ───────────────────────────────────────────────────────── */
    .pl-col-body {
      flex: 1; display: flex; flex-direction: column; gap: var(--space-2);
      padding: var(--space-3); min-height: 100px;
      max-height: calc(100vh - 310px); overflow-y: auto;
      transition: background var(--transition-fast);
    }
    .pl-col-body--static { overflow-y: auto; }
    .pl-col-body::-webkit-scrollbar { width: 3px; }
    .pl-col-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }
    .pl-col-body--receiving { background: var(--recv-glow, rgba(255,255,255,.04)); }

    /* ── Empty column ──────────────────────────────────────────────────────── */
    .pl-col-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: var(--space-2); padding: var(--space-6) var(--space-4); opacity: .35; pointer-events: none;
    }
    .pl-col-empty__icon { font-size: 1.75rem; }
    .pl-col-empty__text { font-size: 0.75rem; color: var(--color-text-muted); margin: 0; }

    /* ── Inline add button ─────────────────────────────────────────────────── */
    .pl-col-add-inline {
      display: flex; align-items: center; gap: var(--space-1); width: 100%;
      padding: var(--space-2) var(--space-3); background: none;
      border: 1px dashed rgba(255,255,255,.1); border-radius: var(--radius-md);
      color: var(--color-text-muted); font-size: 0.75rem; font-weight: 500; cursor: pointer;
      transition: border-color var(--transition-fast), color var(--transition-fast),
                  background var(--transition-fast);
      margin-top: var(--space-1); flex-shrink: 0;
    }
    .pl-col-add-inline:hover {
      border-color: var(--color-primary); color: var(--color-primary); background: rgba(37,99,235,.06);
    }

    /* ── Opportunity card ──────────────────────────────────────────────────── */
    .pl-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-left: 3px solid transparent; border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-3) var(--space-2); cursor: grab;
      position: relative; display: flex; flex-direction: column; gap: var(--space-2);
      transition: transform var(--transition-fast), box-shadow var(--transition-fast),
                  border-color var(--transition-fast);
      animation: cardIn 0.38s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    .pl-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: rgba(255,255,255,.1); }
    .pl-card:active { cursor: grabbing; }
    .pl-card--skeleton { cursor: default; pointer-events: none; min-height: 100px; }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(10px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .pl-card__handle {
      position: absolute; top: var(--space-2); right: var(--space-2);
      font-size: 1rem; color: var(--color-text-muted); cursor: grab;
      opacity: 0; transition: opacity var(--transition-fast); line-height: 1; padding: 2px 4px;
    }
    .pl-card:hover .pl-card__handle { opacity: .7; }

    .pl-card__title {
      font-size: 0.8125rem; font-weight: 700; color: var(--color-text-primary);
      margin: 0; line-height: 1.4; padding-right: var(--space-5);
    }
    .pl-card__contact { display: flex; align-items: center; gap: var(--space-2); }
    .pl-card__avatar {
      width: 20px; height: 20px; border-radius: 50%; display: flex;
      align-items: center; justify-content: center;
      font-size: 0.6rem; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .pl-card__contact-name {
      font-size: 0.72rem; color: var(--color-text-secondary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .pl-card__contact-co {
      font-size: 0.68rem; color: var(--color-text-muted);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .pl-card__metrics { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
    .pl-card__value { font-size: 0.9375rem; font-weight: 800; color: var(--color-text-primary); letter-spacing: -.02em; white-space: nowrap; }
    .pl-card__prob-wrap { display: flex; align-items: center; gap: var(--space-1); flex: 1; min-width: 0; justify-content: flex-end; }
    .pl-card__prob-track { flex: 1; height: 4px; max-width: 52px; background: rgba(255,255,255,.08); border-radius: 2px; overflow: hidden; }
    .pl-card__prob-fill  { height: 100%; border-radius: 2px; transition: width var(--transition-base); }
    .pl-card__prob-pct   { font-size: 0.65rem; font-weight: 700; white-space: nowrap; }
    .pl-card__date { font-size: 0.68rem; color: var(--color-text-muted); display: flex; align-items: center; gap: 3px; }
    .pl-card__date--danger { color: var(--color-danger); }
    .pl-card__actions {
      position: absolute; bottom: var(--space-2); right: var(--space-2);
      display: flex; gap: 4px; opacity: 0; transition: opacity var(--transition-fast);
    }
    .pl-card:hover .pl-card__actions { opacity: 1; }
    .pl-card__act-btn {
      background: rgba(255,255,255,.06); border: none; border-radius: var(--radius-sm);
      font-size: 0.75rem; padding: 3px 5px; cursor: pointer; transition: background var(--transition-fast);
    }
    .pl-card__act-btn:hover     { background: rgba(255,255,255,.12); }
    .pl-card__act-btn--del:hover{ background: rgba(220,38,38,.2); }

    /* ── CDK drag placeholder ──────────────────────────────────────────────── */
    .pl-drag-placeholder {
      height: 80px; border: 2px dashed rgba(255,255,255,.15);
      border-radius: var(--radius-lg); background: rgba(255,255,255,.03);
    }

    /* ── Skeleton ──────────────────────────────────────────────────────────── */
    .sk {
      background: linear-gradient(90deg,
        var(--color-surface) 25%, var(--color-surface-hover) 50%, var(--color-surface) 75%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: var(--radius-sm);
    }
    .sk--dot       { width: 8px;  height: 8px;  border-radius: 50%; }
    .sk--title-col { width: 80px; height: 13px; }
    .sk--badge     { width: 22px; height: 18px; border-radius: var(--radius-full); }
    .sk--card-title{ width: 85%;  height: 13px; }
    .sk--card-sub  { width: 60%;  height: 11px; }
    .sk--card-val  { width: 40%;  height: 15px; }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Overlay & Drawer ──────────────────────────────────────────────────── */
    .pl-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(3px); z-index: 200; }
    .pl-drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: min(500px, 100vw);
      background: var(--color-surface); border-left: 1px solid var(--color-border);
      box-shadow: var(--shadow-xl); z-index: 201; display: flex; flex-direction: column; overflow: hidden;
    }
    .pl-drawer__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-5) var(--space-6); border-bottom: 1px solid var(--color-border); flex-shrink: 0;
    }
    .pl-drawer__title { font-size: 1.125rem; font-weight: 700; color: var(--color-text-primary); margin: 0; }
    .pl-drawer__close {
      background: none; border: none; color: var(--color-text-secondary); font-size: 1rem;
      cursor: pointer; padding: var(--space-2); border-radius: var(--radius-sm);
      transition: background var(--transition-fast);
    }
    .pl-drawer__close:hover { background: rgba(255,255,255,.08); }
    .pl-drawer__form {
      flex: 1; overflow-y: auto; padding: var(--space-6);
      display: flex; flex-direction: column; gap: var(--space-4);
    }
    .pl-drawer__actions {
      display: flex; gap: var(--space-3); justify-content: flex-end;
      padding-top: var(--space-4); border-top: 1px solid var(--color-border); margin-top: auto;
    }

    /* ── Contact selector ──────────────────────────────────────────────────── */
    .pl-contact-field { position: relative; }
    .pl-contact-drop {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); box-shadow: var(--shadow-xl);
      z-index: 10; overflow: hidden; max-height: 260px; overflow-y: auto;
    }
    .pl-contact-opt {
      display: flex; align-items: center; gap: var(--space-3); width: 100%;
      padding: var(--space-2) var(--space-3); background: none; border: none;
      cursor: pointer; text-align: left; transition: background var(--transition-fast);
    }
    .pl-contact-opt:hover { background: rgba(255,255,255,.05); }
    .pl-contact-opt__avatar {
      width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; font-size: 0.65rem; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .pl-contact-opt__info { display: flex; flex-direction: column; overflow: hidden; }
    .pl-contact-opt__info strong { font-size: 0.8125rem; color: var(--color-text-primary); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pl-contact-opt__info small  { font-size: 0.72rem; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ── Stage select ──────────────────────────────────────────────────────── */
    .pl-stage-select { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
    .pl-stage-btn {
      padding: var(--space-2) var(--space-2); background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: var(--radius-md);
      color: var(--color-text-secondary); font-size: 0.75rem; font-weight: 600;
      cursor: pointer; transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast); white-space: nowrap;
    }
    .pl-stage-btn:hover { background: rgba(255,255,255,.04); }
    .pl-stage-btn--active { font-weight: 700; }

    /* ── Form row ──────────────────────────────────────────────────────────── */
    .pl-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }

    /* ── Currency input ────────────────────────────────────────────────────── */
    .pl-currency-wrap { position: relative; display: flex; align-items: center; }
    .pl-currency-sym  { position: absolute; left: var(--space-3); color: var(--color-text-muted); font-size: 0.875rem; pointer-events: none; }
    .pl-currency-input{ padding-left: 1.8rem; }

    /* ── Probability slider ────────────────────────────────────────────────── */
    .pl-prob-wrap { display: flex; align-items: center; gap: var(--space-2); }
    .pl-range { flex: 1; accent-color: var(--color-primary); cursor: pointer; }
    .pl-prob-val { font-size: 0.875rem; font-weight: 700; min-width: 36px; text-align: right; }

    /* ── Form error ────────────────────────────────────────────────────────── */
    .pl-form-error {
      background: rgba(220,38,38,.12); color: var(--color-danger);
      border: 1px solid var(--color-danger); border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4); font-size: 0.875rem;
    }

    /* ── Delete modal ──────────────────────────────────────────────────────── */
    .pl-confirm {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
      width: min(400px, calc(100vw - 2rem)); background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl); padding: var(--space-8); z-index: 201;
      text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
    }
    .pl-confirm__icon  { font-size: 2.5rem; margin: 0; }
    .pl-confirm__title { font-size: 1.125rem; font-weight: 700; color: var(--color-text-primary); margin: 0; }
    .pl-confirm__msg   { font-size: 0.875rem; color: var(--color-text-secondary); margin: 0; line-height: 1.6; }
    .pl-confirm__actions { display: flex; gap: var(--space-3); margin-top: var(--space-2); }

    /* ── Danger button ─────────────────────────────────────────────────────── */
    .btn--danger {
      background: var(--color-danger); color: #fff; padding: var(--space-2) var(--space-5);
      border-radius: var(--radius-md); font-size: 0.9375rem; font-weight: 600;
      border: none; cursor: pointer; transition: background var(--transition-fast);
    }
    .btn--danger:hover:not(:disabled) { background: #b91c1c; }
    .btn--danger:disabled { opacity: .5; cursor: not-allowed; }
  `],
})
export class PipelineComponent implements OnInit {
  private svc         = inject(OpportunitiesService);
  private contactsSvc = inject(ContactsService);
  private fb          = inject(FormBuilder);
  private cdr         = inject(ChangeDetectorRef);

  readonly stages = STAGES;

  /* ── Kanban data ───────────────────────────────────────────────────────── */
  cols: Record<OpportunityStage, Opportunity[]> = emptyBoard();

  /* ── State signals ─────────────────────────────────────────────────────── */
  readonly loading      = signal(true);
  readonly saving       = signal(false);
  readonly drawerMode   = signal<'create' | 'edit' | null>(null);
  readonly editTarget   = signal<Opportunity | null>(null);
  readonly deleteTarget = signal<Opportunity | null>(null);
  readonly formError    = signal('');

  /** Stage receiving a dragged card — drives per-column glow. */
  receivingStage: OpportunityStage | null = null;

  /* ── Contact selector ──────────────────────────────────────────────────── */
  allContacts: { id: number; name: string; company: string | null }[] = [];
  readonly contactQuery     = signal('');
  readonly showContactDrop  = signal(false);
  readonly filteredContacts = computed(() => {
    const q = this.contactQuery().toLowerCase().trim();
    if (!q) return this.allContacts.slice(0, 8);
    return this.allContacts
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  });

  /* ── Form ──────────────────────────────────────────────────────────────── */
  readonly form = this.fb.group({
    contactId:         [null as number | null, Validators.required],
    title:             ['', [Validators.required, Validators.minLength(2)]],
    stage:             ['LEAD' as OpportunityStage, Validators.required],
    value:             [0,  [Validators.required, Validators.min(1)]],
    probability:       [10, [Validators.min(0), Validators.max(100)]],
    expectedCloseDate: [''],
  });

  /* ── Summary getters (derived from cols) ───────────────────────────────── */

  get pipelineValue(): string {
    const active: OpportunityStage[] = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];
    return this.fmtVal(
      active.flatMap(s => this.cols[s]).reduce((sum, o) => sum + Number(o.value), 0),
    );
  }

  get activeCount(): number {
    return (['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'] as OpportunityStage[])
      .reduce((sum, s) => sum + this.cols[s].length, 0);
  }

  get winRate(): string {
    const won = this.cols.CLOSED_WON.length;
    const lost = this.cols.CLOSED_LOST.length;
    if (won + lost === 0) return '—';
    return `${Math.round((won / (won + lost)) * 100)}%`;
  }

  get avgDeal(): string {
    if (this.activeCount === 0) return '—';
    const active: OpportunityStage[] = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];
    const total = active.flatMap(s => this.cols[s]).reduce((sum, o) => sum + Number(o.value), 0);
    return this.fmtVal(total / this.activeCount);
  }

  /* ── Lifecycle ─────────────────────────────────────────────────────────── */

  ngOnInit(): void {
    this.loadAll();
    this.loadContacts();
  }

  /* ── Data loading ──────────────────────────────────────────────────────── */

  /** Fetches all opportunities and distributes them into the board columns. */
  private loadAll(): void {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: opps => {
        this.cols = emptyBoard();
        for (const o of opps) this.cols[o.stage].push(o);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  /** Preloads all contacts for the form's contact selector dropdown. */
  private loadContacts(): void {
    this.contactsSvc.list({ limit: 500 }).subscribe({
      next: res => {
        this.allContacts = res.data.map(c => ({ id: c.id, name: c.name, company: c.company }));
      },
    });
  }

  /* ── CDK Drag & Drop ───────────────────────────────────────────────────── */

  /**
   * Handles drop events from CDK.
   * Updates the board optimistically; reverts on server error.
   *
   * @param event CdkDragDrop carrying source/target arrays and indices
   */
  onDrop(event: CdkDragDrop<Opportunity[]>): void {
    this.receivingStage = null;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const opp      = event.item.data as Opportunity;
      const newStage = event.container.id as OpportunityStage;

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      opp.stage = newStage;

      this.svc.update(opp.id, { stage: newStage }).subscribe({
        error: () => this.loadAll(), // revert on failure
      });
    }

    this.cdr.detectChanges();
  }

  /* ── Drawer ────────────────────────────────────────────────────────────── */

  openCreate(stage: OpportunityStage = 'LEAD'): void {
    this.form.reset({
      contactId: null, title: '', stage,
      value: 0, probability: STAGE_MAP[stage].defaultProb, expectedCloseDate: '',
    });
    this.contactQuery.set('');
    this.showContactDrop.set(false);
    this.editTarget.set(null);
    this.formError.set('');
    this.drawerMode.set('create');
  }

  openEdit(opp: Opportunity): void {
    this.form.reset({
      contactId: opp.contactId, title: opp.title, stage: opp.stage,
      value: Number(opp.value), probability: opp.probability,
      expectedCloseDate: opp.expectedCloseDate?.split('T')[0] ?? '',
    });
    this.contactQuery.set(opp.contact.name);
    this.showContactDrop.set(false);
    this.editTarget.set(opp);
    this.formError.set('');
    this.drawerMode.set('edit');
  }

  closeDrawer(): void { this.drawerMode.set(null); this.editTarget.set(null); }

  submitForm(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.formError.set('');

    const raw = this.form.getRawValue();
    const dto: CreateOpportunityDto = {
      contactId:         raw.contactId!,
      title:             raw.title!,
      stage:             raw.stage as OpportunityStage,
      value:             Number(raw.value),
      probability:       raw.probability ?? 0,
      expectedCloseDate: raw.expectedCloseDate || null,
    };

    const op$ = this.drawerMode() === 'create'
      ? this.svc.create(dto)
      : this.svc.update(this.editTarget()!.id, dto);

    op$.subscribe({
      next:  () => { this.saving.set(false); this.closeDrawer(); this.loadAll(); },
      error: err => { this.saving.set(false); this.formError.set(err?.error?.message ?? 'An error occurred. Please try again.'); },
    });
  }

  setStage(stage: OpportunityStage): void {
    this.form.patchValue({ stage, probability: STAGE_MAP[stage].defaultProb });
  }

  /* ── Contact selector ──────────────────────────────────────────────────── */

  onContactQuery(e: Event): void {
    this.contactQuery.set((e.target as HTMLInputElement).value);
    this.showContactDrop.set(true);
    this.form.patchValue({ contactId: null });
  }

  selectContact(c: { id: number; name: string }): void {
    this.form.patchValue({ contactId: c.id });
    this.contactQuery.set(c.name);
    this.showContactDrop.set(false);
  }

  /** Delays hide to allow click events on options to fire first. */
  onContactBlur(): void {
    setTimeout(() => this.showContactDrop.set(false), 160);
  }

  /* ── Delete ────────────────────────────────────────────────────────────── */

  confirmDelete(opp: Opportunity): void { this.deleteTarget.set(opp); }
  cancelDelete():  void                 { this.deleteTarget.set(null); }

  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.saving.set(true);
    this.svc.delete(target.id).subscribe({
      next:  () => { this.saving.set(false); this.deleteTarget.set(null); this.loadAll(); },
      error: () => this.saving.set(false),
    });
  }

  /* ── Display helpers ───────────────────────────────────────────────────── */

  skeletonFor(stage: OpportunityStage): unknown[] { return Array(SKELETON_COUNTS[stage]); }
  colCount(stage: OpportunityStage): number       { return this.cols[stage].length; }
  colValue(stage: OpportunityStage): number       { return this.cols[stage].reduce((s, o) => s + Number(o.value), 0); }

  /** Compact currency format: 28000 → "$28k", 1200000 → "$1.2M". */
  fmtVal(v: number | string): string {
    const n = Number(v);
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
    return `$${n.toFixed(0)}`;
  }

  /** Color-codes probability: green ≥70%, orange 30–69%, red <30%. */
  probColor(p: number): string {
    if (p >= 70) return '#16a34a';
    if (p >= 30) return '#d97706';
    return '#dc2626';
  }

  /** Human-readable relative date with overdue detection. */
  relDate(d: string | null): { text: string; danger: boolean } | null {
    if (!d) return null;
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
    if (diff < 0)   return { text: `${Math.abs(diff)}d overdue`, danger: true  };
    if (diff === 0) return { text: 'Today',                       danger: false };
    if (diff <= 7)  return { text: `in ${diff}d`,                 danger: false };
    if (diff <= 30) return { text: `in ${Math.ceil(diff / 7)}w`,  danger: false };
    return           { text: `in ${Math.ceil(diff / 30)}mo`,      danger: false };
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  }

  avatarColor(name: string): string {
    const C = ['#2563eb', '#7c3aed', '#ea580c', '#16a34a', '#0891b2', '#db2777'];
    return C[name.charCodeAt(0) % C.length];
  }
}
