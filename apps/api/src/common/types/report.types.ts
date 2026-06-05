export interface ParsedDescriptionBlock {
  subtitle?: string;
  content: string;
}

export interface CategoryResult {
  title: string;
  percentage: number;
  timeSpentMs?: number;
  description: string;
  parsedBlocks?: ParsedDescriptionBlock[];
  materialSnippet?: string;
  suggestedCareers?: string[];
}

export interface ReportSummary {
  primaryTitle: string;
  primaryPercentage: number;
  profileStrength: string;
  recommendation: string;
  rankedAreas: Array<{ title: string; percentage: number }>;
}

export interface ReportTripletInsight {
  title: string;
  narrative: string;
  tendencies: string[];
  possibleJobs: string[];
  relatedProfessions: string[];
}

export interface ReportData {
  patientName: string;
  patientEmail?: string;
  hollandCode?: string;
  hollandPercentages?: Record<string, number>;
  topResults: CategoryResult[];
  bottomAreas?: Array<{ title: string; percentage: number }>;
  summary: ReportSummary;
  tripletInsight: ReportTripletInsight | null;
  strengths: string[];
}
