import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener, ViewEncapsulation, OnDestroy, ElementRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil, catchError, fromEvent, debounceTime, throttleTime } from 'rxjs';
import { Subject, interval, of, merge } from 'rxjs';
import { SessionService } from '../../services/session.service';
import { AgentProfile } from '../../interfaces/Agent';
import { AgentService, NavbarBadgeCounts } from '../../services/agent.service';
import { ToastService } from '../../services/toast.service';

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
  isActive?: boolean;
}

export interface QuickAction {
  label: string;
  icon: string;
  action: string;
  color: 'success' | 'info' | 'warning';
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class NavbarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Existing properties
  isMenuOpen = false;
  isProfileDropdownOpen = false;
  currentRoute = '';
  isMobile = false;
  isLoading = false;
  badgeUpdateInterval = 60000;

  // Auto-hide properties
  isAutoHideEnabled = false;
  isNavbarHidden = false;
  private hideTimeout: any = null;
  private lastScrollTop = 0;
  private readonly hideDelay = 3000; // 3 seconds
  private readonly isDesktop = () => window.innerWidth >= 1024;

  currentUser: { 
    name: string; 
    email: string; 
    role: string; 
    avatar?: string;
    agentId?: string;
  } = {
    name: '',
    email: '',
    role: '',
    avatar: '',
    agentId: ''
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
      icon: 'fas fa-calendar-alt',
      route: '/appoint',
      badge: 0,
      isActive: false,
    },
  ];

  quickActions: QuickAction[] = [
    { 
      label: 'Add Client', 
      icon: 'fas fa-user-plus', 
      action: 'addClient', 
      color: 'success' 
    },
    { 
      label: 'Schedule Call', 
      icon: 'fas fa-phone', 
      action: 'scheduleCall', 
      color: 'info' 
    },
    { 
      label: 'Send Message', 
      icon: 'fas fa-paper-plane', 
      action: 'sendMessage', 
      color: 'warning' 
    },
  ];
  user: any;

  constructor(
    private toastService: ToastService,    
    private router: Router,
    private sessionService: SessionService,
    private agentService: AgentService,
    private elementRef: ElementRef
  ) {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    this.initializeUser();
    this.setupRouterEvents();
    this.setupPeriodicBadgeUpdates();
    this.setupAutoHideEvents();
    
    // Initial route setup
    this.currentRoute = this.router.url;
    this.updateActiveNavigation();
    this.router.events.subscribe(event => {
    if (event instanceof NavigationEnd) {
      const saved = localStorage.getItem('user');
      this.user = saved ? JSON.parse(saved) : null;
    }
  });}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearHideTimeout();
    // Restore body scroll when component is destroyed
    document.body.style.overflow = 'auto';
  }

  // Auto-hide functionality methods
  private setupAutoHideEvents(): void {
    if (!this.isDesktop()) return;

    // Mouse events for navbar interaction
    const navbar = this.elementRef.nativeElement.querySelector('.navbar-container');
    
    fromEvent(navbar, 'mouseenter')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.showNavbar();
        this.resetHideTimer();
      });

    fromEvent(navbar, 'mouseleave')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isAutoHideEnabled) {
          this.startHideTimer();
        }
      });

    // Mouse movement at top of screen to show navbar
    fromEvent(document, 'mousemove')
      .pipe(
        throttleTime(100),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        if (this.isAutoHideEnabled && this.isNavbarHidden && event.clientY <= 5) {
          this.showNavbar();
        }
      });

    // Scroll events with debouncing
    fromEvent(window, 'scroll')
      .pipe(
        throttleTime(100),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.handleAutoHideScroll();
      });

    // Keyboard events
    fromEvent(document, 'keydown')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        if (event.key === 'Escape' && this.isNavbarHidden) {
          this.showNavbar();
        }
      });
  }

  toggleAutoHide(): void {
    if (!this.isDesktop()) return;

    if (this.isAutoHideEnabled) {
      this.disableAutoHide();
    } else {
      this.enableAutoHide();
    }
  }

  enableAutoHide(): void {
    if (!this.isDesktop()) return;

    this.isAutoHideEnabled = true;
    this.startHideTimer();
    console.log('Auto-hide enabled');
  }

  disableAutoHide(): void {
    this.isAutoHideEnabled = false;
    this.showNavbar();
    this.clearHideTimeout();
    console.log('Auto-hide disabled');
  }

  private startHideTimer(): void {
    this.clearHideTimeout();
    if (this.isAutoHideEnabled && this.isDesktop()) {
      this.hideTimeout = setTimeout(() => {
        this.hideNavbar();
      }, this.hideDelay);
    }
  }

  private clearHideTimeout(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  private resetHideTimer(): void {
    if (this.isAutoHideEnabled && this.isDesktop()) {
      this.startHideTimer();
    }
  }

  private hideNavbar(): void {
    if (!this.isAutoHideEnabled || !this.isDesktop()) return;

    const navbar = this.elementRef.nativeElement.querySelector('.navbar-container');
    if (navbar) {
      navbar.classList.add('auto-hide');
      navbar.classList.remove('show');
      this.isNavbarHidden = true;
    }
  }

  private showNavbar(): void {
    const navbar = this.elementRef.nativeElement.querySelector('.navbar-container');
    if (navbar) {
      navbar.classList.remove('auto-hide');
      navbar.classList.add('show');
      this.isNavbarHidden = false;
      this.clearHideTimeout();
    }
  }

  private handleAutoHideScroll(): void {
    if (!this.isAutoHideEnabled || !this.isDesktop()) return;

    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Show navbar when scrolling up
    if (currentScrollTop < this.lastScrollTop && this.isNavbarHidden) {
      this.showNavbar();
      this.resetHideTimer();
    }

    this.lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop;
  }

  // Method to handle navbar interaction (reset timer)
  onNavbarInteraction(): void {
    if (this.isAutoHideEnabled && this.isDesktop()) {
      this.resetHideTimer();
    }
  }
  setDefaultImage(event: Event) {
  (event.target as HTMLImageElement).src = 'assets/favicon.ico';
}


  // Existing methods with auto-hide integration
  private initializeUser(): void {
    const user: AgentProfile | null = this.sessionService.getCurrentUser();
    if (user) {
      this.currentUser = {
        name: `${user.FirstName || ''} ${user.LastName || ''}`.trim() || 'User',
        email: user.Email || '',
        role: user.Role || 'Agent',
        avatar: user.Avatar || undefined,
        agentId: user.AgentId
      };

      // Load initial badge counts
      if (user.AgentId) {
        this.loadBadgeCounts(user.AgentId);
      }
    }
  }

  private setupRouterEvents(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        this.updateActiveNavigation();
        
        // Close mobile menu on navigation
        if (this.isMobile && this.isMenuOpen) {
          this.closeMobileMenu();
        }
        
        // Close profile dropdown on navigation
        if (this.isProfileDropdownOpen) {
          this.isProfileDropdownOpen = false;
        }

        // Reset auto-hide timer on navigation
        this.onNavbarInteraction();
      });
  }

  private setupPeriodicBadgeUpdates(): void {
    // Update badges periodically
    interval(this.badgeUpdateInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.currentUser.agentId) {
          this.loadBadgeCounts(this.currentUser.agentId, false); // Silent update
        }
      });
  }

  loadBadgeCounts(agentId: string, showLoading: boolean = true): void {
    if (showLoading) {
      this.isLoading = true;
    }

    this.agentService.getNavbarBadgeCounts(agentId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Failed to load badge counts', err);
          this.isLoading = false;
          return of({
            clients: 0,
            policies: 0,
            reminders: 0,
            appointments: 0
          } as NavbarBadgeCounts);
        })
      )
      .subscribe({
        next: (counts: NavbarBadgeCounts) => {
          this.updateBadgeCounts(counts);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  @HostListener('window:resize')
  onResize(): void {
    const wasDesktop = !this.isMobile;
    this.checkScreenSize();
    const isDesktopNow = !this.isMobile;

    // If switching from desktop to mobile, disable auto-hide
    if (wasDesktop && !isDesktopNow) {
      this.disableAutoHide();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    // Close mobile menu if clicking outside
    if (this.isMenuOpen && !target.closest('.navbar-container')) {
      this.closeMobileMenu();
    }

    // Close profile dropdown if clicking outside
    if (this.isProfileDropdownOpen && !target.closest('.profile-dropdown-container')) {
      this.isProfileDropdownOpen = false;
    }

    // Reset auto-hide timer on any interaction
    this.onNavbarInteraction();
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    // Add shadow on scroll for better visual separation
    const navbar = this.elementRef.nativeElement.querySelector('.navbar-container');
    if (navbar) {
      if (window.scrollY > 10) {
        navbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      } else {
        navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }
    }
  }

  @HostListener('keydown.escape')
  onEscapePress(): void {
    if (this.isMenuOpen) {
      this.closeMobileMenu();
    }
    if (this.isProfileDropdownOpen) {
      this.isProfileDropdownOpen = false;
    }
  }

  checkScreenSize(): void {
    const newIsMobile = window.innerWidth < 1024;
    
    // If switching from mobile to desktop, close mobile menu
    if (this.isMobile && !newIsMobile && this.isMenuOpen) {
      this.closeMobileMenu();
    }
    
    this.isMobile = newIsMobile;
  }

  updateActiveNavigation(): void {
    this.navigationItems.forEach(item => {
      // More precise route matching
      if (item.route === '/dashboard') {
        item.isActive = this.currentRoute === '/' || this.currentRoute === '/dashboard';
      } else {
        item.isActive = this.currentRoute.startsWith(item.route);
      }
    });
  }

  toggleMobileMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    
    // Prevent body scroll when menu is open
    if (this.isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }

  private closeMobileMenu(): void {
    this.isMenuOpen = false;
    document.body.style.overflow = 'auto';
  }

  toggleProfileDropdown(): void {
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
    this.onNavbarInteraction();
  }

  navigateTo(route: string): void {
    // Add loading state for navigation
    const navItem = this.navigationItems.find(item => item.route === route);
    if (navItem) {
      navItem.isActive = true;
    }

    this.router.navigate([route]);
    
    if (this.isMobile) {
      this.closeMobileMenu();
    }

    // Reset auto-hide timer
    this.onNavbarInteraction();
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
        console.log('Quick action executed:', action);
    }

    if (this.isMobile) {
      this.closeMobileMenu();
    }

    // Optional: Show success message
    this.showActionFeedback(action);
    
    // Reset auto-hide timer
    this.onNavbarInteraction();
  }

  private showActionFeedback(action: string): void {
    // You can integrate with a toast service here
    console.log(`Quick action "${action}" executed successfully`);
  }

  logout(): void {
  this.toastService.confirm('Are you sure you want to logout?', ['Yes', 'No'])
    .subscribe(action => {
      if (action === 'yes') {
        this.sessionService.logout();
        this.toastService.show({
          type: 'success',
          message: 'You have been logged out successfully.'
        });
      }
      this.isProfileDropdownOpen = false;
    });
}

  goToProfile(): void {
    this.router.navigate(['/agent']);
    this.isProfileDropdownOpen = false;
    this.onNavbarInteraction();
  }

  goToSettings(): void {
    this.router.navigate(['/agent']);
    this.isProfileDropdownOpen = false;
    this.onNavbarInteraction();
  }

  getUserInitials(): string {
    if (!this.currentUser?.name) return 'U';
    
    const names = this.currentUser.name.trim().split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    
    return names
      .slice(0, 2) // Take first two names only
      .map(name => name[0])
      .join('')
      .toUpperCase();
  }

  getTotalBadgeCount(): number {
    return this.navigationItems.reduce((total, item) => total + (item.badge || 0), 0);
  }

  updateBadgeCounts(counts: NavbarBadgeCounts): void {
    // Map the counts to navigation items
    const countMap: { [key: string]: number } = {
      clients: counts.clients,
      policies: counts.policies,
      reminders: counts.reminders,
      appointments: counts.appointments
    };

    this.navigationItems.forEach(item => {
      if (countMap.hasOwnProperty(item.id)) {
        const newCount = countMap[item.id];
        
        // Only update if the count has changed to avoid unnecessary DOM updates
        if (item.badge !== newCount) {
          item.badge = newCount;
        }
      }
    });

    // Optional: Log badge updates for debugging
    console.log('Badge counts updated:', counts);
  }

  // Method to refresh badge counts manually
  refreshBadges(): void {
    if (this.currentUser.agentId) {
      this.loadBadgeCounts(this.currentUser.agentId, true);
    }
    this.onNavbarInteraction();
  }

  // Method to get badge count for a specific item
  getBadgeCount(itemId: string): number {
    const item = this.navigationItems.find(nav => nav.id === itemId);
    return item?.badge || 0;
  }

  // Method to check if an item has a badge
  hasBadge(itemId: string): boolean {
    return this.getBadgeCount(itemId) > 0;
  }

  // Method to format badge count (e.g., 99+ for counts over 99)
  formatBadgeCount(count: number): string {
    return count > 99 ? '99+' : count.toString();
  }

  // Method to get user's full name or fallback
  getDisplayName(): string {
    return this.currentUser.name || 'User';
  }

  // Method to handle avatar error (fallback to initials)
  onAvatarError(): void {
    this.currentUser.avatar = '';
  }

  // TrackBy functions for better performance
  trackByFn(index: number, item: NavigationItem): string {
    return item.id;
  }

  trackByActionFn(index: number, item: QuickAction): string {
    return item.action;
  }

  // Additional utility methods

  // Method to handle keyboard navigation for dropdowns
  onKeyDown(event: KeyboardEvent, action: () => void): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  // Method to get active navigation item
  getActiveNavigationItem(): NavigationItem | undefined {
    return this.navigationItems.find(item => item.isActive);
  }

  // Method to check if there are any unread notifications
  hasUnreadNotifications(): boolean {
    return this.getTotalBadgeCount() > 0;
  }

  // Method to get notification count text for accessibility
  getNotificationAriaLabel(): string {
    const count = this.getTotalBadgeCount();
    if (count === 0) {
      return 'Notifications';
    }
    return `Notifications (${count} unread)`;
  }

  // Method to handle focus management
  focusFirstMenuItem(): void {
    const firstMenuItem = document.querySelector('.profile-menu-item') as HTMLElement;
    if (firstMenuItem) {
      firstMenuItem.focus();
    }
  }

  // Method to check if the navbar should show loading state
  isNavigationLoading(): boolean {
    return this.isLoading;
  }

  // Method to handle route change with loading state
  navigateWithLoading(route: string): void {
    this.isLoading = true;
    this.navigateTo(route);
    
    // Reset loading state after navigation
    setTimeout(() => {
      this.isLoading = false;
    }, 500);
  }

  // Method to get current user role with fallback
  getUserRole(): string {
    return this.currentUser.role || 'Agent';
  }

  // Method to check if user is admin
  isAdmin(): boolean {
    return this.getUserRole().toLowerCase() === 'admin';
  }

  // Method to handle responsive design changes
  private handleResponsiveChanges(): void {
    // Additional responsive logic can be added here
    if (this.isMobile && this.isProfileDropdownOpen) {
      this.isProfileDropdownOpen = false;
    }
  }

  // Method to validate user session
  private validateUserSession(): boolean {
    const user = this.sessionService.getCurrentUser();
    return user !== null && user.AgentId !== undefined;
  }

  // Method to handle network errors gracefully
  private handleNetworkError(error: any): void {
    console.error('Network error in navbar:', error);
    // You can add toast notification here
  }

  // Method to cleanup event listeners and subscriptions
  private cleanup(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.body.style.overflow = 'auto';
    this.clearHideTimeout();
  }
}