import { User, DatasetMeta, DatasetProfile, GenerationJob } from '../types';

const RAW_API_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = RAW_API_URL.endsWith('/api/v1')
  ? RAW_API_URL
  : RAW_API_URL
  ? `${RAW_API_URL.replace(/\/$/, '')}/api/v1`
  : '/api/v1';

class ApiService {
  private token: string | null = localStorage.getItem('dgen_token') || localStorage.getItem('finsynth_token');

  getApiBaseUrl(): string {
    return API_BASE_URL;
  }

  getDownloadUrl(jobId: string): string {
    return `${API_BASE_URL}/generation/${jobId}/download`;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('dgen_token', token);
      localStorage.removeItem('finsynth_token');
    } else {
      localStorage.removeItem('dgen_token');
      localStorage.removeItem('finsynth_token');
    }
  }

  getToken(): string | null {
    return localStorage.getItem('dgen_token') || localStorage.getItem('finsynth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      if (!response.ok) {
        throw new Error('An API error occurred');
      }
      return {} as T;
    }

    let data: any;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      let msg = data.error || data.detail;
      if (Array.isArray(msg)) {
        msg = msg.map((m: any) => m.msg || JSON.stringify(m)).join(', ');
      } else if (typeof msg === 'object' && msg !== null) {
        msg = msg.message || JSON.stringify(msg);
      }
      throw new Error(msg || (response.status === 401 ? 'Invalid email or password' : response.statusText || 'An API error occurred'));
    }

    return data as T;
  }

  // Health
  async getHealth() {
    return this.request<{ status: string; app_name: string; database_mode: string; environment: string }>('/health');
  }

  // Auth
  async register(payload: { email: string; password: string; full_name: string; organization?: string }) {
    const data = await this.request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(data.access_token);
    return data;
  }

  async login(payload: { email: string; password: string }) {
    const data = await this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe() {
    return this.request<User>('/auth/me');
  }

  // Datasets
  async uploadDataset(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<DatasetMeta>('/datasets/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async listDatasets() {
    return this.request<DatasetMeta[]>('/datasets');
  }

  async getDataset(id: string) {
    return this.request<DatasetMeta>(`/datasets/${id}`);
  }

  async getDatasetSample(id: string, rows: number = 50) {
    return this.request<{ dataset_id: string; columns: string[]; total_rows_previewed: number; rows: Record<string, any>[] }>(
      `/datasets/${id}/sample?rows=${rows}`
    );
  }

  async profileDataset(id: string) {
    return this.request<DatasetProfile>(`/datasets/${id}/profile`, {
      method: 'POST',
    });
  }

  async preprocessDataset(id: string, imputeStrategy: string = 'median', scalingStrategy: string = 'minmax') {
    return this.request<any>(
      `/datasets/${id}/preprocess?impute_strategy=${imputeStrategy}&scaling_strategy=${scalingStrategy}`,
      { method: 'POST' }
    );
  }

  async seedBenchmarkDataset() {
    return this.request<DatasetMeta>('/datasets/seed-benchmark', {
      method: 'POST',
    });
  }

  async deleteDataset(id: string) {
    return this.request<{ success: boolean; message: string }>(`/datasets/${id}`, {
      method: 'DELETE',
    });
  }

  // Generation Jobs
  async createGenerationJob(payload: {
    dataset_id: string;
    model_type: string;
    num_records: number;
    fraud_target_ratio?: number | null;
    random_seed?: number;
  }) {
    return this.request<GenerationJob>('/generation', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listGenerationJobs() {
    return this.request<GenerationJob[]>('/generation');
  }

  async getGenerationJobStatus(jobId: string) {
    return this.request<GenerationJob>(`/generation/${jobId}`);
  }

  async deleteGenerationJob(jobId: string) {
    return this.request<void>(`/generation/${jobId}`, {
      method: 'DELETE',
    });
  }

  // Evaluation
  async evaluateFullScorecard(jobId?: string, datasetId?: string) {
    let url = '/evaluation/full';
    if (jobId) url += `?job_id=${jobId}`;
    else if (datasetId) url += `?dataset_id=${datasetId}`;
    return this.request<any>(url, { method: 'POST' });
  }

  async evaluateFraudMLUtility(jobId?: string, datasetId?: string, targetColumn?: string) {
    let url = '/evaluation/fraud';
    const params: string[] = [];
    if (jobId) params.push(`job_id=${encodeURIComponent(jobId)}`);
    if (datasetId) params.push(`dataset_id=${encodeURIComponent(datasetId)}`);
    if (targetColumn) params.push(`target_column=${encodeURIComponent(targetColumn)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return this.request<any>(url, { method: 'POST' });
  }

  // Experiments
  async listExperiments() {
    return this.request<any[]>('/experiments');
  }

  async getModelBenchmarkComparison() {
    return this.request<any>('/experiments/benchmark');
  }

  getReportExportUrl(jobId?: string, datasetId?: string): string {
    let url = `${API_BASE_URL}/evaluation/report/export`;
    if (jobId) url += `?job_id=${jobId}`;
    else if (datasetId) url += `?dataset_id=${datasetId}`;
    return url;
  }

  logout() {
    this.setToken(null);
  }
}

export const api = new ApiService();
