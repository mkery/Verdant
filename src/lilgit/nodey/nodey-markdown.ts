import { Nodey, NodeyCell } from "./nodey";
/*
 * Markdown nodey
 */
export class NodeyMarkdown extends Nodey implements NodeyCell {
  markdown: string;

  constructor(options: NodeyMarkdown.Options) {
    super(options);
    this.updateState(options);
  }

  public updateState(options: NodeyMarkdown.Options) {
    super.updateState(options);
    if (options.markdown) this.markdown = options.markdown;
  }

  public toJSON(): NodeyMarkdown.SERIALIZE {
    let jsn = super.toJSON() as NodeyMarkdown.SERIALIZE;
    jsn.markdown = this.markdown;
    return jsn;
  }

  get typeChar() {
    return "m";
  }
}

export namespace NodeyMarkdown {
  export type Options = {
    markdown: string;
  } & Nodey.Options;

  export interface SERIALIZE extends Nodey.SERIALIZE {
    markdown: string;
  }

  export function fromJSON(dat: NodeyMarkdown.SERIALIZE): NodeyMarkdown {
    return new NodeyMarkdown({
      parent: dat.parent,
      created: dat.start_checkpoint,
      markdown: dat.markdown,
    });
  }
}
