// Tipos globais — Ecosystem + Pessoal

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DashboardStats {
  financeSummary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  totalTasks: number;
  pendingTasks: number;
  totalNotes: number;
}

export interface Settings {
  id: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  imapHost?: string;
  imapPort?: number;
  emailFrom?: string;
  emailFromName?: string;
  agentName?: string;
  agentCompany?: string;
  agentRole?: string;
  agentToneOfVoice?: string;
  agentToneDescription?: string;
  companyDescription?: string;
  companyServices?: string;
  companyWebsite?: string;
  agentSignature?: string;
}

export interface ChatAIConfig {
  openrouterApiKeySet: boolean;
  openrouterApiKeyMasked: string;
  openrouterDefaultModel: string;
  chatTemperature: number;
  chatMaxTokens: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── ECOSYSTEM TYPES ─────────────────────────────────────────────────────────

export type EcoTaskStatus = 'scheduled' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';

export interface EcoTask {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  type: string;
  status: EcoTaskStatus;
  enabled: boolean;
  priority: number;
  category?: string;
  recurring?: boolean;
  cronExpression?: string;
  scheduledAt?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  successCount: number;
  failCount: number;
  source?: string;
  claudeTaskId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EcoExecution {
  id: string;
  taskId: string;
  taskName?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  result?: string;
  error?: string;
  tokensUsed?: number;
  cost?: number;
}

export interface EcoExecutionStats {
  totalExecutions: number;
  completedCount: number;
  failedCount: number;
  avgDuration: number;
  totalTokens: number;
  totalCost: number;
  byDay: { date: string; count: number; success: number; failed: number }[];
}

export interface KBDocument {
  filename: string;
  name: string;
  category?: string;
  sections?: number;
  size?: number;
  lastModified?: string;
  priority?: number;
}

export interface KBSearchResult {
  filename: string;
  name: string;
  category?: string;
  matches: { section: string; content: string; score: number }[];
}

export interface KBStats {
  totalDocuments: number;
  categories: number;
  totalSections: number;
}

export interface MemorySession {
  id: string;
  project?: string;
  objective?: string;
  phase?: string;
  status: 'active' | 'finalized';
  tasks?: MemoryTask[];
  checkpoints?: MemoryCheckpoint[];
  tags?: string[];
  notes?: string;
  favorite?: boolean;
  startedAt: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  description?: string;
}

export interface MemoryCheckpoint {
  id: string;
  description: string;
  phase?: string;
  createdAt: string;
}

export interface MemoryStats {
  totalSessions: number;
  activeSessions: number;
  totalCheckpoints: number;
  totalTasks: number;
  avgTasksPerSession: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category?: string;
  description?: string;
  variables?: string[];
  tags?: string[];
  model?: string;
  usageCount?: number;
  lastUsedAt?: string;
  versions?: PromptVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  version: number;
  content: string;
  createdAt: string;
}

export interface Credential {
  id: string;
  name: string;
  prefix?: string;
  hasValue: boolean;
  description?: string;
  category?: string;
  lastUsed?: string;
  createdAt: string;
}

export interface EcoStatus {
  running: boolean;
  totalTasks: number;
  scheduledTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  successRate: number;
  uptime?: number;
}
