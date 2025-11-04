/* eslint-disable @typescript-eslint/no-explicit-any */

import type React from "react";

declare global {
  namespace JSX {
    type Element = React.ReactElement;
    interface ElementClass extends React.Component<any> {
      render(): React.ReactNode;
    }
    interface ElementAttributesProperty {
      props: any;
    }
    interface ElementChildrenAttribute {
      children: any;
    }

    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
