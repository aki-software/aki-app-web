import { apiClient } from "../../../api/client";

export type TresAreasCombinationItem = {
  id: string;
  combinationKey: string;
  title: string;
  area1: string;
  area2: string;
  area3: string;
  narrative: string;
  keyInsight?: string;
  competencies: string[];
  tendencies: string[];
  possibleJobs: string;
  relatedProfessions: string;
  customSections: { title: string; items: string[] }[];
};

export type CombinationsResponse = {
  data: TresAreasCombinationItem[];
  total: number;
};

export async function fetchCombinations(
  page: number = 1,
  limit: number = 1000,
  search: string = "",
): Promise<CombinationsResponse> {
  const params: Record<string, string> = {
    page: String(page),
    limit: String(limit),
  };
  if (search) {
    params.search = search;
  }

  return apiClient.get<CombinationsResponse>("/tres-areas/combinations", {
    params,
  });
}
