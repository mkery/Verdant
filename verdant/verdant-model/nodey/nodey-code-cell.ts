import { NodeyCell } from "./nodey";
import { NodeyCode } from "./nodey-code";

/*
 * Code Cell-level nodey
 */
export class NodeyCodeCell extends NodeyCode implements NodeyCell {
  get typeChar() {
    return "c";
  }

  // Note this is simplified from Nodey Code
  public toJSON(): NodeyCode.SERIALIZE {
    let jsn = super.toJSON() as NodeyCode.SERIALIZE;
    if (this.literal) jsn.literal = this.literal;
    jsn.start = this.start;
    jsn.end = this.end;
    return jsn;
  }
}

export namespace NodeyCodeCell {
  export function fromJSON(dat: NodeyCode.SERIALIZE): NodeyCodeCell {
    return new NodeyCodeCell({
      parent: dat.parent,
      created: dat.start_checkpoint,
      type: dat.type || "Module",
      content: dat.content || [],
      literal: dat.literal,
      start: dat.start,
      end: dat.end,
    });
  }
}
