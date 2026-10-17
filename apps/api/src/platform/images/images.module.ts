import { ResvgSvgRenderer } from "@/adapters/images/resvg";
import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";

import { SvgRenderer } from "./ports";

export const imagesModule = defineModule({
  name: "images",

  register: () => {
    const renderer = new ResvgSvgRenderer();

    bind(SvgRenderer, () => renderer);
  },
});
