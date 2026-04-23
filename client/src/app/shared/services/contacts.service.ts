import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Contact, ContactsPage, ContactsQuery,
  CreateContactDto, UpdateContactDto,
} from '../../core/models/contact.model';

@Injectable({ providedIn: 'root' })
export class ContactsService {
  private http    = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/contacts`;

  /** Returns a paginated, filtered list of contacts. */
  list(query: ContactsQuery = {}): Observable<ContactsPage> {
    let params = new HttpParams();
    if (query.page)   params = params.set('page',   query.page);
    if (query.limit)  params = params.set('limit',  query.limit);
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);
    return this.http.get<ContactsPage>(this.baseUrl, { params });
  }

  /** Returns a single contact by id. */
  findById(id: number): Observable<Contact> {
    return this.http.get<Contact>(`${this.baseUrl}/${id}`);
  }

  /** Creates a new contact. */
  create(dto: CreateContactDto): Observable<Contact> {
    return this.http.post<Contact>(this.baseUrl, dto);
  }

  /** Updates a contact. */
  update(id: number, dto: UpdateContactDto): Observable<Contact> {
    return this.http.put<Contact>(`${this.baseUrl}/${id}`, dto);
  }

  /** Deletes a contact. */
  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}
