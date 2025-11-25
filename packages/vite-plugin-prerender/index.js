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
  const concurrency = typeof options.concurrency === 'number' ? Math.max(1, options.concurrency) : 4;

  return {
    name: 'vite-plugin-prerender-local',
    apply: 'build',
    async closeBundle() {
      console.log('[vite-plugin-prerender] closeBundle() called');
      if (process.env.PRERENDER !== '1') {
        if (debug) console.log('[vite-plugin-prerender] Skipping prerender (PRERENDER env not set).');
        return;
      }

      if (routes.length === 0) {
        console.log('[vite-plugin-prerender] No routes to prerender');
        return;
      }

      console.log(`[vite-plugin-prerender] Starting prerender for ${routes.length} routes`);
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
        console.log('[vite-plugin-prerender] Creating static server...');
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
        console.log(`[vite-plugin-prerender] Server started on ${origin}`);

        console.log('[vite-plugin-prerender] Launching browser...');
        browser = await puppeteer.launch({
          protocolTimeout: timeoutMs,
          ...puppeteerOptions,
        });
        console.log(`[vite-plugin-prerender] Browser launched (concurrency: ${concurrency})`);

        // Process routes in parallel batches
        async function prerenderRoute(route, index) {
          console.log(`[vite-plugin-prerender] Prerendering route ${index + 1}/${routes.length}: ${route}`);
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
            return;
          }

          let html;
          try {
            html = await page.content();
          } catch (e) {
            if (debug) console.warn('[vite-plugin-prerender] Failed to get page content for route:', route, e?.message || e);
            await page.close();
            return;
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
          console.log(`[vite-plugin-prerender] ✓ Completed route ${index + 1}/${routes.length}: ${route}`);
        }

        // Process routes in parallel batches
        for (let i = 0; i < routes.length; i += concurrency) {
          const batch = routes.slice(i, i + concurrency);
          const batchPromises = batch.map((route, batchIndex) => 
            prerenderRoute(route, i + batchIndex).catch((error) => {
              console.error(`[vite-plugin-prerender] Failed to prerender route ${route}:`, error?.message || error);
              return null; // Continue with other routes even if one fails
            })
          );
          await Promise.all(batchPromises);
        }
        
        console.log('[vite-plugin-prerender] All routes prerendered, starting cleanup...');
      } catch (error) {
        console.error('[vite-plugin-prerender] Failed to prerender routes:', error);
      } finally {
        console.log('[vite-plugin-prerender] Entering cleanup (finally block)...');
        // Close browser with timeout to prevent hanging
        if (browser) {
          try {
            console.log('[vite-plugin-prerender] Closing browser pages...');
            const startTime = Date.now();
            // Get all pages and close them first
            const pages = await browser.pages();
            console.log(`[vite-plugin-prerender] Found ${pages.length} open pages`);
            await Promise.all(pages.map(page => page.close().catch(() => {})));
            console.log(`[vite-plugin-prerender] All pages closed (took ${Date.now() - startTime}ms)`);
            
            console.log('[vite-plugin-prerender] Closing browser...');
            const browserCloseStart = Date.now();
            // Close browser with timeout - if it hangs, kill the process
            try {
              await Promise.race([
                browser.close(),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Browser close timeout')), 2000)
                )
              ]);
            } catch (e) {
              console.warn('[vite-plugin-prerender] Browser close timed out, forcing disconnect...');
              // Force disconnect if close times out
              try {
                if (browser && browser.isConnected()) {
                  browser.disconnect();
                }
                // Try to kill the process directly as last resort
                try {
                  const browserProcess = browser.process();
                  if (browserProcess && browserProcess.pid && !browserProcess.killed) {
                    browserProcess.kill('SIGKILL');
                  }
                } catch (processError) {
                  // Ignore process kill errors
                }
              } catch (disconnectError) {
                // Ignore disconnect errors
              }
            }
            console.log(`[vite-plugin-prerender] Browser closed (took ${Date.now() - browserCloseStart}ms)`);
          } catch (e) {
            console.warn('[vite-plugin-prerender] Error closing browser:', e?.message || e);
            // Force disconnect as last resort
            if (browser && browser.isConnected()) {
              console.log('[vite-plugin-prerender] Force disconnecting browser...');
              browser.disconnect();
            }
          }
        } else {
          console.log('[vite-plugin-prerender] No browser to close');
        }

        // Close server - server.close() is synchronous for the close() call itself
        // The callback fires immediately when there are no active connections
        if (server) {
          try {
            console.log('[vite-plugin-prerender] Closing server...');
            const serverCloseStart = Date.now();
            if (server.listening) {
              // Close all connections first if available
              if (typeof server.closeAllConnections === 'function') {
                server.closeAllConnections();
              }
              // Then close the server - callback fires immediately if no connections
              await new Promise((resolve) => {
                server.close(() => {
                  console.log('[vite-plugin-prerender] Server close callback called');
                  resolve();
                });
              });
            }
            console.log(`[vite-plugin-prerender] Server closed (took ${Date.now() - serverCloseStart}ms)`);
          } catch (e) {
            console.warn('[vite-plugin-prerender] Error closing server:', e?.message || e);
          }
        } else {
          console.log('[vite-plugin-prerender] No server to close');
        }
        console.log('[vite-plugin-prerender] Cleanup complete, exiting closeBundle()');
      }
    },
  };
}

export { prerenderPlugin };
