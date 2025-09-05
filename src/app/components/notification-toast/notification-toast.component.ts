import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, OnDestroy } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { ToastMessage, ToastAction } from '../../services/toast.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-toast.component.html',
  styleUrls: ['./notification-toast.component.css'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ 
          transform: 'translateX(100%)', 
          opacity: 0,
          scale: 0.95
        }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
          transform: 'translateX(0%)', 
          opacity: 1,
          scale: 1
        }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
          transform: 'translateX(100%)', 
          opacity: 0,
          scale: 0.95
        }))
      ])
    ]),
    trigger('centerFade', [
      transition(':enter', [
        style({ 
          opacity: 0,
          scale: 0.9,
          transform: 'translateY(-20px)'
        }),
        animate('350ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
          opacity: 1,
          scale: 1,
          transform: 'translateY(0)'
        }))
      ]),
      transition(':leave', [
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
          opacity: 0,
          scale: 0.9,
          transform: 'translateY(-20px)'
        }))
      ])
    ])
  ]
})
export class NotificationToastComponent implements OnDestroy {
  toast: ToastMessage | null = null;
  private toastTimer: any;
  private progressTimer: any;
  showProgress = false;

  constructor(private toastService: ToastService) {
    this.toastService.toastState.subscribe((toast) => {
      console.log('🔔 Toast received:', toast);
      this.toast = toast;
      this.showProgress = false;
      
      // Clear existing timers
      this.clearTimers();

      // Set auto-close timer if duration is specified
      if (toast && toast.duration && toast.duration > 0) {
        console.log('⏰ Setting auto-close timer for', toast.duration, 'ms');
        this.showProgress = true;
        
        this.toastTimer = setTimeout(() => {
          console.log('⏰ Auto-closing toast');
          this.onClose();
        }, toast.duration);
      }
    });
  }

  /**
   * Handle close button click or auto-close
   */
  onClose(value: string = 'close'): void {
    console.log('❌ Closing toast with value:', value);
    
    this.clearTimers();
    this.toastService.close(value);
  }

  /**
   * Handle action button clicks
   */
  onAction(action: ToastAction): void {
    console.log('🎯 Action clicked:', action.label);
    
    // Execute the action if defined
    if (action.action) {
      try {
        action.action();
        console.log('✅ Action executed successfully');
      } catch (error) {
        console.error('❌ Error executing action:', error);
      }
    }
    
    // Close the toast and return the action label as the result
    this.toastService.close(action.label.toLowerCase());
  }

  /**
   * Stop auto-close when user hovers over toast
   */
  onMouseEnter(): void {
    if (this.toastTimer) {
      console.log('⏸️ Pausing auto-close on hover');
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
      this.showProgress = false;
    }
  }

  /**
   * Resume auto-close when user stops hovering
   */
  onMouseLeave(): void {
    if (this.toast && this.toast.duration && this.toast.duration > 0 && !this.toastTimer) {
      console.log('▶️ Resuming auto-close after hover');
      this.showProgress = true;
      this.toastTimer = setTimeout(() => {
        this.onClose();
      }, 2000); // Resume with shorter duration
    }
  }

  /**
   * Handle keyboard events for accessibility
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      console.log('⌨️ ESC key pressed - closing toast');
      this.onClose('escape');
    }
  }

  /**
   * Get CSS classes for toast styling
   */
  getToastClasses(): string[] {
    const classes = ['aminus-toast'];
    
    if (this.toast) {
      classes.push(`toast-${this.toast.type}`);
      
      if (this.toast.center) {
        classes.push('toast-center');
      }
      
      if (this.toast.actions && this.toast.actions.length > 0) {
        classes.push('toast-with-actions');
      }

      if (this.showProgress && this.toast.duration) {
        classes.push('toast-with-progress');
      }
    }
    
    return classes;
  }

  /**
   * Get icon class based on toast type
   */
  getIconClass(): string {
    if (!this.toast) return 'fa-info-circle';
    
    const iconMap = {
      'success': 'fa-check-circle',
      'error': 'fa-times-circle',
      'warning': 'fa-exclamation-triangle',
      'info': 'fa-info-circle',
      'reminder': 'fa-bell',
      'confirm': 'fa-question-circle'
    };
    
    return iconMap[this.toast.type] || 'fa-info-circle';
  }

  /**
   * Check if toast should show close button
   */
  shouldShowCloseButton(): boolean {
    return this.toast?.type !== 'confirm';
  }

  /**
   * Get button style classes
   */
  getButtonClass(action: ToastAction): string[] {
    const classes = ['aminus-btn'];
    
    if (action.style) {
      classes.push(`btn-${action.style}`);
    } else {
      classes.push('btn-primary');
    }
    
    return classes;
  }

  /**
   * Get toast container classes
   */
  getContainerClasses(): string[] {
    const classes = ['aminus-toast-container'];
    
    if (this.toast?.center) {
      classes.push('container-center');
    }
    
    return classes;
  }

  /**
   * Get animation type based on position
   */
  getAnimationType(): string {
    return this.toast?.center ? 'centerFade' : 'slideIn';
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    if (this.progressTimer) {
      clearTimeout(this.progressTimer);
      this.progressTimer = null;
    }
  }

  /**
   * Cleanup on component destroy
   */
  ngOnDestroy(): void {
    this.clearTimers();
  }
}