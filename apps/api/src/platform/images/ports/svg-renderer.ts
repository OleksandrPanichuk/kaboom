import { Port } from "@/core/port";

export interface RenderPngOptions {
  width: number;
}

export abstract class SvgRenderer extends Port {
  public abstract readonly fontFamilies: { sans: string; mono: string };

  public abstract renderPng(
    svg: string,
    options: RenderPngOptions,
  ): Promise<Uint8Array>;
}
