import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import Modal from "./Modal";

describe("Modal", () => {
  it("should render children and be closable", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <Modal onClose={handleClose}>
        <div>Modal Content</div>
      </Modal>,
    );

    expect(screen.getByText("Modal Content")).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("should close on Escape key", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <Modal onClose={handleClose}>
        <div>Modal Content</div>
      </Modal>,
    );

    await user.keyboard("{Escape}");
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("should close on overlay click", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <Modal onClose={handleClose}>
        <div>Modal Content</div>
      </Modal>,
    );

    const modalDialog = screen.getByRole("dialog");
    const overlay = modalDialog.parentElement;
    expect(overlay).not.toBeNull();
    if (overlay) {
      await user.click(overlay);
    }

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("should not close on body click", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <Modal onClose={handleClose}>
        <div>Modal Content</div>
      </Modal>,
    );

    await user.click(screen.getByText("Modal Content"));
    expect(handleClose).not.toHaveBeenCalled();
  });
});
