import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Opportunity, CreateOpportunityDto, UpdateOpportunityDto,
} from '../../core/models/opportunity.model';

@Injectable({ providedIn: 'root' })
export class OpportunitiesService {
  private http    = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/opportunities`;

  /** Returns all opportunities for the current user, ordered by value desc. */
  list(): Observable<Opportunity[]> {
    return this.http.get<Opportunity[]>(this.baseUrl);
  }

  /** Creates a new opportunity. */
  create(dto: CreateOpportunityDto): Observable<Opportunity> {
    return this.http.post<Opportunity>(this.baseUrl, dto);
  }

  /** Updates an opportunity (supports partial updates including stage moves). */
  update(id: number, dto: UpdateOpportunityDto): Observable<Opportunity> {
    return this.http.put<Opportunity>(`${this.baseUrl}/${id}`, dto);
  }

  /** Deletes an opportunity. */
  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}
