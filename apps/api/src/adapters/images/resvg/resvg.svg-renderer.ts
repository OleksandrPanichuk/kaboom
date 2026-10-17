import { fileURLToPath } from "node:url";

import { Resvg } from "@resvg/resvg-js";

import {
  type RenderPngOptions,
  SvgRenderer,
} from "@/platform/images/ports/svg-renderer";

import geistRegular from "./fonts/Geist-Regular.ttf" with { type: "file" };
import geistSemiBold from "./fonts/Geist-SemiBold.ttf" with { type: "file" };
import geistMono from "./fonts/GeistMono-Regular.ttf" with { type: "file" };
import { MONO_FAMILY, SANS_FAMILY } from "./resvg.constants";

const FONT_FILES = [geistRegular, geistSemiBold, geistMono].map((path) =>
  fileURLToPath(new URL(path, import.meta.url)),
);

export class ResvgSvgRenderer extends SvgRenderer {
  public readonly fontFamilies = { sans: SANS_FAMILY, mono: MONO_FAMILY };

  public renderPng(
    svg: string,
    { width }: RenderPngOptions,
  ): Promise<Uint8Array> {
    const rendered = new Resvg(svg, {
      fitTo: { mode: "width", value: width },
      font: {
        fontFiles: FONT_FILES,
        loadSystemFonts: false,
        defaultFontFamily: SANS_FAMILY,
      },
    }).render();

    return Promise.resolve(rendered.asPng());
  }
}
