import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
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
          opacity: 0 
        }),
        animate('300ms ease-in', style({ 
          transform: 'translateX(0%)', 
          opacity: 1 
        }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ 
          transform: 'translateX(100%)', 
          opacity: 0 
        }))
      ])
    ])
  ]
})
export class NotificationToastComponent {
  toast: ToastMessage | null = null;
  private toastTimer: any; // Auto-close timer

  constructor(private toastService: ToastService) {
    this.toastService.toastState.subscribe((toast) => {
      console.log('🔔 Toast received:', toast);
      this.toast = toast;
      
      // Clear existing timer
      if (this.toastTimer) {
        clearTimeout(this.toastTimer);
        this.toastTimer = null;
      }

      // Set auto-close timer if duration is specified
      if (toast && toast.duration && toast.duration > 0) {
        console.log('⏰ Setting auto-close timer for', toast.duration, 'ms');
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
  onClose(value: string = 'close') {
    console.log('❌ Closing toast with value:', value);
    
    // Clear timer if exists
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    
    // Close the toast
    this.toastService.close(value);
  }

  /**
   * Handle action button clicks
   */
  onAction(action: ToastAction) {
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
  onMouseEnter() {
    if (this.toastTimer) {
      console.log('⏸️ Pausing auto-close on hover');
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }

  /**
   * Resume auto-close when user stops hovering
   */
  onMouseLeave() {
    if (this.toast && this.toast.duration && this.toast.duration > 0 && !this.toastTimer) {
      console.log('▶️ Resuming auto-close after hover');
      this.toastTimer = setTimeout(() => {
        this.onClose();
      }, 2000); // Resume with shorter duration
    }
  }

  /**
   * Handle keyboard events for accessibility
   */
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      console.log('⌨️ ESC key pressed - closing toast');
      this.onClose('escape');
    }
  }

  /**
   * Get CSS classes for toast styling
   */
  getToastClasses(): string[] {
    const classes = ['toast-card'];
    
    if (this.toast) {
      classes.push(this.toast.type);
      
      if (this.toast.center) {
        classes.push('toast-center');
      }
      
      if (this.toast.actions && this.toast.actions.length > 0) {
        classes.push('toast-with-actions');
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
    const classes = ['toast-btn'];
    
    if (action.style) {
      classes.push(`toast-btn-${action.style}`);
    } else {
      classes.push('toast-btn-primary');
    }
    
    return classes;
  }

  /**
   * Cleanup on component destroy
   */
  ngOnDestroy() {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }
}