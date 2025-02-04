import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  Page,
  PageScreenshotOptions,
  LocatorScreenshotOptions,
  ElementHandle,
} from "@playwright/test";

const screenshotFolder = "./screenshots";

const GLOBAL_STYLES = `
  /* Hide carets */
  * { caret-color: transparent !important; }

  /* Hide scrollbars */
  ::-webkit-scrollbar {
    display: none !important;
  }

  /* Generic hide */
  [data-visual-test="transparent"] {
    color: transparent !important;
    font-family: monospace !important;
    opacity: 0 !important;
  }
  
  [data-visual-test="removed"] {
    display: none !important;
  }
`;

// Check if the fonts are loaded
function waitForFontLoading() {
  return document.fonts.status === "loaded";
}

// Check if the images are loaded
function waitForImagesLoading() {
  return Array.from(document.images).every((img) => img.complete);
}

type LocatorOptions = Parameters<Page["locator"]>[1];

type ScreenshotOptions<
  TBase extends PageScreenshotOptions | LocatorScreenshotOptions
> = Omit<TBase, "encoding" | "type" | "omitBackground" | "path">;

export type ArgosScreenshotOptions = {
  /**
   * ElementHandle or string selector of the element to take a screenshot of.
   */
  element?: string | ElementHandle;
} & LocatorOptions &
  ScreenshotOptions<LocatorScreenshotOptions> &
  ScreenshotOptions<PageScreenshotOptions>;

export async function argosScreenshot(
  page: Page,
  name: string,
  { element, has, hasText, ...options }: ArgosScreenshotOptions = {}
) {
  if (!page) throw new Error("A Playwright `page` object is required.");
  if (!name) throw new Error("The `name` argument is required.");

  const handle =
    typeof element === "string"
      ? page.locator(element, { has, hasText })
      : element ?? page;

  mkdir(screenshotFolder, { recursive: true });

  await Promise.all([
    page.addStyleTag({ content: GLOBAL_STYLES }),
    page.waitForSelector('[aria-busy="true"]', { state: "hidden" }),
    page.waitForFunction(waitForImagesLoading),
    page.waitForFunction(waitForFontLoading),
  ]);

  await handle.screenshot({
    path: resolve(screenshotFolder, `${name}.png`),
    type: "png",
    fullPage: true,
    mask: [page.locator('[data-visual-test="blackout"]')],
    animations: "disabled",
    ...options,
  });
}
