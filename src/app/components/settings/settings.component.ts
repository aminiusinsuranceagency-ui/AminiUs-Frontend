// settings.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from "../navbar/navbar.component";

export interface PolicyCatalog {
  id: string;
  name: string;
  type: string;
  companyName: string;
  notes?: string;
}

export interface ReminderSettings {
  id: string;
  type: 'Call' | 'Visit' | 'Policy Expiry' | 'Birthday' | 'Appointment';
  enabled: boolean;
  daysBefore: number;
  timeOfDay: string;
  repeatDaily: boolean;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  licenseNumber: string;
  avatar?: string;
}

@Component({
  selector: 'app-settings',
  standalone:true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class SettingsComponent implements OnInit {
  activeTab: 'policies' | 'reminders' | 'notifications' | 'profile' | 'general' = 'policies';
  darkMode = false;
  
  // Policy Catalog Management
  policyCatalog: PolicyCatalog[] = [
    {
      id: '1',
      name: 'Comprehensive Motor Cover',
      type: 'Motor',
      companyName: 'Jubilee Insurance',
      notes: 'Full coverage including theft and accidents'
    },
    {
      id: '2',
      name: 'Third Party Motor Cover',
      type: 'Motor',
      companyName: 'Britam',
      notes: 'Basic third party coverage'
    },
    {
      id: '3',
      name: 'Life Insurance Premium',
      type: 'Life',
      companyName: 'Old Mutual',
      notes: 'Term life insurance policy'
    }
  ];

  // Reminder Settings
  reminderSettings: ReminderSettings[] = [
    {
      id: '1',
      type: 'Policy Expiry',
      enabled: true,
      daysBefore: 30,
      timeOfDay: '09:00',
      repeatDaily: false
    },
    {
      id: '2',
      type: 'Birthday',
      enabled: true,
      daysBefore: 1,
      timeOfDay: '08:00',
      repeatDaily: false
    },
    {
      id: '3',
      type: 'Appointment',
      enabled: true,
      daysBefore: 1,
      timeOfDay: '18:00',
      repeatDaily: false
    },
    {
      id: '4',
      type: 'Call',
      enabled: true,
      daysBefore: 0,
      timeOfDay: '10:00',
      repeatDaily: true
    }
  ];

  // Notification Settings
  notificationSettings: NotificationSettings = {
    emailNotifications: true,
    smsNotifications: true,
    whatsappNotifications: true,
    pushNotifications: true,
    soundEnabled: true
  };

  // User Profile
  userProfile: UserProfile = {
    firstName: 'Stephen',
    lastName: 'Mutwiwi',
    email: 'stephen.mutwiwi@aminus.com',
    phone: '+254 700 123 456',
    company: 'Independent Agent',
    licenseNumber: 'INS2024001'
  };

  // Form states
  showAddPolicyForm = false;
  editingPolicy: PolicyCatalog | null = null;
  editingReminder: ReminderSettings | null = null;
  showProfileEdit = false;

  newPolicy: Partial<PolicyCatalog> = {};
  insuranceCompanies = ['Jubilee Insurance', 'Britam', 'Old Mutual', 'AAR Insurance', 'CIC Insurance'];
  policyTypes = ['Motor', 'Life', 'Health', 'Travel', 'Property', 'Marine'];

  constructor() { }

  ngOnInit(): void {
    // Load settings from localStorage or service
    this.loadSettings();
  }

  // Tab Management
  setActiveTab(tab: 'policies' | 'reminders' | 'notifications' | 'profile' | 'general'): void {
    this.activeTab = tab;
  }

  // Policy Catalog Management
  addPolicy(): void {
    if (this.newPolicy.name && this.newPolicy.type && this.newPolicy.companyName) {
      const policy: PolicyCatalog = {
        id: Date.now().toString(),
        name: this.newPolicy.name,
        type: this.newPolicy.type,
        companyName: this.newPolicy.companyName,
        notes: this.newPolicy.notes || ''
      };
      
      this.policyCatalog.push(policy);
      this.resetPolicyForm();
      this.saveSettings();
    }
  }

  editPolicy(policy: PolicyCatalog): void {
    this.editingPolicy = { ...policy };
  }

  updatePolicy(): void {
    if (this.editingPolicy) {
      const index = this.policyCatalog.findIndex(p => p.id === this.editingPolicy!.id);
      if (index !== -1) {
        this.policyCatalog[index] = { ...this.editingPolicy };
        this.editingPolicy = null;
        this.saveSettings();
      }
    }
  }

  deletePolicy(policyId: string): void {
    if (confirm('Are you sure you want to delete this policy from the catalog?')) {
      this.policyCatalog = this.policyCatalog.filter(p => p.id !== policyId);
      this.saveSettings();
    }
  }

  resetPolicyForm(): void {
    this.newPolicy = {};
    this.showAddPolicyForm = false;
  }

  // Reminder Settings Management
  updateReminderSetting(reminder: ReminderSettings): void {
    const index = this.reminderSettings.findIndex(r => r.id === reminder.id);
    if (index !== -1) {
      this.reminderSettings[index] = { ...reminder };
      this.saveSettings();
    }
  }

  toggleReminder(reminderId: string): void {
    const reminder = this.reminderSettings.find(r => r.id === reminderId);
    if (reminder) {
      reminder.enabled = !reminder.enabled;
      this.saveSettings();
    }
  }

  // Notification Settings
  updateNotificationSettings(): void {
    this.saveSettings();
  }

  // Profile Management
  toggleProfileEdit(): void {
    this.showProfileEdit = !this.showProfileEdit;
  }

  updateProfile(): void {
    // In real app, this would call a service to update profile
    this.showProfileEdit = false;
    this.saveSettings();
  }

  // General Settings
  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    // Apply dark mode logic here
    document.body.classList.toggle('dark-mode', this.darkMode);
    this.saveSettings();
  }

  exportData(): void {
    // Export functionality
    const data = {
      policyCatalog: this.policyCatalog,
      reminderSettings: this.reminderSettings,
      notificationSettings: this.notificationSettings
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'aminus_settings_backup.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  importData(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.policyCatalog) this.policyCatalog = data.policyCatalog;
          if (data.reminderSettings) this.reminderSettings = data.reminderSettings;
          if (data.notificationSettings) this.notificationSettings = data.notificationSettings;
          this.saveSettings();
          alert('Settings imported successfully!');
        } catch (error) {
          alert('Error importing settings. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  }

  // Storage Management
  private loadSettings(): void {
    // Load from localStorage or service
    const savedSettings = localStorage.getItem('aminus_settings');
    if (savedSettings) {
      try {
        const data = JSON.parse(savedSettings);
        if (data.policyCatalog) this.policyCatalog = data.policyCatalog;
        if (data.reminderSettings) this.reminderSettings = data.reminderSettings;
        if (data.notificationSettings) this.notificationSettings = data.notificationSettings;
        if (data.darkMode !== undefined) this.darkMode = data.darkMode;
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }

  private saveSettings(): void {
    // Save to localStorage or service
    const settings = {
      policyCatalog: this.policyCatalog,
      reminderSettings: this.reminderSettings,
      notificationSettings: this.notificationSettings,
      darkMode: this.darkMode
    };
    localStorage.setItem('aminus_settings', JSON.stringify(settings));
  }
}