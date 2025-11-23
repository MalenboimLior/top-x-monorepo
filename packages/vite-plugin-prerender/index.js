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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  const settleDelay = typeof options.settleDelay === 'number' ? options.settleDelay : 0;
  const debug = options.debug === true;

  return {
    name: 'vite-plugin-prerender-local',
    apply: 'build',
    async closeBundle() {
      if (process.env.PRERENDER !== '1') {
        if (debug) console.log('[vite-plugin-prerender] Skipping prerender (PRERENDER env not set).');
        return;
      }

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

        browser = await puppeteer.launch({
          protocolTimeout: timeoutMs,
          ...puppeteerOptions,
        });

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

          // Block third-party requests to avoid timeouts
          await page.setRequestInterception(true);
          page.on('request', (req) => {
            try {
              const url = new URL(req.url());
              if (url.origin !== origin) {
                return req.abort();
              }
              return req.continue();
            } catch (_) {
              return req.abort();
            }
          });

          if (debug) {
            page.on('console', (msg) => console.log('[prerender:console]', msg.type(), msg.text()));
            page.on('pageerror', (err) => console.warn('[prerender:pageerror]', err?.message || err));
            page.on('requestfailed', (req) => console.warn('[prerender:requestfailed]', req.url()));
          }

          // Wait for navigation to complete first
          let navigationResponse;
          try {
            navigationResponse = await Promise.race([
              page.goto(targetUrl, { waitUntil, timeout: timeoutMs }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('route-timeout')), timeoutMs)),
            ]);
            
            // Wait a bit for any client-side redirects to complete
            // This is especially important for redirect routes like /PrezPyramid
            await delay(500);
            
            // Check if page navigated again (client-side redirect)
            try {
              await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 2000 }).catch(() => {
                // No additional navigation, that's fine
              });
            } catch (_) {
              // Ignore navigation wait errors
            }
          } catch (e) {
            if (debug) console.warn('[vite-plugin-prerender] navigation guard:', route, e?.message || e);
            // Try to wait a bit for the page to stabilize
            await delay(1000);
          }

          // Now that navigation is complete (or failed), set up the event listener
          if (renderAfterDocumentEvent && !page.isClosed()) {
            try {
              await page.evaluate((eventName) => {
                return new Promise((resolve) => {
                  const done = () => resolve(true);
                  // Set up the event listener
                  document.addEventListener(eventName, done, { once: true });
                  // Fallback timeout in case event never fires
                  setTimeout(() => resolve(true), 10000);
                });
              }, renderAfterDocumentEvent);
            } catch (e) {
              if (debug) console.warn('[vite-plugin-prerender] event listener setup failed:', route, e?.message || e);
              // Continue anyway - the page might still be usable
            }
          }

          if (settleDelay > 0) {
            await delay(settleDelay);
          }

          // Check if page is still valid before getting content
          if (page.isClosed()) {
            if (debug) console.warn('[vite-plugin-prerender] Page was closed for route:', route);
            await page.close();
            continue;
          }

          let html;
          try {
            html = await page.content();
          } catch (e) {
            if (debug) console.warn('[vite-plugin-prerender] Failed to get page content for route:', route, e?.message || e);
            await page.close();
            continue;
          }

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
          // Write root route to root index.html, other routes to their respective folders
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
