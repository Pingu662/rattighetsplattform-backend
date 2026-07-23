import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rattighetsplattform-backend-production.up.railway.app/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    });

    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
              localStorage.setItem('accessToken', data.accessToken);
              localStorage.setItem('refreshToken', data.refreshToken);
              originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
              return this.client(originalRequest);
            }
          } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email: string, password: string) {
    const { data } = await this.client.post('/auth/login', { email, password });
    return data;
  }

  async register(userData: any) {
    const { data } = await this.client.post('/auth/register', userData);
    return data;
  }

  async getMe() {
    const { data } = await this.client.get('/auth/me');
    return data;
  }

  async updateProfile(profileData: any) {
    const { data } = await this.client.put('/auth/profile', profileData);
    return data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await this.client.post('/auth/change-password', { currentPassword, newPassword });
    return data;
  }

  async logout() {
    const { data } = await this.client.post('/auth/logout');
    return data;
  }

  // Users
  async getUsers(params?: any) {
    const { data } = await this.client.get('/users', { params });
    return data;
  }

  async getUser(id: number) {
    const { data } = await this.client.get(`/users/${id}`);
    return data;
  }

  // Cases
  async getCases(params?: any) {
    const { data } = await this.client.get('/cases', { params });
    return data;
  }

  async getCase(id: number) {
    const { data } = await this.client.get(`/cases/${id}`);
    return data;
  }

  async createCase(caseData: any) {
    const { data } = await this.client.post('/cases', caseData);
    return data;
  }

  async updateCase(id: number, caseData: any) {
    const { data } = await this.client.put(`/cases/${id}`, caseData);
    return data;
  }

  async deleteCase(id: number) {
    const { data } = await this.client.delete(`/cases/${id}`);
    return data;
  }

  // Documents
  async getDocuments(params?: any) {
    const { data } = await this.client.get('/documents', { params });
    return data;
  }

  async uploadDocument(formData: FormData) {
    const { data } = await this.client.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async getDocument(id: number) {
    const { data } = await this.client.get(`/documents/${id}`);
    return data;
  }

  async deleteDocument(id: number) {
    const { data } = await this.client.delete(`/documents/${id}`);
    return data;
  }

  // Legal Cases (Rättspraxis)
  async getLegalCases(params?: any) {
    const { data } = await this.client.get('/legal-cases', { params });
    return data;
  }

  async getLegalCase(id: number) {
    const { data } = await this.client.get(`/legal-cases/${id}`);
    return data;
  }

  async createLegalCase(caseData: any) {
    const { data } = await this.client.post('/legal-cases', caseData);
    return data;
  }

  // Appeals
  async getAppeals(params?: any) {
    const { data } = await this.client.get('/appeals', { params });
    return data;
  }

  async createAppeal(appealData: any) {
    const { data } = await this.client.post('/appeals', appealData);
    return data;
  }

  async getAppeal(id: number) {
    const { data } = await this.client.get(`/appeals/${id}`);
    return data;
  }

  async generateAppeal(id: number) {
    const { data } = await this.client.post(`/appeals/${id}/generate`);
    return data;
  }

  // AI
  async getAiProviders() {
    const { data } = await this.client.get('/ai/providers');
    return data;
  }

  async aiChat(chatData: any) {
    const { data } = await this.client.post('/ai/chat', chatData);
    return data;
  }

  async getAiConversations() {
    const { data } = await this.client.get('/ai/conversations');
    return data;
  }

  async getAiConversation(id: number) {
    const { data } = await this.client.get(`/ai/conversations/${id}`);
    return data;
  }

  async deleteAiConversation(id: number) {
    const { data } = await this.client.delete(`/ai/conversations/${id}`);
    return data;
  }

  async analyzeDocument(documentId: number) {
    const { data } = await this.client.post('/ai/analyze-document', { documentId });
    return data;
  }

  async generateAppealFromText(appealData: any) {
    const { data } = await this.client.post('/ai/generate-appeal', appealData);
    return data;
  }

  async searchLegal(query: string) {
    const { data } = await this.client.post('/ai/search-legal', { query });
    return data;
  }

  // Forum
  async getForumCategories() {
    const { data } = await this.client.get('/forum/categories');
    return data;
  }

  async getForumTopics(params?: any) {
    const { data } = await this.client.get('/forum/topics', { params });
    return data;
  }

  async getForumTopic(id: number) {
    const { data } = await this.client.get(`/forum/topics/${id}`);
    return data;
  }

  async createForumTopic(topicData: any) {
    const { data } = await this.client.post('/forum/topics', topicData);
    return data;
  }

  async createForumReply(topicId: number, replyData: any) {
    const { data } = await this.client.post(`/forum/topics/${topicId}/replies`, replyData);
    return data;
  }

  // Petitions
  async getPetitions(params?: any) {
    const { data } = await this.client.get('/petitions', { params });
    return data;
  }

  async getPetition(id: number) {
    const { data } = await this.client.get(`/petitions/${id}`);
    return data;
  }

  async createPetition(petitionData: any) {
    const { data } = await this.client.post('/petitions', petitionData);
    return data;
  }

  async signPetition(id: number, isAnonymous?: boolean) {
    const { data } = await this.client.post(`/petitions/${id}/sign`, { isAnonymous });
    return data;
  }

  // Jurists
  async getJurists() {
    const { data } = await this.client.get('/jurists');
    return data;
  }

  async registerJurist(profileData: any) {
    const { data } = await this.client.post('/jurists/register', profileData);
    return data;
  }

  // Admin
  async getAdminStats() {
    const { data } = await this.client.get('/admin/stats');
    return data;
  }

  async getAdminActivity(params?: any) {
    const { data } = await this.client.get('/admin/activity', { params });
    return data;
  }

  async getAdminSettings() {
    const { data } = await this.client.get('/admin/settings');
    return data;
  }

  async updateAdminSettings(settings: any) {
    const { data } = await this.client.put('/admin/settings', settings);
    return data;
  }

  // Search
  async search(query: string, type?: string) {
    const { data } = await this.client.get('/search', { params: { q: query, type } });
    return data;
  }

  // Notifications
  async getNotifications() {
    const { data } = await this.client.get('/notifications');
    return data;
  }

  async getUnreadCount() {
    const { data } = await this.client.get('/notifications/unread-count');
    return data;
  }

  async markNotificationRead(id: number) {
    const { data } = await this.client.post(`/notifications/${id}/read`);
    return data;
  }

  async markAllNotificationsRead() {
    const { data } = await this.client.post('/notifications/read-all');
    return data;
  }

  // Dashboard
  async getDashboardStats() {
    const [cases, documents, conversations, appeals] = await Promise.all([
      this.getCases({ limit: 5 }),
      this.getDocuments({ limit: 5 }),
      this.getAiConversations(),
      this.getAppeals({ limit: 5 }),
    ]);
    return { cases, documents, conversations, appeals };
  }
}

export const api = new ApiClient();
export default api;