import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { TOOL_SLUGS } from "../shared/tool-registry";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PRERENDER_PORT ?? 5998);
const BASE = `http://127.0.0.1:${PORT}`;
const DIST_PUBLIC = path.resolve(__dirname, "../dist/public");
const STATIC_PAGES = ["/", "/workflow", "/pricing", "/privacy", "/terms", "/contact"];
const routes = [...STATIC_PAGES, ...TOOL_SLUGS.map((slug) => `/tools/${slug}`)];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error(`prerender: server did not start on ${BASE}`);
}

async function main(): Promise<void> {
  const server = spawn("node", ["dist/index.cjs"], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
    stdio: "ignore",
  });

  try {
    await waitForServer();
    const browser = await chromium.launch();
    const page = await browser.newPage();

    let written = 0;
    for (const route of routes) {
      try {
        await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 20_000 });
      } catch {
        // networkidle can be flaky with SW registration; content is usually ready
      }
      await page.waitForSelector("#root > *", { timeout: 15_000 });
      const html = await page.content();
      const file = route === "/" ? "index.html" : `${route.slice(1)}.html`;
      const target = path.join(DIST_PUBLIC, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, html);
      written += 1;
    }

    await browser.close();
    console.log(`prerender: wrote ${written}/${routes.length} pages into dist/public`);
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
