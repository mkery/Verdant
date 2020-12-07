import { Nodey } from "./nodey";
import { log } from "../notebook";
import * as nbformat from "@jupyterlab/nbformat";

/*
 * Output holds raw output
 */
export class NodeyOutput extends Nodey {
  raw: nbformat.IOutput[] = [];

  constructor(options: NodeyOutput.Options) {
    super(options);
    this.updateState(options);
  }

  public updateState(options: NodeyOutput.Options) {
    super.updateState(options);
    if (options.raw) this.raw = options.raw;
  }

  public toJSON(): NodeyOutput.SERIALIZE {
    let jsn = super.toJSON() as NodeyOutput.SERIALIZE;
    jsn.raw = this.raw;
    return jsn;
  }

  get typeChar() {
    return NodeyOutput.typeChar;
  }
}

export namespace NodeyOutput {
  export const EMPTY = () => new NodeyOutput({ raw: [] });

  export const typeChar = "o";

  export type Options = {
    raw: nbformat.IOutput[];
  } & Nodey.Options;

  export interface SERIALIZE extends Nodey.SERIALIZE {
    raw: { [key: string]: any }[];
  }

  export function fromJSON(dat: NodeyOutput.SERIALIZE): NodeyOutput {
    return new NodeyOutput({
      raw: dat.raw as nbformat.IOutput[],
      parent: dat.parent,
      created: dat.start_checkpoint,
    });
  }

  // ref: https://stackoverflow.com/questions/26049303/how-to-compare-two-json-have-the-same-properties-without-order
  export function equals(a: any, b: any): boolean {
    log("COMPARING", a, b);
    if (a === null || a === undefined || b === null || b === undefined) {
      return a === b;
    }
    if (a === b) {
      return true;
    }

    /*log("TYPE OF A", typeof a, typeof b);
    if (
      typeof a === "object" &&
      typeof b === "object" &&
      a.valueOf() === b.valueOf()
    ) {
      return true;
    }*/

    // if one of them is date, they must had equal valueOf
    if (a instanceof Date) {
      return false;
    }
    if (b instanceof Date) {
      return false;
    }

    // if they are not function or strictly equal, they both need to be Objects
    if (!(a instanceof Object)) {
      return false;
    }
    if (!(b instanceof Object)) {
      return false;
    }

    var p = Object.keys(a);
    return Object.keys(b).every(function (i) {
      return p.indexOf(i) !== -1;
    })
      ? p.every(function (i) {
          return NodeyOutput.equals(a[i], b[i]);
        })
      : false;
  }
}
