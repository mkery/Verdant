import * as renderers from "@jupyterlab/rendermime";

/*
*  Render baby exposes some basic markdown and code rendermine capability from JupyterLab.
*  It's a baby because it is only a small bit of Jupyter's rendermime system
*/
export class RenderBaby {
  latexTypesetter: renderers.ILatexTypesetter;
  linkHandler: any;

  constructor(latexTypesetter: renderers.ILatexTypesetter, linkHandler: any) {
    this.latexTypesetter = latexTypesetter;
    this.linkHandler = linkHandler;
  }

  renderMarkdown(div: HTMLElement, text: string) {
    renderers.renderMarkdown({
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
}
