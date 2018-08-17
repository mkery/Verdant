import * as renderers from "@jupyterlab/rendermime";
import { OutputAreaModel } from "@jupyterlab/outputarea";
import { nbformat } from "@jupyterlab/coreutils";

import { Widget } from "@phosphor/widgets";
import { JSONObject } from "@phosphor/coreutils";

import {
  MimeModel,
  IRenderMime,
  IRenderMimeRegistry,
  IOutputModel
} from "@jupyterlab/rendermime";

import { NodeyOutput } from "../model/nodey";

/*
*  Render baby exposes some basic markdown and code rendermine capability from JupyterLab.
*  It's a baby because it is only a small bit of Jupyter's rendermime system
*/
export class RenderBaby {
  latexTypesetter: renderers.ILatexTypesetter;
  linkHandler: any;
  rendermime: IRenderMimeRegistry;

  constructor(
    rendermime: IRenderMimeRegistry,
    latexTypesetter: renderers.ILatexTypesetter,
    linkHandler: any
  ) {
    this.latexTypesetter = latexTypesetter;
    this.linkHandler = linkHandler;
    this.rendermime = rendermime;
  }

  async renderMarkdown(div: HTMLElement, text: string) {
    return renderers.renderMarkdown({
      host: div as HTMLElement,
      source: text,
      shouldTypeset: true,
      trusted: true,
      sanitizer: null,
      resolver: null,
      linkHandler: this.linkHandler,
      latexTypesetter: this.latexTypesetter
    });
  }

  createModel(data: JSONObject): IRenderMime.IMimeModel {
    return new MimeModel({ data });
  }

  renderOutput(nodey: NodeyOutput) {
    let widget: Widget;
    let output: nbformat.IOutput = nodey.raw as nbformat.IOutput;
    let area: OutputAreaModel = new OutputAreaModel();
    area.fromJSON([output]);
    let model: IOutputModel = area.get(0);

    let mimeType = this.rendermime.preferredMimeType(model.data, "any");
    console.log("TRYING TO RENDER", nodey, model, mimeType);
    if (mimeType) {
      let output = this.rendermime.createRenderer(mimeType);
      output.renderModel(model).catch(error => {
        // Manually append error message to output
        output.node.innerHTML = `<pre>Javascript Error: ${error.message}</pre>`;
        // Remove mime-type-specific CSS classes
        output.node.className = "p-Widget jp-RenderedText";
        output.node.setAttribute(
          "data-mime-type",
          "application/vnd.jupyter.stderr"
        );
      });
      widget = output;
    } else {
      widget = new Widget();
      widget.node.innerHTML =
        `No renderer could be ` +
        "found for output. It has the following MIME types: " +
        Object.keys(nodey.raw).join(", ");
    }
    return widget;
  }
}
