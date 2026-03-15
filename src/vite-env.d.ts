/// <reference types="vite/client" />

declare module 'plotly.js-dist-min' {
  const Plotly: {
    react: (el: HTMLElement, data: unknown, layout: unknown, opts?: unknown) => void;
  };
  export default Plotly;
}
