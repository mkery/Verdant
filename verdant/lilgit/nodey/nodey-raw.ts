import { Nodey, NodeyCell } from "./nodey";

/*
 * Simple raw cell type (rare, since most cells are code or markdown)
 */
export class NodeyRawCell extends Nodey implements NodeyCell {
  literal: string | undefined;

  constructor(options: NodeyRawCell.Options) {
    super(options);
    this.updateState(options);
  }

  public updateState(options: NodeyRawCell.Options) {
    super.updateState(options);
    if (options.literal) this.literal = options.literal;
  }

  public toJSON(): NodeyRawCell.SERIALIZE {
    let jsn = super.toJSON() as NodeyRawCell.SERIALIZE;
    if (this.literal) jsn.literal = this.literal;
    return jsn;
  }

  get typeChar() {
    return "r";
  }
}

export namespace NodeyRawCell {
  export type Options = {
    literal?: any;
  } & Nodey.Options;

  export interface SERIALIZE extends Nodey.SERIALIZE {
    literal?: string;
  }

  export function fromJSON(dat: NodeyRawCell.SERIALIZE): NodeyRawCell {
    return new NodeyRawCell({
      parent: dat.parent,
      created: dat.start_checkpoint,
      literal: dat.literal,
    });
  }
}
