import axios from "axios";
import type {
  GlobalSearchResult,
  SearchClient,
  SearchAppointment,
  SearchPolicy,
  SearchReminder,
  SearchSuggestion,
  SearchHistory
} from "../interfaces/search";

// Base API setup — pulls from Vite's environment variables
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export class SearchService {
  static async globalSearch(agentId: string, searchTerm: string) {
    const { data } = await api.get<GlobalSearchResult[]>(
      `/${agentId}/global`,
      { params: { searchTerm } }
    );
    return data;
  }

  static async searchClients(agentId: string, searchTerm = "") {
    const { data } = await api.get<SearchClient[]>(
      `/${agentId}/clients`,
      { params: { searchTerm } }
    );
    return data;
  }

  static async searchAppointments(agentId: string, searchTerm = "") {
    const { data } = await api.get<SearchAppointment[]>(
      `/${agentId}/appointments`,
      { params: { searchTerm } }
    );
    return data;
  }

  static async searchPolicies(agentId: string, searchTerm = "") {
    const { data } = await api.get<SearchPolicy[]>(
      `/${agentId}/policies`,
      { params: { searchTerm } }
    );
    return data;
  }

  static async searchReminders(agentId: string, searchTerm = "") {
    const { data } = await api.get<SearchReminder[]>(
      `/${agentId}/reminders`,
      { params: { searchTerm } }
    );
    return data;
  }

  static async getSearchSuggestions(agentId: string, searchTerm = "", maxResults = 10) {
    const { data } = await api.get<SearchSuggestion[]>(
      `/${agentId}/suggestions`,
      { params: { searchTerm, maxResults } }
    );
    return data;
  }

  static async getSearchHistory(agentId: string, maxResults = 20) {
    const { data } = await api.get<SearchHistory[]>(
      `/${agentId}/history`,
      { params: { maxResults } }
    );
    return data;
  }
}
