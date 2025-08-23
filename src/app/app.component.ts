import { Component } from '@angular/core';
import { NavigationEnd, RouterOutlet } from '@angular/router';
import { NavbarComponent } from "./components/navbar/navbar.component";
import { Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NotificationToastComponent } from "./components/notification-toast/notification-toast.component";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone:true,
  imports: [RouterOutlet, NavbarComponent, NotificationToastComponent,CommonModule,FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'AminiUs';
   currentUrl: string = '';

  constructor(private router: Router) {
  this.currentUrl = this.router.url; // ✅ set initial route

  this.router.events
    .pipe(filter(event => event instanceof NavigationEnd))
    .subscribe((event: any) => {
      this.currentUrl = event.urlAfterRedirects;
    });
}

 shouldShowNavbar(): boolean {
  console.log('Current URL:', this.currentUrl); // 👀 debug
  return !this.currentUrl.startsWith('/login');
}

}