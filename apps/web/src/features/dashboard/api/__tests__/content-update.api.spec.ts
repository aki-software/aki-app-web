import { describe, expect, it, beforeEach } from "vitest";
import { apiClient } from "../../../../api/client";
import { updateCategory, type CategoryUpdatePayload } from "../categories.api";
import {
  updateCombination,
  type CombinationUpdatePayload,
} from "../combinations.api";
import { mockEndpoint, resetMockApi } from "../../../../test/mock-api-client";

declare function expectPayload<TPayload>(payload: TPayload): void;

describe.skip("dashboard content update API type contracts", () => {
  it("rejects immutable identity fields in update payloads", () => {
    expectPayload<CategoryUpdatePayload>({
      // @ts-expect-error categoryId belongs in the URL, not the update body.
      categoryId: "ART",
    });

    expectPayload<CombinationUpdatePayload>({
      // @ts-expect-error Combination identity belongs in the URL, not the update body.
      id: "combination-1",
    });
    expectPayload<CombinationUpdatePayload>({
      // @ts-expect-error Combination identity is immutable.
      area1: "ART",
    });
    expectPayload<CombinationUpdatePayload>({
      // @ts-expect-error Combination identity is immutable.
      area2: "SOC",
    });
    expectPayload<CombinationUpdatePayload>({
      // @ts-expect-error Combination identity is immutable.
      area3: "EMP",
    });
    expectPayload<CombinationUpdatePayload>({
      // @ts-expect-error Combination identity is immutable.
      combinationKey: "ART-SOC-EMP",
    });
  });
});

describe("dashboard content update APIs", () => {
  beforeEach(() => {
    resetMockApi();
  });

  it("sends category updates with categoryId in the URL only", async () => {
    const payload = { title: "Updated arts" };
    mockEndpoint("put", "/categories/ART", { categoryId: "ART", ...payload });

    await expect(updateCategory("ART", payload)).resolves.toEqual({
      categoryId: "ART",
      ...payload,
    });
    expect(apiClient.put).toHaveBeenCalledWith("/categories/ART", payload);
  });

  it("sends combination updates with immutable fields excluded from the payload", async () => {
    const payload = { title: "Updated combination" };
    mockEndpoint("put", "/tres-areas/combinations/combination-1", {
      id: "combination-1",
      ...payload,
    });

    await expect(updateCombination("combination-1", payload)).resolves.toEqual({
      id: "combination-1",
      ...payload,
    });
    expect(apiClient.put).toHaveBeenCalledWith(
      "/tres-areas/combinations/combination-1",
      payload,
    );
  });
});
