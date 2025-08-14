// // src/app/services/auth.service.ts
// import { Injectable } from '@angular/core';
// import { BehaviorSubject } from 'rxjs';
// import { Router } from '@angular/router';
// import { agent } from '../interfaces/mock-data'; // Path to your mock data

// export interface AuthUser {
//   id: string;
//   name: string;
//   email: string;
//   role: string;
//   token: string;
//   tokenExpirationDate: Date;
// }

// @Injectable({
//   providedIn: 'root',
// })
// export class AuthService {
//   private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
//   currentUser$ = this.currentUserSubject.asObservable();

//   private logoutTimer: any;

//   constructor(private router: Router) {
//     this.autoLogin();
//   }

//   login(email: string, password: string, sessionDurationMinutes: number = 10): boolean {
//   if (agent.email === email && agent.password === password) {
//     const tokenExpirationDate = new Date(new Date().getTime() + sessionDurationMinutes * 60000);

//     const user: AuthUser = {
//       id: agent.id,
//       name: agent.name,
//       email: agent.email,
//       role: agent.role,
//       token: this.generateMockToken(),
//       tokenExpirationDate,
//     };

//     this.currentUserSubject.next(user);
//     localStorage.setItem('userData', JSON.stringify(user));
//     this.autoLogout(sessionDurationMinutes * 60000);
//     return true;
//   }

//   return false;
// }

//   logout(): void {
//     this.currentUserSubject.next(null);
//     localStorage.removeItem('userData');
//     if (this.logoutTimer) clearTimeout(this.logoutTimer);
//     this.router.navigate(['/login']);
//   }

//   autoLogin(): void {
//     const storedUserData = localStorage.getItem('userData');
//     if (!storedUserData) return;

//     const parsedUser: AuthUser = JSON.parse(storedUserData);
//     const expirationDate = new Date(parsedUser.tokenExpirationDate);

//     if (expirationDate <= new Date()) {
//       this.logout();
//     } else {
//       this.currentUserSubject.next(parsedUser);
//       const timeLeft = expirationDate.getTime() - new Date().getTime();
//       this.autoLogout(timeLeft);
//     }
//   }

//   autoLogout(expirationDuration: number): void {
//     this.logoutTimer = setTimeout(() => {
//       this.logout();
//     }, expirationDuration);
//   }

//   isAuthenticated(): boolean {
//     return !!this.currentUserSubject.value;
//   }

//   private generateMockToken(): string {
//     return 'mock-token-' + Math.random().toString(36).substring(2);
//   }
// }
