import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface ToastAction {
  label: string;
  action?: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface ToastMessage {
  type: 'success' | 'error' | 'info' | 'warning' | 'reminder' | 'confirm';
  title?: string;
  message: string;
  actions?: ToastAction[];   // buttons like OK, Close, Yes, No
  duration?: number;         // auto close after X ms
  center?: boolean;          // appear in center instead of corner
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastSubject = new Subject<ToastMessage | null>();
  toastState = this.toastSubject.asObservable();

  private actionSubject = new Subject<string>();
  action$ = this.actionSubject.asObservable();

  private toastTimer: any; // track timeout

  /** Show a toast */
  show(toast: ToastMessage) {
    this.toastSubject.next(toast);

    // ✅ handle auto-close duration
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    if (toast.duration && toast.duration > 0) {
      this.toastTimer = setTimeout(() => this.close(), toast.duration);
    }
  }

  /** Close toast manually */
  close(actionValue: string = 'close') {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.toastSubject.next(null);
    this.actionSubject.next(actionValue);
  }

  /** 🔹 Show a confirm toast with buttons */
  confirm(message: string, actions: string[] = ['Yes', 'No']): Observable<string> {
    const actionSubject = new Subject<string>();

    this.toastSubject.next({
      type: 'confirm',
      message,
      center: true,
      actions: actions.map((label, i) => ({
        label,
        style: i === 0 ? 'primary' : 'secondary',
        action: () => {
          actionSubject.next(label.toLowerCase());
          this.close(label.toLowerCase());
        }
      }))
    });

    return actionSubject.asObservable();
  }
}
