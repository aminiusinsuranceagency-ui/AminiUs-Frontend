import { Injectable } from '@angular/core';
import axios from 'axios';
import {
  GreetingResult,
  ParsedTemplateResult,
  RandomPasswordResult,
  TemplateData,
  NotificationResult,
  NotificationHistoryRequest,
  NotificationHistoryResult,
  CancelNotificationResult,
  UpdateNotificationStatusResult,
  ValidationResult,
  NationalIdValidationResult,
  PhoneNumberFormatResult,
  DataIntegrityIssue
} from '../interfaces/utility';

const API_URL = 'http://localhost:3000/api/utility'; 

@Injectable({
  providedIn: 'root'
})
export class UtilityService {
  // ===== Validation =====
  async validateEmail(email: string): Promise<ValidationResult> {
    const { data } = await axios.get(`${API_URL}/validate/email`, { params: { email } });
    return data;
  }

  async validateNationalId(nationalId: string): Promise<NationalIdValidationResult> {
    const { data } = await axios.get(`${API_URL}/validate/national-id`, { params: { nationalId } });
    return data;
  }

  async validateDate(dateValue: string, minDate?: string, maxDate?: string): Promise<ValidationResult> {
    const { data } = await axios.get(`${API_URL}/validate/date`, { params: { dateValue, minDate, maxDate } });
    return data;
  }

  async validateTimeRange(startTime: string, endTime: string): Promise<ValidationResult> {
    const { data } = await axios.get(`${API_URL}/validate/time-range`, { params: { startTime, endTime } });
    return data;
  }

  async checkDataIntegrity(agentId: string): Promise<DataIntegrityIssue[]> {
    const { data } = await axios.get(`${API_URL}/${agentId}/data-integrity`);
    return data;
  }

  async formatPhoneNumber(phoneNumber: string, countryCode: string): Promise<PhoneNumberFormatResult> {
    const { data } = await axios.get(`${API_URL}/format/phone`, { params: { phoneNumber, countryCode } });
    return data;
  }

  // ===== Utility =====
  async getGreeting(): Promise<GreetingResult> {
    const { data } = await axios.get(`${API_URL}/greeting`);
    return data;
  }

  async parseTemplate(template: string, dataObj: TemplateData): Promise<ParsedTemplateResult> {
    const { data } = await axios.post(`${API_URL}/template/parse`, { template, data: dataObj });
    return data;
  }

  async generateRandomPassword(length?: number): Promise<RandomPasswordResult> {
    const { data } = await axios.get(`${API_URL}/password/random`, { params: { length } });
    return data;
  }

  async calculateAge(dateOfBirth: string): Promise<{ age: number }> {
    const { data } = await axios.get(`${API_URL}/calculate/age`, { params: { dateOfBirth } });
    return data;
  }

  async daysUntilExpiry(expiryDate: string): Promise<{ daysUntil: number }> {
    const { data } = await axios.get(`${API_URL}/calculate/days-until-expiry`, { params: { expiryDate } });
    return data;
  }

  async formatClientName(firstName: string, surname: string, lastName: string): Promise<{ formattedName: string }> {
    const { data } = await axios.get(`${API_URL}/format/client-name`, { params: { firstName, surname, lastName } });
    return data;
  }

  async formatCurrency(amount: number): Promise<{ formattedCurrency: string }> {
    const { data } = await axios.get(`${API_URL}/format/currency`, { params: { amount } });
    return data;
  }

  async getStatusColor(status: string): Promise<{ statusColor: string }> {
    const { data } = await axios.get(`${API_URL}/color/status`, { params: { status } });
    return data;
  }

  async getPriorityColor(priority: string): Promise<{ priorityColor: string }> {
    const { data } = await axios.get(`${API_URL}/color/priority`, { params: { priority } });
    return data;
  }

  async getAppointmentTypeIcon(type: string): Promise<{ typeIcon: string }> {
    const { data } = await axios.get(`${API_URL}/icon/appointment-type`, { params: { type } });
    return data;
  }

  // ===== Notifications =====
  async sendEmail(agentId: string, toEmail: string, subject: string, body: string): Promise<NotificationResult> {
    const { data } = await axios.post(`${API_URL}/${agentId}/notifications/email`, { toEmail, subject, body });
    return data;
  }

  async sendSMS(agentId: string, phoneNumber: string, message: string): Promise<NotificationResult> {
    const { data } = await axios.post(`${API_URL}/${agentId}/notifications/sms`, { phoneNumber, message });
    return data;
  }

  async sendWhatsApp(agentId: string, phoneNumber: string, message: string): Promise<NotificationResult> {
    const { data } = await axios.post(`${API_URL}/${agentId}/notifications/whatsapp`, { phoneNumber, message });
    return data;
  }

  async sendPush(agentId: string, title: string, body: string): Promise<NotificationResult> {
    const { data } = await axios.post(`${API_URL}/${agentId}/notifications/push`, { title, body });
    return data;
  }

  async scheduleNotification(
    agentId: string,
    scheduledTime: string,
    notificationType: string,
    recipient: string,
    body: string,
    subject?: string
  ): Promise<NotificationResult> {
    const { data } = await axios.post(`${API_URL}/${agentId}/notifications/schedule`, {
      scheduledTime,
      notificationType,
      recipient,
      body,
      subject
    });
    return data;
  }

  async cancelScheduledNotification(agentId: string, notificationId: string): Promise<CancelNotificationResult> {
    const { data } = await axios.delete(`${API_URL}/${agentId}/notifications/${notificationId}`);
    return data;
  }

  async processScheduledNotifications(): Promise<any> {
    const { data } = await axios.get(`${API_URL}/notifications/process`);
    return data;
  }

  async getNotificationHistory(agentId: string, options: NotificationHistoryRequest): Promise<NotificationHistoryResult> {
    const { data } = await axios.get(`${API_URL}/${agentId}/notifications/history`, { params: options });
    return data;
  }

  async updateNotificationStatus(notificationId: string, status: string, errorMessage?: string): Promise<UpdateNotificationStatusResult> {
    const { data } = await axios.put(`${API_URL}/notifications/${notificationId}/status`, { status, errorMessage });
    return data;
  }
}
