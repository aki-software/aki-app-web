import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "../Modal";

describe("Modal Component", () => {
  it("should not render when isOpen is false", () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <div>Content</div>
      </Modal>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders through document.body in an opaque, centered container", () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <div>Modal Content</div>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(container.contains(dialog)).toBe(false);
    expect(dialog).toHaveClass("items-center");
    expect(dialog.lastElementChild).toHaveClass("bg-app-bg");
    expect(screen.getByText("Modal Content")).toBeDefined();
  });

  it("should call onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <div>Content</div>
      </Modal>,
    );
    const closeButton = screen.getByLabelText("Cerrar modal");
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <div>Content</div>
      </Modal>,
    );
    const backdrop = screen.getByRole("dialog").firstElementChild;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it("should not call onClose when backdrop is clicked and isLoading is true", () => {
    const onClose = vi.fn();
    render(
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Test Modal"
        isLoading={true}
      >
        <div>Content</div>
      </Modal>,
    );
    const backdrop = screen.getByRole("dialog").firstElementChild;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).not.toHaveBeenCalled();
    }
  });
});
