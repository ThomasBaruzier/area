import "./Modal.css";

import React, { useEffect, useRef } from "react";

type ModalProps = {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
};

export default function Modal({
  children,
  onClose,
  className = "",
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
}: ModalProps): JSX.Element {
  const modalBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }

    function onMouse(e: MouseEvent): void {
      if (
        e.target instanceof Node &&
        modalBodyRef.current &&
        !modalBodyRef.current.contains(e.target)
      ) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return (): void => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" data-testid={dataTestId}>
      <div
        ref={modalBodyRef}
        className={`modal-body ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
