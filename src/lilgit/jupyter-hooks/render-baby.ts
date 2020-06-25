import * as renderers from "@jupyterlab/rendermime";
import { OutputAreaModel } from "@jupyterlab/outputarea";
import * as nbformat from "@jupyterlab/nbformat";

import { Widget } from "@lumino/widgets";
import { JSONObject } from "@lumino/coreutils";

import {
  MimeModel,
  IRenderMime,
  IRenderMimeRegistry,
  IOutputModel,
} from "@jupyterlab/rendermime";

import { NodeyOutput } from "../../lilgit/nodey/";

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
      latexTypesetter: this.latexTypesetter,
    });
  }

  createModel(data: JSONObject): IRenderMime.IMimeModel {
    return new MimeModel({ data });
  }

  async renderOutput(nodey: NodeyOutput) {
    return await Promise.all(
      nodey.raw.map(async (output: nbformat.IOutput) => {
        let widget: Widget;
        let area: OutputAreaModel = new OutputAreaModel();
        area.fromJSON([output]);
        let model: IOutputModel = area.get(0);

        let mimeType = this.rendermime.preferredMimeType(model.data, "any");
        if (mimeType) {
          let output = this.rendermime.createRenderer(mimeType);
          await output.renderModel(model).catch((error) => {
            // Manually append error message to output
            output.node.innerHTML = `<pre>Javascript Error: ${error.message}</pre>`;
            // Remove mime-type-specific CSS classes
            output.node.className = "p-Widget jp-RenderedText";
            output.node.setAttribute(
              "data-mime-type",
              "application/vnd.jupyter.stderr"
            );
          });
          /*output.node.getElementsByTagName(
          "pre"
        )[0].outerHTML = `<div>${output.node
          .getElementsByTagName("pre")[0]
          .innerHTML.replace(/\n/g, "<br/>")}</div>`; // attempt to remove pre tags*/
          widget = output;
        } else {
          widget = new Widget();
          widget.node.innerHTML =
            `No renderer could be ` +
            "found for output. It has the following MIME types: " +
            Object.keys(nodey.raw).join(", ");
        }
        return widget;
      })
    );
  }
}
