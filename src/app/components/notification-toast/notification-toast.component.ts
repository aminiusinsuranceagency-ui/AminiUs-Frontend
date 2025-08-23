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
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class NotificationToastComponent {
  toast: ToastMessage | null = null;

  constructor(private toastService: ToastService) {
    this.toastService.toastState.subscribe((toast) => {
      this.toast = toast;
       if (toast && toast.duration) {
      setTimeout(() => this.onClose(), toast.duration);
    }

    });
  }

  onClose(value: string = 'close') {
    this.toastService.close(value);
  }

  onAction(action: ToastAction) {
    if (action.action) {
      action.action();   // ✅ only call if defined
    }
    this.toastService.close(action.label); // still close & return label as value
  }
}
