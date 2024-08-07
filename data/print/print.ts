import { exec } from "child_process";
import { newPage } from "@/util/browser";
import { deindent, indent, log } from "@/util/log";
import { allSettled } from "@/util/request";

const { PDF_PATH } = process.env;

/** us letter size, landscape, in css units */
const width = 11 * 96;
const height = 8.5 * 96;

/** regex pattern for where dashboard app is run in dev mode */
const hostPattern = /http:\/\/(localhost|(\d+\.\d+\.\d+\.\d+)):\d\d\d\d/;

/** render dashboard reports to PDF */
export const printReports = async (
  /** dashboard pages to render as reports */
  pages: { route: string; filename: string }[],
) => {
  log("Running app");

  /** run app */
  const dev = exec("yarn --cwd $APP_PATH dev", () => null);

  /** wait for dev server to be ready */
  const host = await new Promise<string>((resolve, reject) => {
    dev.stdout?.on("data", (chunk: string) => {
      const [host] = chunk.match(hostPattern) ?? [];
      if (host) resolve(host);
    });
    setTimeout(() => reject("Waiting for dev server timed out"), 5 * 1000);
  });

  log(`Running on ${host}`);

  log(`Printing ${pages.length.toLocaleString()} pages`);

  indent();
  /** run in parallel */
  const { results, errors } = await allSettled(
    pages,
    async ({ route, filename }: (typeof pages)[number]) => {
      /** go to route that shows report */
      const url = host + route;
      log(url, "start");
      const page = await newPage();
      await page.goto(url);

      /** wait for app to render */
      await page.emulateMedia({ media: "print" });
      await page.waitForSelector("main");

      /** force page resize event for e.g. auto-resizing charts */
      await page.setViewportSize({ width, height });

      /** wait for rendering, layout shifts, animations, etc. to finish */
      await page.waitForTimeout(2000);

      /** print pdf */
      await page.pdf({
        path: `${PDF_PATH}/${filename}.pdf`,
        format: "letter",
        landscape: true,
        width,
        height,
      });
    },
    (page) => log(page.route, "start"),
    (page) => log(page.route, "success"),
    (page) => log(page.route, "warn"),
  );
  deindent();

  /** close app */
  dev.kill();

  if (results.length)
    log(`Printed ${results.length.toLocaleString()} PDFs`, "success");
  if (errors.length) {
    for (const error of errors) log(error.value, "warn");
    log(`Error printing ${errors.length.toLocaleString()} PDFs`, "error");
  }
};
