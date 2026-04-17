export interface ParsedDescriptionBlock {
  subtitle?: string;
  content: string;
}

export interface CategoryResult {
  title: string;
  percentage: number;
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
  hollandCode?: string;
  topResults: CategoryResult[];
  summary: ReportSummary;
  tripletInsight: ReportTripletInsight | null;
}
