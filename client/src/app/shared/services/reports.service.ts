import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PipelineStage {
  stage:    string;
  total:    number;
  weighted: number;
  count:    number;
}

export interface ActivityDay {
  date:    string;
  CALL:    number;
  EMAIL:   number;
  MEETING: number;
  NOTE:    number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  value: number;
  pct:   number;
}

export interface GrowthMonth {
  month:       string;
  new:         number;
  cumulative:  number;
}

export interface ReportKpis {
  totalContacts:  number;
  totalOpps:      number;
  totalActivities:number;
  wonRevenue:     number;
  wonDeals:       number;
  winRate:        number;
}

export interface ReportsResponse {
  pipeline:   PipelineStage[];
  activities: ActivityDay[];
  funnel:     FunnelStage[];
  growth:     GrowthMonth[];
  kpis:       ReportKpis;
  meta:       { days: number; months: number };
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private http    = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/reports`;

  /**
   * Fetches all report datasets in one request.
   * @param days   Lookback window for the activities chart (7 | 30 | 90)
   * @param months Lookback window for the contact growth chart (3 | 6 | 12)
   */
  get(days = 30, months = 6): Observable<ReportsResponse> {
    const params = new HttpParams().set('days', days).set('months', months);
    return this.http.get<ReportsResponse>(this.baseUrl, { params });
  }
}
