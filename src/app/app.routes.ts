import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { ClientsComponent } from './components/clients/clients.component';
import { RemindersComponent } from './components/reminders/reminders.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SettingsComponent } from './components/settings/settings.component';
import { AppointmentsComponent } from './components/appointments/appointments.component';
import { PoliciesComponent } from './components/policies/policies.component';
import { DailyNotesComponent } from './components/daily-notes/daily-notes.component';
import { NotificationToastComponent } from './components/notification-toast/notification-toast.component';

export const routes: Routes = [
   { path: 'login', component: AuthComponent },
   { path: 'client', component: ClientsComponent },
   { path: 'Reminders', component: RemindersComponent },
   { path: 'dashboard', component: DashboardComponent },
   { path: 'settings', component: SettingsComponent },
   { path: 'appoint', component: AppointmentsComponent },
   { path: 'policies', component: PoliciesComponent },
   { path: 'notes', component: DailyNotesComponent },
   { path: '', component: DashboardComponent },
    { path: 'toast',component:NotificationToastComponent}



];
