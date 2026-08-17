export interface User {
  id: string;
  email: string;
  full_name: string;
  organization?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface DatasetMeta {
  id: string;
  user_id?: string;
  filename: string;
  row_count: number;
  column_count: number;
  file_size_bytes: number;
  upload_timestamp: string;
  target_fraud_column?: string;
  columns?: string[];
  numerical_columns: string[];
  categorical_columns: string[];
  datetime_columns: string[];
}

export interface DatasetProfile {
  dataset_id: string;
  summary: {
    total_rows: number;
    total_columns: number;
    missing_cells_percentage: number;
    duplicate_rows_count: number;
    memory_usage_mb: number;
  };
  numerical_analysis: Record<string, {
    mean: number;
    std: number;
    min: number;
    max: number;
    median: number;
    q25: number;
    q75: number;
  }>;
  categorical_analysis: Record<string, {
    unique_count: number;
    most_frequent: string;
    top_frequencies: Record<string, number>;
  }>;
  correlation_matrix: Record<string, Record<string, number>>;
  detected_target_column?: string;
  missing_values_breakdown: Record<string, number>;
  duplicate_rows_count: number;
}

export interface GenerationJob {
  job_id: string;
  dataset_id: string;
  dataset_filename?: string;
  output_filename?: string;
  model_type: 'ctgan' | 'vae' | 'conditional';
  num_records_requested: number;
  fraud_target_ratio?: number | null;
  achieved_fraud_ratio?: number | null;
  status: 'queued' | 'training' | 'generating' | 'evaluating' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  synthetic_dataset_path?: string;
  error_message?: string;
}
