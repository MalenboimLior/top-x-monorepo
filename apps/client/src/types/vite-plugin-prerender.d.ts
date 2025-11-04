declare module 'vite-plugin-prerender' {
  import type { Plugin } from 'vite';

  export interface PrerenderOptions {
    routes?: string[];
    root?: string;
    outDir?: string;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    puppeteer?: unknown;
    timeout?: number;
    settleDelay?: number;
    renderAfterDocumentEvent?: string;
    postProcess?: (args: { html: string; route?: string }) =>
      | { html: string; route?: string }
      | Promise<{ html: string; route?: string }>;
    staticDir?: string;
  }

  export default function prerender(options: PrerenderOptions): Plugin;
}


