import "@testing-library/jest-dom";

import { vi } from "vitest";

declare global {
  interface SVGElement {
    getBBox?(): DOMRectReadOnly;
    getScreenCTM?(): DOMMatrix | null;
  }
}

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      Reflect.deleteProperty(store, key);
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(
    (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  ),
});

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

class DOMMatrixMock {
  m41 = 0;
  m42 = 0;
  a = 1;
  d = 1;

  constructor(init?: string | number[]) {
    if (typeof init === "string") {
      const regex = /matrix\((.+), (.+), (.+), (.+), (.+), (.+)\)/;
      const match = init.match(regex);
      if (match) {
        this.a = parseFloat(match[1]);
        this.d = parseFloat(match[4]);
        this.m41 = parseFloat(match[5]);
        this.m42 = parseFloat(match[6]);
      }
    }
  }

  translate(x: number, y: number): this {
    this.m41 += x;
    this.m42 += y;
    return this;
  }

  scale(scale: number): this {
    this.a *= scale;
    this.d *= scale;
    return this;
  }
}
vi.stubGlobal("DOMMatrix", DOMMatrixMock);

if (
  typeof window.SVGElement !== "undefined" &&
  !(window.SVGElement.prototype as SVGElement & Record<string, unknown>).getBBox
) {
  (
    window.SVGElement.prototype as SVGElement & Record<string, unknown>
  ).getBBox = (): DOMRectReadOnly => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    toJSON: (): string => JSON.stringify(this),
  });
}

if (!(globalThis as Record<string, unknown>)["PointerEvent"]) {
  class PointerEvent extends MouseEvent {
    public pointerId: number;
    public pointerType: string;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? "";
    }
  }
  (globalThis as Record<string, unknown>)["PointerEvent"] = PointerEvent;
}

HTMLElement.prototype.releasePointerCapture = vi.fn();
HTMLElement.prototype.setPointerCapture = vi.fn();

if (
  typeof window.SVGElement !== "undefined" &&
  typeof (window.SVGElement.prototype as SVGElement & Record<string, unknown>)
    .getScreenCTM === "undefined"
) {
  (
    window.SVGElement.prototype as SVGElement & Record<string, unknown>
  ).getScreenCTM = function (): DOMMatrix | null {
    return new DOMMatrixMock() as unknown as DOMMatrix | null;
  };
}

if (typeof document !== "undefined") {
  Object.defineProperty(document, "documentElement", {
    value: document.documentElement,
    writable: true,
  });
}

vi.mock("d3-selection", () => ({
  default: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    style: vi.fn().mockReturnThis(),
    data: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
  })),
}));

vi.mock("d3-drag", () => ({
  default: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
  })),
  dragEnable: vi.fn(),
  dragDisable: vi.fn(),
}));

vi.mock("d3-zoom", () => ({
  default: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    scaleBy: vi.fn(),
    scaleTo: vi.fn(),
    translateBy: vi.fn(),
    transform: vi.fn(),
  })),
  zoomIdentity: { translate: vi.fn(() => ({ k: 1, x: 0, y: 0 })) },
}));

vi.mock("d3-scale", () => ({
  scaleLinear: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    nice: vi.fn().mockReturnThis(),
  })),
  scaleTime: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  })),
}));

vi.mock("d3-array", () => ({
  extent: vi.fn(() => [0, 1]),
  max: vi.fn(() => 1),
  min: vi.fn(() => 0),
}));

vi.mock("reactflow", async () => {
  const actual = await vi.importActual("reactflow");
  const actionNodeId = "action-10-1762206971232";
  const reactionNodeId = "reaction-20-1762206971379";

  return {
    ...actual,
    useReactFlow: () => ({
      setNodes: vi.fn(),
      getNodes: vi.fn(() => [
        {
          id: actionNodeId,
          data: {
            values: { field1: "test" },
            item: {
              name: "Do Action",
              jsonFormat: { field1: "string" },
            },
          },
        },
        {
          id: reactionNodeId,
          data: {
            values: { field2: "test" },
            item: {
              name: "Do Reaction",
              jsonFormat: { field2: "string" },
            },
          },
        },
      ]),
      getEdges: vi.fn(() => []),
      getNode: vi.fn((nodeId: string) => {
        if (nodeId === reactionNodeId) {
          return {
            id: reactionNodeId,
            data: {
              values: { field2: "test" },
              item: {
                name: "Do Reaction",
                jsonFormat: { field2: "string" },
              },
            },
          };
        }
        return {
          id: actionNodeId,
          data: {
            values: { field1: "test" },
            item: {
              name: "Do Action",
              jsonFormat: { field1: "string" },
            },
          },
        };
      }),
    }),
  };
});
