import { promises as fs } from 'fs';
import path from 'path';

function normalizeRoute(route) {
  if (route === '/') {
    return '';
  }
  return route.replace(/^\/+|\/+$/g, '');
}

async function copyIndexHtml(indexHtmlPath, outputPath) {
  const html = await fs.readFile(indexHtmlPath, 'utf-8');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html, 'utf-8');
}

export default function prerenderPlugin(options = {}) {
  const routes = Array.isArray(options.routes) ? options.routes : [];
  const rootDir = options.root ?? process.cwd();
  const outDir = options.outDir ?? 'dist';

  return {
    name: 'vite-plugin-prerender-local',
    apply: 'build',
    async closeBundle() {
      if (routes.length === 0) {
        return;
      }

      const resolvedOutDir = path.resolve(rootDir, outDir);
      const indexHtmlPath = path.join(resolvedOutDir, 'index.html');

      try {
        await fs.access(indexHtmlPath);
      } catch (error) {
        console.warn('[vite-plugin-prerender] index.html not found at', indexHtmlPath);
        return;
      }

      for (const route of routes) {
        const normalized = normalizeRoute(route);
        const destination = normalized
          ? path.join(resolvedOutDir, normalized, 'index.html')
          : path.join(resolvedOutDir, 'index.html');

        if (!normalized) {
          // Skip duplicating the root index.html if it already exists.
          continue;
        }

        await copyIndexHtml(indexHtmlPath, destination);
      }
    },
  };
}

export { prerenderPlugin };
