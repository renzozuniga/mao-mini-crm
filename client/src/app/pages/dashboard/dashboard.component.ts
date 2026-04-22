import {
  Component, OnInit, OnDestroy,
  inject, signal, ElementRef, ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import {
  Chart,
  BarController, BarElement,
  LineController, LineElement, PointElement, Filler,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
} from 'chart.js';
import type { TooltipOptions } from 'chart.js';

import { DashboardService } from '../../shared/services/dashboard.service';
import {
  DashboardSummary, DashboardKpis,
  PipelineStage, ActivityTrendPoint,
  TopOpportunity, RecentActivity, ActivityType,
  ContactsByStatus,
} from '../../core/models/dashboard.model';

Chart.register(
  BarController, BarElement,
  LineController, LineElement, PointElement, Filler,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
);

// ── Shared tooltip defaults — typed as Partial<TooltipOptions> so spreading
//    it directly into each chart's tooltip config is always type-safe.
const TOOLTIP_CFG: Partial<TooltipOptions> = {
  backgroundColor:  'rgba(15, 17, 23, 0.97)',
  borderColor:      'rgba(255, 255, 255, 0.10)',
  borderWidth:      1,
  titleColor:       'rgba(255, 255, 255, 0.92)',
  bodyColor:        'rgba(255, 255, 255, 0.60)',
  footerColor:      'rgba(255, 255, 255, 0.35)',
  padding:          { x: 14, y: 11 },
  cornerRadius:     12,
  caretSize:        6,
  caretPadding:     10,
  titleFont:        { size: 12, weight: 'bold', family: 'Inter, sans-serif' },
  bodyFont:         { size: 12, family: 'Inter, sans-serif' },
  footerFont:       { size: 11, family: 'Inter, sans-serif' },
  usePointStyle:    true,
  boxPadding:       5,
  displayColors:    true,
};

// ── Stage / Activity config ───────────────────────────────────────────────────
const STAGE_CFG: Record<string, { label: string; color: string }> = {
  LEAD:        { label: 'Lead',        color: '#6b7280' },
  QUALIFIED:   { label: 'Qualified',   color: '#2563eb' },
  PROPOSAL:    { label: 'Proposal',    color: '#7c3aed' },
  NEGOTIATION: { label: 'Negotiation', color: '#ea580c' },
  CLOSED_WON:  { label: 'Won',         color: '#16a34a' },
  CLOSED_LOST: { label: 'Lost',        color: '#dc2626' },
};

const ACTIVITY_CFG: Record<ActivityType, { icon: string; label: string; color: string }> = {
  CALL:    { icon: '📞', label: 'Call',    color: '#2563eb' },
  EMAIL:   { icon: '✉️',  label: 'Email',   color: '#7c3aed' },
  MEETING: { icon: '🤝', label: 'Meeting', color: '#ea580c' },
  NOTE:    { icon: '📝', label: 'Note',    color: '#6b7280' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe],
  template: `
    <!-- Quick actions -->
    <div class="dash-actions">
      <h2 class="dash-title">Overview</h2>
      <div class="dash-actions__btns">
        <a routerLink="/contacts" class="btn btn--ghost btn--sm">👤 New Contact</a>
        <a routerLink="/pipeline" class="btn btn--primary btn--sm">⬡ New Opportunity</a>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      @if (loading()) {
        @for (_ of [1,2,3,4]; track $index) {
          <div class="kpi-card kpi-card--skeleton">
            <div class="sk sk--label"></div>
            <div class="sk sk--value"></div>
          </div>
        }
      } @else {
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--blue">👥</div>
          <div class="kpi-card__body">
            <p class="kpi-card__label">Total Contacts</p>
            <p class="kpi-card__value">{{ kpis()?.totalContacts ?? 0 }}</p>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--purple">⬡</div>
          <div class="kpi-card__body">
            <p class="kpi-card__label">Open Opportunities</p>
            <p class="kpi-card__value">{{ kpis()?.openOpportunities ?? 0 }}</p>
          </div>
        </div>
        <div class="kpi-card kpi-card--accent">
          <div class="kpi-card__icon kpi-card__icon--white">💰</div>
          <div class="kpi-card__body">
            <p class="kpi-card__label">Pipeline Value</p>
            <p class="kpi-card__value">
              {{ (kpis()?.pipelineValue ?? 0) | currency:'USD':'symbol':'1.0-0' }}
            </p>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--orange">⚡</div>
          <div class="kpi-card__body">
            <p class="kpi-card__label">Activities This Week</p>
            <p class="kpi-card__value">{{ kpis()?.activitiesThisWeek ?? 0 }}</p>
          </div>
        </div>
      }
    </div>

    <!-- Row 1: Pipeline bar + Contact doughnut -->
    <div class="dash-row dash-row--3-2">

      <!-- Bar chart: pipeline by stage -->
      <section class="dash-card">
        <header class="dash-card__header">
          <div>
            <h3 class="dash-card__title">Pipeline by Stage</h3>
            <p class="dash-card__sub">Opportunities count &amp; value per stage</p>
          </div>
        </header>
        @if (loading()) {
          <div class="sk sk--chart"></div>
          <div class="sk-legend">
            @for (_ of [1,2,3,4,5,6]; track $index) {
              <div class="sk sk--legend-row"></div>
            }
          </div>
        } @else {
          <div class="chart-wrap chart-wrap--md">
            <canvas #barChart></canvas>
          </div>
          <div class="stage-legend">
            @for (s of pipeline(); track s.stage) {
              <div class="stage-legend__row">
                <span class="stage-legend__dot" [style.background]="stageColor(s.stage)"></span>
                <span class="stage-legend__name">{{ stageLabel(s.stage) }}</span>
                <span class="stage-legend__count">{{ s.count }}</span>
                <span class="stage-legend__bar-wrap">
                  <span class="stage-legend__bar"
                    [style.width.%]="barPct(s.count)"
                    [style.background]="stageColor(s.stage) + '66'">
                  </span>
                </span>
                <span class="stage-legend__val">{{ s.value | currency:'USD':'symbol':'1.0-0' }}</span>
              </div>
            }
          </div>
        }
      </section>

      <!-- Doughnut chart: contacts by status -->
      <section class="dash-card">
        <header class="dash-card__header">
          <div>
            <h3 class="dash-card__title">Contact Status</h3>
            <p class="dash-card__sub">Distribution by status</p>
          </div>
        </header>
        @if (loading()) {
          <div class="sk sk--doughnut"></div>
        } @else {
          <div class="chart-wrap chart-wrap--doughnut">
            <canvas #doughnutChart></canvas>
            <div class="doughnut-center">
              <p class="doughnut-center__num">{{ kpis()?.totalContacts ?? 0 }}</p>
              <p class="doughnut-center__label">Total</p>
            </div>
          </div>
          <div class="doughnut-legend">
            <div class="doughnut-legend__item">
              <span class="doughnut-legend__dot" style="background:#16a34a"></span>
              <span class="doughnut-legend__label">Active</span>
              <span class="doughnut-legend__val">{{ contacts()?.ACTIVE ?? 0 }}</span>
            </div>
            <div class="doughnut-legend__item">
              <span class="doughnut-legend__dot" style="background:#2563eb"></span>
              <span class="doughnut-legend__label">Lead</span>
              <span class="doughnut-legend__val">{{ contacts()?.LEAD ?? 0 }}</span>
            </div>
            <div class="doughnut-legend__item">
              <span class="doughnut-legend__dot" style="background:#6b7280"></span>
              <span class="doughnut-legend__label">Inactive</span>
              <span class="doughnut-legend__val">{{ contacts()?.INACTIVE ?? 0 }}</span>
            </div>
          </div>
        }
      </section>
    </div>

    <!-- Row 2: Activity trend line + Top opportunities horizontal bar -->
    <div class="dash-row dash-row--1-1">

      <!-- Line chart: activity trend -->
      <section class="dash-card">
        <header class="dash-card__header">
          <div>
            <h3 class="dash-card__title">Activity Trend</h3>
            <p class="dash-card__sub">Last 14 days</p>
          </div>
        </header>
        @if (loading()) {
          <div class="sk sk--chart"></div>
        } @else {
          <div class="chart-wrap chart-wrap--md">
            <canvas #lineChart></canvas>
          </div>
        }
      </section>

      <!-- Horizontal bar: top 5 opportunities -->
      <section class="dash-card">
        <header class="dash-card__header">
          <div>
            <h3 class="dash-card__title">Top Opportunities</h3>
            <p class="dash-card__sub">Highest value open deals</p>
          </div>
        </header>
        @if (loading()) {
          <div class="sk sk--chart"></div>
        } @else {
          <div class="chart-wrap chart-wrap--md">
            <canvas #hbarChart></canvas>
          </div>
        }
      </section>
    </div>

    <!-- Recent activities feed -->
    <section class="dash-card">
      <header class="dash-card__header">
        <div>
          <h3 class="dash-card__title">Recent Activities</h3>
          <p class="dash-card__sub">Latest interactions with contacts</p>
        </div>
        <a routerLink="/activities" class="dash-card__link">View all →</a>
      </header>

      @if (loading()) {
        <div class="act-skeleton-list">
          @for (_ of [1,2,3,4,5]; track $index) {
            <div class="act-skeleton">
              <div class="sk sk--circle"></div>
              <div class="act-skeleton__lines">
                <div class="sk sk--line-lg"></div>
                <div class="sk sk--line-sm"></div>
              </div>
            </div>
          }
        </div>
      } @else {
        <ul class="act-list">
          @for (act of activities(); track act.id) {
            <li class="act-item">
              <span class="act-item__icon" [title]="actLabel(act.type)">
                {{ actIcon(act.type) }}
              </span>
              <div class="act-item__body">
                <p class="act-item__desc">{{ act.description }}</p>
                <p class="act-item__meta">
                  <strong>{{ act.contact.name }}</strong>
                  &nbsp;·&nbsp; {{ act.contact.company }}
                  &nbsp;·&nbsp; {{ act.activityDate | date:'MMM d' }}
                </p>
              </div>
              <span
                class="act-item__badge"
                [style.background]="actColor(act.type) + '22'"
                [style.color]="actColor(act.type)"
              >{{ actLabel(act.type) }}</span>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [`
    /* ── Actions bar ─────────────────────────────────────────────────────── */
    .dash-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-6);
    }
    .dash-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;
    }
    .dash-actions__btns { display: flex; gap: var(--space-3); }
    .btn--sm {
      padding: var(--space-2) var(--space-4);
      font-size: 0.8125rem;
      gap: var(--space-2);
    }

    /* ── KPI Grid ────────────────────────────────────────────────────────── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-4);
      margin-bottom: var(--space-5);
    }
    @media (max-width: 1024px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px)  { .kpi-grid { grid-template-columns: 1fr; } }

    .kpi-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
      display: flex;
      align-items: center;
      gap: var(--space-4);
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    }
    .kpi-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
    .kpi-card--accent {
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      border-color: transparent;
    }
    .kpi-card--accent .kpi-card__label,
    .kpi-card--accent .kpi-card__value { color: #fff; }
    .kpi-card--skeleton {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-3);
      min-height: 88px;
    }

    .kpi-card__icon {
      width: 44px; height: 44px; min-width: 44px;
      border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.25rem;
    }
    .kpi-card__icon--blue   { background: rgba(37,99,235,.15); }
    .kpi-card__icon--purple { background: rgba(124,58,237,.15); }
    .kpi-card__icon--orange { background: rgba(234,88,12,.15); }
    .kpi-card__icon--white  { background: rgba(255,255,255,.2); }

    .kpi-card__label {
      font-size: 0.7rem; font-weight: 600; letter-spacing: .05em;
      text-transform: uppercase; color: var(--color-text-secondary); margin: 0;
    }
    .kpi-card__value {
      font-size: 1.625rem; font-weight: 700;
      color: var(--color-text-primary); margin: 0; line-height: 1.1;
    }

    /* ── Layout rows ─────────────────────────────────────────────────────── */
    .dash-row {
      display: grid;
      gap: var(--space-5);
      margin-bottom: var(--space-5);
    }
    .dash-row--3-2 { grid-template-columns: 3fr 2fr; }
    .dash-row--1-1 { grid-template-columns: 1fr 1fr; }
    @media (max-width: 960px) {
      .dash-row--3-2,
      .dash-row--1-1 { grid-template-columns: 1fr; }
    }

    /* ── Generic card ────────────────────────────────────────────────────── */
    .dash-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
      margin-bottom: 0;
    }
    .dash-card:last-child { margin-bottom: 0; }

    .dash-card__header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: var(--space-5);
    }
    .dash-card__title { font-size: 0.9375rem; font-weight: 700; color: var(--color-text-primary); margin: 0; }
    .dash-card__sub   { font-size: 0.72rem; color: var(--color-text-secondary); margin: var(--space-1) 0 0; }
    .dash-card__link  { font-size: 0.8rem; color: var(--color-primary); text-decoration: none; white-space: nowrap; margin-top: 2px; }
    .dash-card__link:hover { text-decoration: underline; }

    /* ── Chart containers ────────────────────────────────────────────────── */
    .chart-wrap { position: relative; }
    .chart-wrap--md       { height: 210px; margin-bottom: var(--space-4); }
    .chart-wrap--doughnut {
      height: 180px;
      display: flex; align-items: center; justify-content: center;
      position: relative;
      margin-bottom: var(--space-4);
    }

    /* Center label inside doughnut */
    .doughnut-center {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
    }
    .doughnut-center__num   { font-size: 1.75rem; font-weight: 700; color: var(--color-text-primary); margin: 0; line-height: 1; }
    .doughnut-center__label { font-size: 0.7rem; color: var(--color-text-secondary); margin: 2px 0 0; text-transform: uppercase; letter-spacing: .04em; }

    /* Doughnut legend */
    .doughnut-legend { display: flex; flex-direction: column; gap: var(--space-2); }
    .doughnut-legend__item { display: flex; align-items: center; gap: var(--space-2); font-size: 0.8125rem; }
    .doughnut-legend__dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .doughnut-legend__label { flex: 1; color: var(--color-text-secondary); }
    .doughnut-legend__val   { font-weight: 600; color: var(--color-text-primary); }

    /* ── Stage legend (pipeline) ─────────────────────────────────────────── */
    .stage-legend { display: flex; flex-direction: column; gap: var(--space-2); }
    .stage-legend__row {
      display: grid;
      grid-template-columns: 10px 80px 22px 1fr 80px;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.78rem;
    }
    .stage-legend__dot  { width: 10px; height: 10px; border-radius: 50%; }
    .stage-legend__name { color: var(--color-text-secondary); }
    .stage-legend__count { font-weight: 600; color: var(--color-text-primary); text-align: right; }
    .stage-legend__bar-wrap { height: 6px; background: rgba(255,255,255,.05); border-radius: 99px; overflow: hidden; }
    .stage-legend__bar  { display: block; height: 100%; border-radius: 99px; transition: width .4s ease; }
    .stage-legend__val  { font-size: 0.72rem; color: var(--color-text-secondary); text-align: right; }

    /* ── Skeleton ────────────────────────────────────────────────────────── */
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
    .sk--label    { width: 55%; height: 11px; }
    .sk--value    { width: 38%; height: 26px; }
    .sk--chart    { width: 100%; height: 210px; border-radius: var(--radius-md); }
    .sk--doughnut { width: 160px; height: 160px; border-radius: 50%; margin: 0 auto; }
    .sk--circle   { width: 34px; height: 34px; min-width: 34px; border-radius: 50%; }
    .sk--line-lg  { width: 75%; height: 12px; }
    .sk--line-sm  { width: 45%; height: 10px; }
    .sk--legend-row { width: 100%; height: 10px; margin-bottom: 6px; }

    .sk-legend { margin-top: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); }

    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Activity feed ───────────────────────────────────────────────────── */
    .act-skeleton-list { display: flex; flex-direction: column; gap: 0; }
    .act-skeleton {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--color-border);
    }
    .act-skeleton:last-child { border-bottom: none; }
    .act-skeleton__lines { flex: 1; display: flex; flex-direction: column; gap: var(--space-2); }

    .act-list { display: flex; flex-direction: column; }
    .act-item {
      display: flex; align-items: flex-start; gap: var(--space-3);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--color-border);
      transition: background var(--transition-fast);
    }
    .act-item:last-child { border-bottom: none; }
    .act-item:hover { background: rgba(255,255,255,.02); border-radius: var(--radius-sm); }

    .act-item__icon { font-size: 1.2rem; line-height: 1; margin-top: 3px; flex-shrink: 0; }
    .act-item__body { flex: 1; min-width: 0; }
    .act-item__desc {
      font-size: 0.8125rem; color: var(--color-text-primary);
      margin: 0 0 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .act-item__meta { font-size: 0.72rem; color: var(--color-text-secondary); margin: 0; }
    .act-item__badge {
      font-size: 0.68rem; font-weight: 700; padding: 3px 9px;
      border-radius: var(--radius-full); white-space: nowrap; flex-shrink: 0;
      letter-spacing: .03em;
    }
  `],
})
export class DashboardComponent implements OnInit, OnDestroy {

  /* ── ViewChild setters — fire the moment each canvas enters the DOM ─────── */

  @ViewChild('barChart')
  set barChart(el: ElementRef<HTMLCanvasElement> | undefined) {
    if (el?.nativeElement && this.pipeline().length) {
      this.initBarChart(el.nativeElement, this.pipeline());
    }
  }

  @ViewChild('doughnutChart')
  set doughnutChart(el: ElementRef<HTMLCanvasElement> | undefined) {
    if (el?.nativeElement && this.contacts()) {
      this.initDoughnutChart(el.nativeElement, this.contacts()!);
    }
  }

  @ViewChild('lineChart')
  set lineChart(el: ElementRef<HTMLCanvasElement> | undefined) {
    if (el?.nativeElement && this.trend().length) {
      this.initLineChart(el.nativeElement, this.trend());
    }
  }

  @ViewChild('hbarChart')
  set hbarChart(el: ElementRef<HTMLCanvasElement> | undefined) {
    if (el?.nativeElement && this.topOpps().length) {
      this.initHBarChart(el.nativeElement, this.topOpps());
    }
  }

  private charts: Chart[] = [];
  private dashService = inject(DashboardService);

  readonly loading    = signal(true);
  readonly kpis       = signal<DashboardKpis | null>(null);
  readonly pipeline   = signal<PipelineStage[]>([]);
  readonly contacts   = signal<ContactsByStatus | null>(null);
  readonly trend      = signal<ActivityTrendPoint[]>([]);
  readonly topOpps    = signal<TopOpportunity[]>([]);
  readonly activities = signal<RecentActivity[]>([]);

  /** Max pipeline count (for the mini progress bars in the stage legend). */
  private maxCount = 1;

  ngOnInit(): void {
    this.dashService.getSummary().subscribe({
      next: (d: DashboardSummary) => {
        this.maxCount = Math.max(...d.pipelineByStage.map(s => s.count), 1);
        this.kpis.set(d.kpis);
        this.pipeline.set(d.pipelineByStage);
        this.contacts.set(d.contactsByStatus);
        this.trend.set(d.activityTrend);
        this.topOpps.set(d.topOpportunities);
        this.activities.set(d.recentActivities);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  /** Returns width % for the stage legend mini-bar. */
  barPct(count: number): number {
    return Math.round((count / this.maxCount) * 100);
  }

  // ── Chart builders ──────────────────────────────────────────────────────────

  private initBarChart(canvas: HTMLCanvasElement, stages: PipelineStage[]): void {
    const chart = new Chart<'bar'>(canvas, {
      type: 'bar',
      data: {
        labels:   stages.map(s => STAGE_CFG[s.stage]?.label ?? s.stage),
        datasets: [{
          label:           'Opportunities',
          data:            stages.map(s => s.count),
          backgroundColor: stages.map(s => (STAGE_CFG[s.stage]?.color ?? '#6b7280') + 'bb'),
          borderColor:     stages.map(s =>  STAGE_CFG[s.stage]?.color ?? '#6b7280'),
          borderWidth:     1,
          borderRadius:    6,
          borderSkipped:   false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_CFG,
            callbacks: {
              title: items => STAGE_CFG[stages[items[0].dataIndex]?.stage]?.label ?? '',
              label: ctx  => `  ${ctx.parsed.y} opportunit${ctx.parsed.y === 1 ? 'y' : 'ies'}`,
              footer: items => {
                const val = stages[items[0].dataIndex]?.value ?? 0;
                return `  Value: ${fmt(val)}`;
              },
            },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 11 }, stepSize: 1 } },
        },
      },
    });
    this.charts.push(chart);
  }

  private initDoughnutChart(canvas: HTMLCanvasElement, cs: ContactsByStatus): void {
    const chart = new Chart<'doughnut'>(canvas, {
      type: 'doughnut',
      data: {
        labels:   ['Active', 'Lead', 'Inactive'],
        datasets: [{
          data:            [cs.ACTIVE, cs.LEAD, cs.INACTIVE],
          backgroundColor: ['#16a34a99', '#2563eb99', '#6b728099'],
          borderColor:     ['#16a34a',   '#2563eb',   '#6b7280'],
          borderWidth:     2,
          hoverOffset:     8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_CFG,
            callbacks: {
              label: ctx => {
                const total = [cs.ACTIVE, cs.LEAD, cs.INACTIVE].reduce((a, b) => a + b, 0);
                const pct   = total ? Math.round((ctx.parsed / total) * 100) : 0;
                return `  ${ctx.parsed} contacts  (${pct}%)`;
              },
            },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  private initLineChart(canvas: HTMLCanvasElement, trend: ActivityTrendPoint[]): void {
    const chart = new Chart<'line'>(canvas, {
      type: 'line',
      data: {
        labels:   trend.map(t => t.label),
        datasets: [{
          label:           'Activities',
          data:            trend.map(t => t.count),
          borderColor:     '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.12)',
          borderWidth:     2,
          pointRadius:     trend.map(t => t.count > 0 ? 4 : 2),
          pointBackgroundColor: '#2563eb',
          pointBorderColor:     'rgba(15,17,23,0.8)',
          pointBorderWidth:     2,
          pointHoverRadius:     6,
          tension:         0.4,
          fill:            true,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_CFG,
            callbacks: {
              title: items => trend[items[0].dataIndex]?.label ?? '',
              label: ctx  => `  ${ctx.parsed.y} activit${ctx.parsed.y === 1 ? 'y' : 'ies'}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 10 }, maxTicksLimit: 7 },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 11 }, stepSize: 1 },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  private initHBarChart(canvas: HTMLCanvasElement, opps: TopOpportunity[]): void {
    const chart = new Chart<'bar'>(canvas, {
      type: 'bar',
      data: {
        labels:   opps.map(o => o.title.length > 22 ? o.title.slice(0, 22) + '…' : o.title),
        datasets: [{
          label:           'Value',
          data:            opps.map(o => o.value),
          backgroundColor: opps.map(o => (STAGE_CFG[o.stage]?.color ?? '#2563eb') + 'bb'),
          borderColor:     opps.map(o =>  STAGE_CFG[o.stage]?.color ?? '#2563eb'),
          borderWidth:     1,
          borderRadius:    6,
          borderSkipped:   false,
        }],
      },
      options: {
        indexAxis:  'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_CFG,
            callbacks: {
              title: items => opps[items[0].dataIndex]?.title ?? '',
              label: ctx  => `  ${fmt(ctx.parsed.x ?? 0)}`,
              footer: items => {
                const o = opps[items[0].dataIndex];
                return [`  Contact: ${o?.contact}`, `  Stage:   ${STAGE_CFG[o?.stage]?.label}`];
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: 'rgba(255,255,255,0.45)', font: { size: 10 },
              callback: (v: unknown) => fmt(Number(v)).replace('$', '$').replace(/,(\d{3})$/, 'k').replace(/,\d{3},(\d{3})$/, 'M'),
            },
          },
          y: {
            grid: { display: false },
            ticks: { color: 'rgba(255,255,255,0.65)', font: { size: 11 } },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // ── Display helpers ─────────────────────────────────────────────────────────
  stageLabel(s: string): string      { return STAGE_CFG[s]?.label     ?? s; }
  stageColor(s: string): string      { return STAGE_CFG[s]?.color     ?? '#6b7280'; }
  actIcon(t: ActivityType):  string  { return ACTIVITY_CFG[t]?.icon   ?? '•'; }
  actLabel(t: ActivityType): string  { return ACTIVITY_CFG[t]?.label  ?? t; }
  actColor(t: ActivityType): string  { return ACTIVITY_CFG[t]?.color  ?? '#6b7280'; }
}
