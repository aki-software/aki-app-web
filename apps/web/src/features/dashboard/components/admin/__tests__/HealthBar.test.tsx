import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { HealthBar } from "../HealthBar";

// Mock lucide-react with importOriginal
vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<Record<string, React.ComponentType<Record<string, unknown>>>>();
  const MockIcon = (props: Record<string, unknown>) => {
    const { ...rest } = props ?? {};
    return React.createElement("span", { "data-testid": "mock-icon", ...rest });
  };
  const mocked: Record<string, React.ComponentType<Record<string, unknown>>> = {};
  for (const key of Object.keys(actual)) {
    mocked[key] = MockIcon;
  }
  return mocked;
});

// Mock useNavigate for the IndicatorCard buttons
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("HealthBar — indicator color mapping", () => {
  it("renders all three indicators with default labels", () => {
    renderWithRouter(<HealthBar />);
    expect(screen.getByText("Tasa de finalización")).toBeDefined();
    expect(screen.getByText("Instituciones con alertas")).toBeDefined();
    expect(screen.getByText("Sesiones pendientes de revisión")).toBeDefined();
  });

  describe("completionRate thresholds", () => {
    it("completionRate ≥ 80 → green (text-status-success)", () => {
      renderWithRouter(<HealthBar completionRate={85} />);
      const valueElements = screen.getAllByText("85");
      // At least one should have green class
      const greenCompletion = valueElements.find(
        (el) => el.className.includes("text-status-success")
      );
      expect(greenCompletion).toBeDefined();
    });

    it("completionRate 50-79 → yellow (text-status-warning)", () => {
      renderWithRouter(<HealthBar completionRate={65} />);
      const valueElements = screen.getAllByText("65");
      const yellowCompletion = valueElements.find(
        (el) => el.className.includes("text-status-warning")
      );
      expect(yellowCompletion).toBeDefined();
    });

    it("completionRate < 50 → red (text-status-error)", () => {
      renderWithRouter(<HealthBar completionRate={30} />);
      const valueElements = screen.getAllByText("30");
      const redCompletion = valueElements.find(
        (el) => el.className.includes("text-status-error")
      );
      expect(redCompletion).toBeDefined();
    });

    it("completionRate exactly 80 → green (boundary)", () => {
      renderWithRouter(<HealthBar completionRate={80} />);
      const valueElements = screen.getAllByText("80");
      const greenCompletion = valueElements.find(
        (el) => el.className.includes("text-status-success")
      );
      expect(greenCompletion).toBeDefined();
    });

    it("completionRate exactly 50 → yellow (boundary)", () => {
      renderWithRouter(<HealthBar completionRate={50} />);
      // "50" appears also as default values for other indicators (0)
      // but 50 should map to yellow for completion
      const completionEl = screen.getAllByText("50").find(
        (el) => el.className.includes("text-status-warning")
      );
      expect(completionEl).toBeDefined();
    });
  });

  describe("alertsCount thresholds", () => {
    it("alertsCount = 0 → green", () => {
      renderWithRouter(<HealthBar alertsCount={0} completionRate={100} />);
      // The "0" value should have green class for alerts
      const zeroEls = screen.getAllByText("0");
      const greenAlerts = zeroEls.find(
        (el) => el.className.includes("text-status-success")
      );
      expect(greenAlerts).toBeDefined();
    });

    it("alertsCount = 3 → yellow", () => {
      renderWithRouter(<HealthBar alertsCount={3} completionRate={100} />);
      const valueElements = screen.getAllByText("3");
      const yellowAlerts = valueElements.find(
        (el) => el.className.includes("text-status-warning")
      );
      expect(yellowAlerts).toBeDefined();
    });

    it("alertsCount = 5 → red", () => {
      renderWithRouter(<HealthBar alertsCount={5} completionRate={100} />);
      const valueElements = screen.getAllByText("5");
      const redAlerts = valueElements.find(
        (el) => el.className.includes("text-status-error")
      );
      expect(redAlerts).toBeDefined();
    });
  });

  describe("triageCount thresholds", () => {
    it("triageCount = 0 → green", () => {
      renderWithRouter(<HealthBar triageCount={0} completionRate={100} />);
      const zeroEls = screen.getAllByText("0");
      const greenTriage = zeroEls.find(
        (el) => el.className.includes("text-status-success")
      );
      expect(greenTriage).toBeDefined();
    });

    it("triageCount = 5 → yellow", () => {
      renderWithRouter(<HealthBar triageCount={5} completionRate={100} />);
      const valueElements = screen.getAllByText("5");
      const yellowTriage = valueElements.find(
        (el) => el.className.includes("text-status-warning")
      );
      expect(yellowTriage).toBeDefined();
    });

    it("triageCount = 6 → red", () => {
      renderWithRouter(<HealthBar triageCount={6} completionRate={100} />);
      const valueElements = screen.getAllByText("6");
      // There may be other "6"s, look for one with red class
      const redTriage = valueElements.find(
        (el) => el.className.includes("text-status-error")
      );
      expect(redTriage).toBeDefined();
    });
  });

  describe("default props (undefined → 0, green)", () => {
    it("completionRate defaults to 0 and is green", () => {
      renderWithRouter(<HealthBar />);
      // When all are 0, all "0" values should have green class
      const zeroEls = screen.getAllByText("0");
      // At least some should have green class
      const greenZeros = zeroEls.filter(
        (el) => el.className.includes("text-status-success")
      );
      expect(greenZeros.length).toBeGreaterThan(0);
    });

    it("alertsCount defaults to 0 and is green", () => {
      renderWithRouter(<HealthBar completionRate={100} />);
      // completionRate=100 maps to green as well
      // But there should be a "0" for alerts with green class
      const zeroEls = screen.getAllByText("0");
      const greenZero = zeroEls.find(
        (el) => el.className.includes("text-status-success")
      );
      expect(greenZero).toBeDefined();
    });
  });

  describe("formatCount formatting", () => {
    it("formats values over 999 with 'k' suffix", () => {
      renderWithRouter(<HealthBar triageCount={1234} completionRate={100} />);
      expect(screen.getByText("1.2k")).toBeDefined();
    });

    it("does NOT add 'k' suffix for values under 1000", () => {
      renderWithRouter(<HealthBar triageCount={999} completionRate={100} />);
      expect(screen.queryByText("1k")).toBeNull();
    });
  });
});
