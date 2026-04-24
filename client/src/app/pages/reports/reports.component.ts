import {
  Component, OnInit, OnDestroy,
  inject, signal, ElementRef, ViewChild, ChangeDetectorRef,
} from '@angular/core';
import {
  Chart,
  BarController, BarElement,
  LineController, LineElement, PointElement, Filler,
  CategoryScale, LinearScale,
  Tooltip, Legend,
} from 'chart.js';
import type { TooltipOptions } from 'chart.js';
import { CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';

import { ReportsService, ReportsResponse, PipelineStage, FunnelStage } from '../../shared/services/reports.service';

Chart.register(
  BarController, BarElement,
  LineController, LineElement, PointElement, Filler,
  CategoryScale, LinearScale,
  Tooltip, Legend,
);

// ── Shared tooltip style ──────────────────────────────────────────────────────
const TOOLTIP: Partial<TooltipOptions> = {
  backgroundColor:  'rgba(15, 17, 23, 0.97)',
  borderColor:      'rgba(255, 255, 255, 0.10)',
  borderWidth:      1,
  titleColor:       'rgba(255, 255, 255, 0.92)',
  bodyColor:        'rgba(255, 255, 255, 0.60)',
  padding:          { x: 14, y: 11 },
  cornerRadius:     12,
  caretSize:        5,
  titleFont:        { size: 12, weight: 'bold', family: 'Inter, sans-serif' },
  bodyFont:         { size: 12, family: 'Inter, sans-serif' },
  usePointStyle:    true,
  boxPadding:       5,
};

// ── Stage colours ─────────────────────────────────────────────────────────────
const STAGE_CFG: Record<string, { label: string; color: string }> = {
  LEAD:        { label: 'Lead',        color: '#6b7280' },
  QUALIFIED:   { label: 'Qualified',   color: '#2563eb' },
  PROPOSAL:    { label: 'Proposal',    color: '#7c3aed' },
  NEGOTIATION: { label: 'Negotiation', color: '#ea580c' },
  CLOSED_WON:  { label: 'Won',         color: '#16a34a' },
  CLOSED_LOST: { label: 'Lost',        color: '#dc2626' },
};

// ── Activity colours ──────────────────────────────────────────────────────────
const ACT_CFG: Record<string, { label: string; color: string }> = {
  CALL:    { label: 'Calls',    color: '#2563eb' },
  EMAIL:   { label: 'Emails',   color: '#7c3aed' },
  MEETING: { label: 'Meetings', color: '#ea580c' },
  NOTE:    { label: 'Notes',    color: '#6b7280' },
};

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, PercentPipe],
  template: `
    <div class="rp-page">

      <!-- ── Page header ──────────────────────────────────────────────────── -->
      <div class="rp-header">
        <div>
          <h1 class="rp-title">Analytics & Reports</h1>
          <p class="rp-subtitle">Overview of your pipeline, activities and growth</p>
        </div>

        <!-- Date range toggles -->
        <div class="rp-controls">
          <div class="rp-toggle-group" role="group" aria-label="Activity window">
            <span class="rp-toggle-label">Activities:</span>
            @for (opt of dayOptions; track opt) {
              <button
                class="rp-toggle-btn"
                [class.rp-toggle-btn--active]="days() === opt"
                (click)="setDays(opt)"
              >{{ opt }}d</button>
            }
          </div>

          <div class="rp-toggle-group" role="group" aria-label="Growth window">
            <span class="rp-toggle-label">Growth:</span>
            @for (opt of monthOptions; track opt) {
              <button
                class="rp-toggle-btn"
                [class.rp-toggle-btn--active]="months() === opt"
                (click)="setMonths(opt)"
              >{{ opt }}m</button>
            }
          </div>
        </div>
      </div>

      @if (loading()) {
        <!-- ── Skeleton ────────────────────────────────────────────────── -->
        <div class="rp-skeleton-grid">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="rp-kpi-skeleton"></div>
          }
        </div>
        <div class="rp-chart-grid">
          @for (i of [1,2,3,4]; track i) {
            <div class="rp-chart-skeleton"></div>
          }
        </div>
      } @else {
        @if (data(); as d) {

        <!-- ── KPI Strip ───────────────────────────────────────────────── -->
        <div class="rp-kpi-row">
          <div class="rp-kpi">
            <span class="rp-kpi__icon">👥</span>
            <div class="rp-kpi__body">
              <span class="rp-kpi__value">{{ d.kpis.totalContacts | number }}</span>
              <span class="rp-kpi__label">Total Contacts</span>
            </div>
          </div>
          <div class="rp-kpi">
            <span class="rp-kpi__icon">⬡</span>
            <div class="rp-kpi__body">
              <span class="rp-kpi__value">{{ d.kpis.totalOpps | number }}</span>
              <span class="rp-kpi__label">Opportunities</span>
            </div>
          </div>
          <div class="rp-kpi">
            <span class="rp-kpi__icon">💰</span>
            <div class="rp-kpi__body">
              <span class="rp-kpi__value">{{ d.kpis.wonRevenue | currency:'USD':'symbol':'1.0-0' }}</span>
              <span class="rp-kpi__label">Won Revenue</span>
            </div>
          </div>
          <div class="rp-kpi">
            <span class="rp-kpi__icon">🏆</span>
            <div class="rp-kpi__body">
              <span class="rp-kpi__value">{{ d.kpis.wonDeals | number }}</span>
              <span class="rp-kpi__label">Deals Won</span>
            </div>
          </div>
          <div class="rp-kpi">
            <span class="rp-kpi__icon">🎯</span>
            <div class="rp-kpi__body">
              <span class="rp-kpi__value">{{ d.kpis.winRate | percent:'1.0-1' }}</span>
              <span class="rp-kpi__label">Win Rate</span>
            </div>
          </div>
        </div>

        <!-- ── Charts grid ─────────────────────────────────────────────── -->
        <div class="rp-chart-grid">

          <!-- Pipeline Revenue -->
          <div class="rp-card rp-card--wide">
            <h2 class="rp-card__title">Pipeline Revenue by Stage</h2>
            <p class="rp-card__desc">Total vs weighted value per pipeline stage</p>
            <div class="rp-chart-wrap">
              <canvas #pipelineCanvas></canvas>
            </div>
          </div>

          <!-- Activities over time -->
          <div class="rp-card rp-card--wide">
            <h2 class="rp-card__title">Activity Trend <span class="rp-badge">Last {{ days() }} days</span></h2>
            <p class="rp-card__desc">Daily breakdown by activity type</p>
            <div class="rp-chart-wrap">
              <canvas #activityCanvas></canvas>
            </div>
          </div>

          <!-- Conversion Funnel -->
          <div class="rp-card">
            <h2 class="rp-card__title">Conversion Funnel</h2>
            <p class="rp-card__desc">Deal flow through pipeline stages</p>
            <div class="rp-funnel">
              @for (stage of d.funnel; track stage.stage) {
                <div class="rp-funnel__row">
                  <div class="rp-funnel__label">
                    <span class="rp-funnel__name">{{ stageName(stage.stage) }}</span>
                    <span class="rp-funnel__count">{{ stage.count }}</span>
                  </div>
                  <div class="rp-funnel__bar-wrap">
                    <div
                      class="rp-funnel__bar"
                      [style.width.%]="stage.pct * 100"
                      [style.background]="stageColor(stage.stage)"
                    ></div>
                  </div>
                  <span class="rp-funnel__value">{{ stage.value | currency:'USD':'symbol':'1.0-0' }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Contact Growth -->
          <div class="rp-card">
            <h2 class="rp-card__title">Contact Growth <span class="rp-badge">Last {{ months() }}m</span></h2>
            <p class="rp-card__desc">Monthly new contacts and cumulative total</p>
            <div class="rp-chart-wrap">
              <canvas #growthCanvas></canvas>
            </div>
          </div>

        </div>
        } <!-- end @if data -->
      } <!-- end @else -->

    </div>
  `,
  styles: [`
    /* ── Layout ─────────────────────────────────────────────────────────────── */
    .rp-page {
      padding: var(--space-6);
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      max-width: 1400px;
      margin: 0 auto;
    }

    /* ── Header ─────────────────────────────────────────────────────────────── */
    .rp-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      flex-wrap: wrap;
    }

    .rp-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-1);
    }

    .rp-subtitle {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0;
    }

    /* ── Controls ───────────────────────────────────────────────────────────── */
    .rp-controls {
      display: flex;
      gap: var(--space-4);
      flex-wrap: wrap;
    }

    .rp-toggle-group {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-1);
    }

    .rp-toggle-label {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      padding: 0 var(--space-2);
      white-space: nowrap;
    }

    .rp-toggle-btn {
      padding: var(--space-1) var(--space-3);
      border: none;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-secondary);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: background var(--transition-fast), color var(--transition-fast);
    }

    .rp-toggle-btn:hover { background: var(--color-bg-tertiary); color: var(--color-text-primary); }

    .rp-toggle-btn--active {
      background: var(--color-primary);
      color: #fff;
    }

    /* ── KPI strip ──────────────────────────────────────────────────────────── */
    .rp-kpi-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: var(--space-4);
    }

    @media (max-width: 1200px) { .rp-kpi-row { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 768px)  { .rp-kpi-row { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px)  { .rp-kpi-row { grid-template-columns: 1fr; } }

    .rp-kpi {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-4) var(--space-5);
      display: flex;
      align-items: center;
      gap: var(--space-3);
      transition: box-shadow var(--transition-fast);
    }

    .rp-kpi:hover { box-shadow: 0 4px 20px rgba(0,0,0,.15); }

    .rp-kpi__icon {
      font-size: 1.5rem;
      line-height: 1;
    }

    .rp-kpi__body {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .rp-kpi__value {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text-primary);
      line-height: 1.2;
    }

    .rp-kpi__label {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
    }

    /* ── Chart grid ─────────────────────────────────────────────────────────── */
    .rp-chart-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-5);
    }

    @media (max-width: 1024px) { .rp-chart-grid { grid-template-columns: 1fr; } }

    .rp-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-5) var(--space-6);
    }

    .rp-card--wide {
      grid-column: span 2;
    }

    @media (max-width: 1024px) { .rp-card--wide { grid-column: span 1; } }

    .rp-card__title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-1);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .rp-card__desc {
      font-size: 0.8rem;
      color: var(--color-text-tertiary);
      margin: 0 0 var(--space-4);
    }

    .rp-badge {
      font-size: 0.7rem;
      font-weight: 500;
      background: var(--color-primary-light);
      color: var(--color-primary);
      padding: 2px 8px;
      border-radius: 999px;
    }

    .rp-chart-wrap {
      position: relative;
      height: 280px;
    }

    .rp-chart-wrap canvas {
      width: 100% !important;
      height: 100% !important;
    }

    /* ── Funnel ─────────────────────────────────────────────────────────────── */
    .rp-funnel {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .rp-funnel__row {
      display: grid;
      grid-template-columns: 140px 1fr 90px;
      align-items: center;
      gap: var(--space-3);
    }

    .rp-funnel__label {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .rp-funnel__name {
      font-size: 0.8rem;
      color: var(--color-text-secondary);
      white-space: nowrap;
    }

    .rp-funnel__count {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-primary);
      background: var(--color-bg-secondary);
      border-radius: 999px;
      padding: 1px 7px;
    }

    .rp-funnel__bar-wrap {
      height: 10px;
      background: var(--color-bg-secondary);
      border-radius: 999px;
      overflow: hidden;
    }

    .rp-funnel__bar {
      height: 100%;
      border-radius: 999px;
      transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
      min-width: 2px;
    }

    .rp-funnel__value {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-text-primary);
      text-align: right;
    }

    /* ── Skeleton ───────────────────────────────────────────────────────────── */
    .rp-skeleton-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: var(--space-4);
    }

    .rp-kpi-skeleton {
      height: 80px;
      background: var(--color-bg-secondary);
      border-radius: var(--radius-lg);
      animation: pulse 1.5s ease-in-out infinite;
    }

    .rp-chart-grid .rp-chart-skeleton {
      height: 360px;
    }

    .rp-chart-skeleton {
      background: var(--color-bg-secondary);
      border-radius: var(--radius-lg);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }
  `],
})
export class ReportsComponent implements OnInit, OnDestroy {

  // ── DI ─────────────────────────────────────────────────────────────────────
  private svc = inject(ReportsService);
  private cdr = inject(ChangeDetectorRef);

  // ── Canvas refs ─────────────────────────────────────────────────────────────
  @ViewChild('pipelineCanvas') private pipelineEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('activityCanvas') private activityEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('growthCanvas')   private growthEl!:   ElementRef<HTMLCanvasElement>;

  // ── State ───────────────────────────────────────────────────────────────────
  readonly loading = signal(true);
  readonly data    = signal<ReportsResponse | null>(null);
  readonly days    = signal<7 | 30 | 90>(30);
  readonly months  = signal<3 | 6 | 12>(6);

  readonly dayOptions   = [7, 30, 90] as const;
  readonly monthOptions = [3, 6, 12]  as const;

  // ── Chart instances ─────────────────────────────────────────────────────────
  private pipelineChart?: Chart;
  private activityChart?: Chart;
  private growthChart?: Chart;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.pipelineChart?.destroy();
    this.activityChart?.destroy();
    this.growthChart?.destroy();
  }

  // ── Public controls ─────────────────────────────────────────────────────────

  setDays(d: 7 | 30 | 90): void {
    this.days.set(d);
    this.load();
  }

  setMonths(m: 3 | 6 | 12): void {
    this.months.set(m);
    this.load();
  }

  // ── Template helpers ────────────────────────────────────────────────────────

  stageName(key: string): string {
    return STAGE_CFG[key]?.label ?? key;
  }

  stageColor(key: string): string {
    return STAGE_CFG[key]?.color ?? '#6b7280';
  }

  // ── Data loading ─────────────────────────────────────────────────────────────

  private load(): void {
    this.loading.set(true);

    this.svc.get(this.days(), this.months()).subscribe({
      next: res => {
        this.data.set(res);
        this.loading.set(false);
        // Force a synchronous CD pass so Angular renders the <canvas> elements
        // before drawCharts tries to access them via @ViewChild
        this.cdr.detectChanges();
        this.drawCharts(res);
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Chart rendering ──────────────────────────────────────────────────────────

  private drawCharts(d: ReportsResponse): void {
    this.destroyCharts();
    this.drawPipeline(d.pipeline);
    this.drawActivities(d.activities);
    this.drawGrowth(d.growth);
  }

  private destroyCharts(): void {
    this.pipelineChart?.destroy();
    this.activityChart?.destroy();
    this.growthChart?.destroy();
  }

  /**
   * Grouped bar chart: Total Value vs Weighted Value per pipeline stage.
   */
  private drawPipeline(stages: PipelineStage[]): void {
    if (!this.pipelineEl) return;

    const labels = stages.map(s => STAGE_CFG[s.stage]?.label ?? s.stage);
    const colors = stages.map(s => STAGE_CFG[s.stage]?.color ?? '#6b7280');

    this.pipelineChart = new Chart(this.pipelineEl.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Value',
            data: stages.map(s => s.total),
            backgroundColor: colors.map(c => c + '99'),
            borderColor: colors,
            borderWidth: 1.5,
            borderRadius: 6,
          },
          {
            label: 'Weighted Value',
            data: stages.map(s => s.weighted),
            backgroundColor: colors.map(c => c + '44'),
            borderColor: colors.map(c => c + 'aa'),
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            ...TOOLTIP,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${fmtUSD(ctx.raw as number)}`,
            },
          },
          legend: {
            labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, usePointStyle: true },
          },
        },
        scales: {
          x: {
            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
            grid:  { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            ticks: {
              color: 'rgba(255,255,255,0.5)',
              font: { size: 11 },
              callback: (v) => fmtUSD(v as number),
            },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
        },
      },
    });
  }

  /**
   * Multi-line chart showing daily activity counts per type.
   */
  private drawActivities(days: import('../../shared/services/reports.service').ActivityDay[]): void {
    if (!this.activityEl) return;

    const labels = days.map(d => {
      const dt = new Date(d.date + 'T12:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const types: Array<'CALL' | 'EMAIL' | 'MEETING' | 'NOTE'> = ['CALL', 'EMAIL', 'MEETING', 'NOTE'];

    this.activityChart = new Chart(this.activityEl.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: types.map(t => ({
          label: ACT_CFG[t].label,
          data: days.map(d => d[t]),
          borderColor: ACT_CFG[t].color,
          backgroundColor: ACT_CFG[t].color + '1a',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
          fill: false,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: { ...TOOLTIP },
          legend: {
            labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, usePointStyle: true },
          },
        },
        scales: {
          x: {
            ticks: {
              color: 'rgba(255,255,255,0.5)',
              font: { size: 10 },
              maxTicksLimit: 12,
            },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.05)' },
            beginAtZero: true,
          },
        },
      },
    });
  }

  /**
   * Dual-axis line chart: new contacts per month and running cumulative total.
   */
  private drawGrowth(months: import('../../shared/services/reports.service').GrowthMonth[]): void {
    if (!this.growthEl) return;

    const labels = months.map(m => {
      const [y, mo] = m.month.split('-');
      return new Date(+y, +mo - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    this.growthChart = new Chart(this.growthEl.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'New Contacts',
            data: months.map(m => m.new),
            borderColor: '#2563eb',
            backgroundColor: '#2563eb22',
            borderWidth: 2,
            pointRadius: 4,
            fill: true,
            tension: 0.3,
            yAxisID: 'y',
          },
          {
            label: 'Cumulative',
            data: months.map(m => m.cumulative),
            borderColor: '#16a34a',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 3,
            fill: false,
            tension: 0.3,
            borderDash: [5, 3],
            yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: { ...TOOLTIP },
          legend: {
            labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, usePointStyle: true },
          },
        },
        scales: {
          x: {
            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            position: 'left',
            ticks: { color: '#2563eb', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.05)' },
            beginAtZero: true,
          },
          y2: {
            position: 'right',
            ticks: { color: '#16a34a', font: { size: 10 } },
            grid: { display: false },
            beginAtZero: true,
          },
        },
      },
    });
  }
}
