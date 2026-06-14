"use client";
import Script from "next/script";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "lemon-slice-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "agent-id"?: string;
        "custom-minimized-width"?: string;
        "custom-minimized-height"?: string;
        "custom-active-width"?: string;
        "custom-active-height"?: string;
        "show-minimize-button"?: string;
        "initial-state"?: string;
      };
    }
  }
}

export function JoshyWidget() {
  return (
    <>
      <lemon-slice-widget
        agent-id="agent_d0c784422b69f5f4"
        custom-minimized-width="144"
        custom-minimized-height="216"
        custom-active-width="252"
        custom-active-height="377"
        show-minimize-button="true"
        initial-state="minimized"
      />
      <Script
        type="module"
        src="https://unpkg.com/@lemonsliceai/lemon-slice-widget"
        strategy="lazyOnload"
      />
    </>
  );
}
