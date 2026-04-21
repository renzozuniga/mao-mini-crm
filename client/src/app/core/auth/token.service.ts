import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly ACCESS_KEY  = 'crm_access';
  private readonly REFRESH_KEY = 'crm_refresh';

  getAccess():  string | null { return localStorage.getItem(this.ACCESS_KEY);  }
  getRefresh(): string | null { return localStorage.getItem(this.REFRESH_KEY); }

  /** Store both tokens after a successful login or register. */
  setTokens(access: string, refresh: string): void {
    localStorage.setItem(this.ACCESS_KEY,  access);
    localStorage.setItem(this.REFRESH_KEY, refresh);
  }

  /** Remove all stored tokens (logout). */
  clear(): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }

  hasToken(): boolean { return !!this.getAccess(); }
}
