import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Optional: Create interfaces for each request/response type
export interface ActivityLog {
  AgentId: string;
  Action: string;
  Description?: string;
  CreatedDate?: Date;
}

export interface DashboardStatistics {
  totalClients: number;
  activePolicies: number;
  totalPremiums: number;
  [key: string]: any;
}

export interface PerformanceMetrics {
  metricDate: Date;
  policiesSold: number;
  revenueGenerated: number;
  [key: string]: any;
}

export interface TaskSummary {
  TaskId?: string;
  AgentId: string;
  Title: string;
  Status: string;
  CreatedDate?: Date;
  CompletedDate?: Date;
}

export interface MonthlyReport {
  Month: string;
  Data: any;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private baseUrl = 'http://localhost:3000/api/analytics'; // move to environment.ts for real project

  constructor(private http: HttpClient) {}

  /** ----------------- Activity Logs ----------------- **/

  createActivityLog(log: ActivityLog): Observable<ActivityLog> {
    return this.http.post<ActivityLog>(`${this.baseUrl}/activity-log`, log);
  }

  getActivityLogsByAgent(agentId: string, limit: number = 50): Observable<ActivityLog[]> {
    return this.http.get<ActivityLog[]>(`${this.baseUrl}/activity-log/${agentId}`, {
      params: { limit: limit.toString() }
    });
  }

  getActivityLogsByDateRange(agentId: string, startDate: string, endDate: string): Observable<ActivityLog[]> {
    return this.http.get<ActivityLog[]>(`${this.baseUrl}/activity-log/${agentId}/date-range`, {
      params: { startDate, endDate }
    });
  }

  /** ----------------- Dashboard Statistics ----------------- **/

  getDashboardStatistics(filter: any): Observable<DashboardStatistics> {
    return this.http.post<DashboardStatistics>(`${this.baseUrl}/dashboard-statistics`, filter);
  }

  updateDashboardStatistics(agentId: string, stats: Partial<DashboardStatistics>): Observable<DashboardStatistics> {
    return this.http.put<DashboardStatistics>(`${this.baseUrl}/dashboard-statistics/${agentId}`, stats);
  }

  /** ----------------- Performance Metrics ----------------- **/

  getPerformanceMetrics(filter: any): Observable<PerformanceMetrics[]> {
    return this.http.post<PerformanceMetrics[]>(`${this.baseUrl}/performance-metrics`, filter);
  }

  updatePerformanceMetrics(agentId: string, metricDate: string, metrics: Partial<PerformanceMetrics>): Observable<PerformanceMetrics> {
    return this.http.put<PerformanceMetrics>(`${this.baseUrl}/performance-metrics/${agentId}`, {
      metricDate,
      ...metrics
    });
  }

  /** ----------------- Task Summary ----------------- **/

  createTaskSummary(task: TaskSummary): Observable<TaskSummary> {
    return this.http.post<TaskSummary>(`${this.baseUrl}/tasks`, task);
  }

  getTasksSummary(agentId: string, taskDate?: string): Observable<TaskSummary[]> {
    const params: any = {};
    if (taskDate) params.taskDate = taskDate;
    return this.http.get<TaskSummary[]>(`${this.baseUrl}/tasks/${agentId}`, { params });
  }

  updateTaskStatus(taskId: string, status: string, completedDate?: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.baseUrl}/tasks/${taskId}/status`, {
      status,
      completedDate
    });
  }

  /** ----------------- Monthly Reports ----------------- **/

  generateMonthlyReport(reportRequest: any): Observable<MonthlyReport> {
    return this.http.post<MonthlyReport>(`${this.baseUrl}/monthly-reports/generate`, reportRequest);
  }

  getMonthlyReports(agentId: string, startMonth: string, endMonth: string): Observable<MonthlyReport[]> {
    return this.http.get<MonthlyReport[]>(`${this.baseUrl}/monthly-reports/${agentId}`, {
      params: { startMonth, endMonth }
    });
  }

  /** ----------------- Dashboard Views Cache ----------------- **/

  getCachedView(agentId: string, viewName: string, cacheDate: string): Observable<{ cacheData: any }> {
    return this.http.get<{ cacheData: any }>(`${this.baseUrl}/dashboard-cache/${agentId}/${viewName}`, {
      params: { cacheDate }
    });
  }

  setCachedView(cacheData: any): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/dashboard-cache`, cacheData);
  }

  clearExpiredCache(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/dashboard-cache/expired`);
  }
}
