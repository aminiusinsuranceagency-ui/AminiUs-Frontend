// src/services/RemindersService.ts
import axios from "axios";
import {
    Reminder,
    ReminderSettings,
    CreateReminderRequest,
    UpdateReminderRequest,
    ReminderFilters,
    PaginatedReminderResponse,
    BirthdayReminder,
    PolicyExpiryReminder,
    PhoneValidationResult
} from "../interfaces/Reminder";
import { Injectable } from "@angular/core";

const API_BASE = `http://localhost:3000/api/reminders`;
@Injectable({
  providedIn: 'root'
})
export class RemindersService {
    // Create reminder
    static async create(agentId: string, data: CreateReminderRequest): Promise<Reminder> {
        const res = await axios.post(`${API_BASE}/${agentId}`, data);
        return res.data;
    }

    // Get all reminders with filters
    static async getAll(agentId: string, filters?: ReminderFilters): Promise<PaginatedReminderResponse> {
        const res = await axios.get(`${API_BASE}/${agentId}`, { params: filters });
        return res.data;
    }

    // Get reminder by ID
    static async getById(agentId: string, reminderId: string): Promise<Reminder> {
        const res = await axios.get(`${API_BASE}/${agentId}/${reminderId}`);
        return res.data;
    }

    // Update reminder
    static async update(agentId: string, reminderId: string, data: UpdateReminderRequest) {
        const res = await axios.put(`${API_BASE}/${agentId}/${reminderId}`, data);
        return res.data;
    }

    // Delete reminder
    static async delete(agentId: string, reminderId: string) {
        const res = await axios.delete(`${API_BASE}/${agentId}/${reminderId}`);
        return res.data;
    }

    // Complete reminder
    static async complete(agentId: string, reminderId: string, notes?: string) {
        const res = await axios.post(`${API_BASE}/${agentId}/${reminderId}/complete`, { notes });
        return res.data;
    }

    // Lists
    static async getToday(agentId: string): Promise<Reminder[]> {
        const res = await axios.get(`${API_BASE}/${agentId}/today`);
        return res.data;
    }

    static async getUpcoming(agentId: string, daysAhead: number = 7): Promise<Reminder[]> {
        const res = await axios.get(`${API_BASE}/${agentId}/upcoming`, { params: { daysAhead } });
        return res.data;
    }

    static async getCompleted(agentId: string, startDate?: Date, endDate?: Date, pageSize: number = 50, pageNumber: number = 1) {
        const params: any = { pageSize, pageNumber };
        if (startDate) params.startDate = startDate.toISOString();
        if (endDate) params.endDate = endDate.toISOString();
        const res = await axios.get(`${API_BASE}/${agentId}/completed`, { params });
        return res.data;
    }

    static async getBirthdays(agentId: string): Promise<BirthdayReminder[]> {
        const res = await axios.get(`${API_BASE}/${agentId}/birthdays`);
        return res.data;
    }

    static async getPolicyExpiries(agentId: string, daysAhead: number = 30): Promise<PolicyExpiryReminder[]> {
        const res = await axios.get(`${API_BASE}/${agentId}/policy-expiries`, { params: { daysAhead } });
        return res.data;
    }

    // Settings
    static async getSettings(agentId: string): Promise<ReminderSettings[]> {
        const res = await axios.get(`${API_BASE}/${agentId}/settings`);
        return res.data;
    }

    static async updateSettings(agentId: string, settings: ReminderSettings) {
        const res = await axios.put(`${API_BASE}/${agentId}/settings`, settings);
        return res.data;
    }

    // Utility
    static async stats(agentId: string) {
        const res = await axios.get(`${API_BASE}/${agentId}/stats`);
        return res.data;
    }

    static async validatePhone(phoneNumber: string, countryCode: string): Promise<PhoneValidationResult> {
        const res = await axios.get(`${API_BASE}/validate-phone`, { params: { phoneNumber, countryCode } });
        return res.data;
    }
}


