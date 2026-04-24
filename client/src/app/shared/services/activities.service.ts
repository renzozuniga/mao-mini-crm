import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Activity, CreateActivityDto, UpdateActivityDto,
} from '../../core/models/activity.model';

export interface ActivitiesQuery {
  type?:          string;
  contactId?:     number;
  opportunityId?: number;
  page?:          number;
  limit?:         number;
}

export interface ActivitiesResponse {
  data:       Activity[];
  total:      number;
  page:       number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ActivitiesService {
  private http    = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/activities`;

  /** Returns a paginated + filtered list of activities. */
  list(query: ActivitiesQuery = {}): Observable<ActivitiesResponse> {
    let params = new HttpParams();
    if (query.type)          params = params.set('type',          query.type);
    if (query.contactId)     params = params.set('contactId',     query.contactId);
    if (query.opportunityId) params = params.set('opportunityId', query.opportunityId);
    if (query.page)          params = params.set('page',          query.page);
    if (query.limit)         params = params.set('limit',         query.limit);
    return this.http.get<ActivitiesResponse>(this.baseUrl, { params });
  }

  /** Creates a new activity. */
  create(dto: CreateActivityDto): Observable<Activity> {
    return this.http.post<Activity>(this.baseUrl, dto);
  }

  /** Updates an activity (partial). */
  update(id: number, dto: UpdateActivityDto): Observable<Activity> {
    return this.http.put<Activity>(`${this.baseUrl}/${id}`, dto);
  }

  /** Deletes an activity. */
  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}
