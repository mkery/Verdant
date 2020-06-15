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
    jsn.output = "o." + this.outputId + "." + this.outputVer;
    if (this.literal) jsn.literal = this.literal;
    jsn.start = this.start;
    jsn.end = this.end;
    return jsn;
  }
}

export namespace NodeyCodeCell {
  export function fromJSON(dat: NodeyCode.SERIALIZE): NodeyCodeCell {
    let output = NodeyCode.parseOutputPointer(dat);

    return new NodeyCodeCell({
      parent: dat.parent,
      created: dat.start_checkpoint,
      type: dat.type || "Module",
      content: dat.content || [],
      literal: dat.literal,
      start: dat.start,
      end: dat.end,
      ...output,
    });
  }
}
