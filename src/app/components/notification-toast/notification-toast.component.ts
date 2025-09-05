import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="toast-container" 
      [class.show]="currentToast !== null"
      [class.center]="currentToast?.center"
    >
      <div 
        *ngIf="currentToast" 
        class="toast"
        [ngClass]="getToastClass()"
        [@slideIn]
      >
        <!-- Toast Header -->
        <div class="toast-header">
          <div class="toast-icon">
            <i class="fas" [ngClass]="getIconClass()"></i>
          </div>
          <div class="toast-content">
            <div class="toast-title" *ngIf="currentToast.title">
              {{ currentToast.title }}
            </div>
            <div class="toast-message">
              {{ currentToast.message }}
            </div>
          </div>
          <button 
            class="toast-close" 
            (click)="closeToast()"
            *ngIf="!currentToast.actions || currentToast.actions.length === 0"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Toast Actions -->
        <div class="toast-actions" *ngIf="currentToast.actions && currentToast.actions.length > 0">
          <button
            *ngFor="let action of currentToast.actions"
            class="toast-btn"
            [ngClass]="getActionButtonClass(action.style)"
            (click)="onActionClick(action)"
          >
            {{ action.label }}
          </button>
        </div>

        <!-- Progress Bar (for timed toasts) -->
        <div 
          class="toast-progress"
          *ngIf="currentToast.duration && currentToast.duration > 0"
          [style.animation-duration.ms]="currentToast.duration"
        ></div>
      </div>
    </div>
  `,
  styleUrls: ['./notification-toast.component.css'],
  animations: [
    // You can add Angular animations here if needed
  ]
})
export class ToastComponent implements OnInit, OnDestroy {
  currentToast: ToastMessage | null = null;
  private subscription = new Subscription();

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.toastService.toastState.subscribe(toast => {
        this.currentToast = toast;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getToastClass(): string {
    if (!this.currentToast) return '';
    return `toast-${this.currentToast.type}`;
  }

  getIconClass(): string {
    if (!this.currentToast) return '';
    
    const iconMap = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle',
      reminder: 'fa-bell',
      confirm: 'fa-question-circle'
    };
    
    return iconMap[this.currentToast.type] || 'fa-info-circle';
  }

  getActionButtonClass(style?: string): string {
    const baseClass = 'toast-btn';
    switch (style) {
      case 'primary':
        return `${baseClass} toast-btn-primary`;
      case 'danger':
        return `${baseClass} toast-btn-danger`;
      case 'secondary':
      default:
        return `${baseClass} toast-btn-secondary`;
    }
  }

  onActionClick(action: any): void {
    if (action.action) {
      action.action();
    }
  }

  closeToast(): void {
    this.toastService.close();
  }
}