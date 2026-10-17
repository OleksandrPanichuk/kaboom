import { make, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { SvgRenderer } from "@/platform/images";

import { shareCardSvg } from "../share.card";
import { SHARE_IMAGE_WIDTH } from "../shares.constants";
import { SharesService } from "../shares.service";

export interface RenderShareImageUseCaseOptions {
  token: string;
}

type Options = RenderShareImageUseCaseOptions;
type Result = Uint8Array;

export class RenderShareImageUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(SharesService);

  private readonly renderer = make(SvgRenderer);

  public async execute({ token }: Options): Promise<Result> {
    const view = await this.service.viewByToken(token);

    return this.renderer.renderPng(
      shareCardSvg(view, this.renderer.fontFamilies),
      { width: SHARE_IMAGE_WIDTH },
    );
  }
}
