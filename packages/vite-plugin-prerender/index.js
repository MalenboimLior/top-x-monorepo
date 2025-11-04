import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const MIME_TYPES = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function normalizeRoute(route) {
  if (route === '/') {
    return '';
  }
  return route.replace(/^\/+|\/+$/g, '');
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

function createStaticServer(rootDir) {
  const resolvedRoot = path.resolve(rootDir);

  return http.createServer((req, res) => {
    const handleRequest = async () => {
      try {
        const requestUrl = new URL(req.url ?? '/', 'http://localhost');
        const decodedPath = decodeURIComponent(requestUrl.pathname);
        const joinedPath = path.join(resolvedRoot, decodedPath);

        if (!joinedPath.startsWith(resolvedRoot)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        let filePath = joinedPath;
        let stats;

        try {
          stats = await fs.stat(filePath);
        } catch (error) {
          filePath = path.join(resolvedRoot, 'index.html');
          stats = await fs.stat(filePath);
        }

        if (stats.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }

        const data = await fs.readFile(filePath);
        res.writeHead(200, { 'Content-Type': getContentType(filePath) });
        res.end(data);
      } catch (error) {
        res.writeHead(404);
        res.end('Not Found');
      }
    };

    handleRequest().catch(() => {
      res.writeHead(500);
      res.end('Internal Server Error');
    });
  });
}

export default function prerenderPlugin(options = {}) {
  const routes = Array.isArray(options.routes) ? options.routes : [];
  const rootDir = options.root ?? process.cwd();
  const outDir = options.outDir ?? 'dist';
  const waitUntil = options.waitUntil ?? 'networkidle0';
  const puppeteerOptions = options.puppeteer ?? { headless: 'new' };
  const timeoutMs = typeof options.timeout === 'number' ? options.timeout : 90_000;
  const renderAfterDocumentEvent = typeof options.renderAfterDocumentEvent === 'string'
    ? options.renderAfterDocumentEvent
    : null;
  const postProcess = typeof options.postProcess === 'function' ? options.postProcess : null;
  const staticDir = options.staticDir ?? null;

  return {
    name: 'vite-plugin-prerender-local',
    apply: 'build',
    async closeBundle() {
      if (routes.length === 0) {
        return;
      }

      const resolvedOutDir = staticDir ? path.resolve(staticDir) : path.resolve(rootDir, outDir);
      const indexHtmlPath = path.join(resolvedOutDir, 'index.html');

      try {
        await fs.access(indexHtmlPath);
      } catch (error) {
        console.warn('[vite-plugin-prerender] index.html not found at', indexHtmlPath);
        return;
      }

      let server;
      let browser;

      try {
        server = createStaticServer(resolvedOutDir);

        await new Promise((resolve) => {
          server.listen(0, '127.0.0.1', resolve);
        });

        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : null;

        if (!port) {
          throw new Error('Failed to determine prerender server port');
        }

        const origin = `http://127.0.0.1:${port}`;

        browser = await puppeteer.launch(puppeteerOptions);

        for (const route of routes) {
          const page = await browser.newPage();
          page.setDefaultNavigationTimeout(timeoutMs);
          page.setDefaultTimeout(timeoutMs);
          const targetUrl = new URL(route, origin).toString();

          if (renderAfterDocumentEvent) {
            await page.evaluateOnNewDocument(() => {
              // Signal to the app that it runs in a prerender context
              // eslint-disable-next-line no-undef
              window.__PRERENDER_INJECTED = true;
            });
          }

          await page.goto(targetUrl, { waitUntil });

          if (renderAfterDocumentEvent) {
            await page.evaluate((eventName) => {
              return new Promise((resolve) => {
                const done = () => resolve(true);
                document.addEventListener(eventName, done, { once: true });
              });
            }, renderAfterDocumentEvent);
          }

          let html = await page.content();

          if (postProcess) {
            try {
              const processed = await postProcess({ html, route });
              if (processed && typeof processed.html === 'string') {
                html = processed.html;
              }
            } catch (e) {
              // swallow postProcess errors but continue writing original html
            }
          }

          const normalized = normalizeRoute(route);
          const destination = normalized
            ? path.join(resolvedOutDir, normalized, 'index.html')
            : path.join(resolvedOutDir, 'index.html');

          await fs.mkdir(path.dirname(destination), { recursive: true });
          await fs.writeFile(destination, html, 'utf-8');
          await page.close();
        }
      } catch (error) {
        console.error('[vite-plugin-prerender] Failed to prerender routes:', error);
      } finally {
        if (browser) {
          await browser.close();
        }

        if (server) {
          await new Promise((resolve) => server.close(resolve));
        }
      }
    },
  };
}

export { prerenderPlugin };
