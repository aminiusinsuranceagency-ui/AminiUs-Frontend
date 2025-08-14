import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener, ViewEncapsulation } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SessionService } from '../../services/session.service';
import { AgentProfile } from '../../interfaces/Agent';
import { AgentService, NavbarBadgeCounts } from '../../services/agent.service';

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
  isActive?: boolean;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class NavbarComponent implements OnInit {
  isMenuOpen = false;
  isProfileDropdownOpen = false;
  currentRoute = '';
  isMobile = false;

  currentUser: { name: string; email: string; role: string; avatar?: string } = {
    name: '',
    email: '',
    role: '',
    avatar: ''
  };

  navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'fas fa-home',
      route: '/dashboard',
      isActive: false,
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: 'fas fa-users',
      route: '/client',
      badge: 0,
      isActive: false,
    },
    {
      id: 'policies',
      label: 'Policies',
      icon: 'fas fa-shield-alt',
      route: '/policies',
      badge: 0,
      isActive: false,
    },
    {
      id: 'reminders',
      label: 'Reminders',
      icon: 'fas fa-bell',
      route: '/Reminders',
      badge: 0,
      isActive: false,
    },
    {
      id: 'appointments',
      label: 'Appointments',
      icon: 'fas fa-envelope',
      route: '/appoint',
      badge: 0,
      isActive: false,
    },
  ];

  quickActions = [
    { label: 'Add Client', icon: 'fas fa-user-plus', action: 'addClient', color: 'success' },
    { label: 'Schedule Call', icon: 'fas fa-phone', action: 'scheduleCall', color: 'info' },
    { label: 'Send Message', icon: 'fas fa-paper-plane', action: 'sendMessage', color: 'warning' },
  ];

  constructor(
    private router: Router,
    private sessionService: SessionService,
    private AgentService: AgentService
  ) {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    const user: AgentProfile | null = this.sessionService.getCurrentUser();
    if (user) {
      this.currentUser = {
        name: `${user.FirstName} ${user.LastName}`,
        email: user.Email,
        role: user.Role || 'Agent',
        avatar: user.Avatar || undefined,
      };

      // Fetch badge counts from backend
      if (user.AgentId) {
        this.loadBadgeCounts(user.AgentId);
      }
    }

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        this.updateActiveNavigation();
      });

    this.currentRoute = this.router.url;
    this.updateActiveNavigation();
  }

  loadBadgeCounts(agentId: string) {
    this.AgentService.getNavbarBadgeCounts(agentId).subscribe({
      next: (counts: NavbarBadgeCounts) => {
        this.updateBadgeCounts({
          clients: counts.clients,
          policies: counts.policies,
          reminders: counts.reminders,
          appointments: counts.appointments
        });
      },
      error: (err) => {
        console.error('Failed to load badge counts', err);
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    if (this.isMenuOpen && !target.closest('.navbar-container')) {
      this.isMenuOpen = false;
    }

    if (this.isProfileDropdownOpen && !target.closest('.profile-dropdown-container')) {
      this.isProfileDropdownOpen = false;
    }
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile) {
      this.isMenuOpen = false;
    }
  }

  updateActiveNavigation(): void {
    this.navigationItems.forEach(item => {
      item.isActive = this.currentRoute.startsWith(item.route);
    });
  }

  toggleMobileMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleProfileDropdown(): void {
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    if (this.isMobile) {
      this.isMenuOpen = false;
    }
  }

  executeQuickAction(action: string): void {
    switch (action) {
      case 'addClient':
        this.router.navigate(['/client'], { queryParams: { action: 'add' } });
        break;
      case 'scheduleCall':
        this.router.navigate(['/Reminders'], { queryParams: { action: 'add', type: 'call' } });
        break;
      case 'sendMessage':
        this.router.navigate(['/messages'], { queryParams: { action: 'compose' } });
        break;
      default:
        console.log('Quick action:', action);
    }

    if (this.isMobile) {
      this.isMenuOpen = false;
    }
  }

  logout(): void {
    this.sessionService.logout();
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
    this.isProfileDropdownOpen = false;
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
    this.isProfileDropdownOpen = false;
  }

  getUserInitials(): string {
    if (!this.currentUser?.name) return '';
    return this.currentUser.name
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase();
  }

  getTotalBadgeCount(): number {
    return this.navigationItems.reduce((total, item) => total + (item.badge || 0), 0);
  }

  updateBadgeCounts(counts: { [key: string]: number }): void {
    this.navigationItems.forEach(item => {
      if (counts[item.id] !== undefined) {
        item.badge = counts[item.id];
      }
    });
  }
}
