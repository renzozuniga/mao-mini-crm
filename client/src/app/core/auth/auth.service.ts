import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { TokenService } from './token.service';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface AuthResponse {
  user: UserProfile;
  access: string;
  refresh: string;
}

export interface LoginPayload    { email: string; password: string; }
export interface RegisterPayload { email: string; password: string; fullName: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http         = inject(HttpClient);
  private tokenService = inject(TokenService);
  private router       = inject(Router);

  readonly currentUser = signal<UserProfile | null>(null);

  /** Attempt to restore the session from localStorage on app startup. */
  restoreSession(): void {
    if (!this.tokenService.hasToken()) return;
    this.http.get<UserProfile>(`${environment.apiUrl}/auth/me`).subscribe({
      next:  user  => this.currentUser.set(user),
      error: ()    => this.tokenService.clear(),
    });
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload)
      .pipe(tap(res => this.handleAuth(res)));
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(tap(res => this.handleAuth(res)));
  }

  logout(): void {
    this.tokenService.clear();
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  private handleAuth(res: AuthResponse): void {
    this.tokenService.setTokens(res.access, res.refresh);
    this.currentUser.set(res.user);
    this.router.navigate(['/dashboard']);
  }
}
