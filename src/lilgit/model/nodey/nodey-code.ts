import { Nodey } from "./nodey";
import { NodeyOutput } from "./nodey-output";

/*
 * Code holds AST details
 */
export class NodeyCode extends Nodey {
  type: string;
  content: (SyntaxToken | string)[] = [];
  start: NodeyCode.Pos;
  end: NodeyCode.Pos;
  literal: any;
  right: string; // lookup id for the next Nodey to the right of this one
  pendingUpdate: string;
  // output
  outputId: number;
  outputVer: any;

  constructor(options: NodeyCode.Options) {
    super(options);
    this.updateState(options);
  }

  public updateState(options: NodeyCode.Options) {
    super.updateState(options);
    this.type = options.type;
    if (options.content && options.content.length > 0) {
      this.content = options.content.slice(0);
      this.content = this.content.map((item) => {
        if (item instanceof SyntaxToken) return item;
        if (typeof item == "string") return item;
        else return new SyntaxToken(item); // fresh from a JSON file
      });
    }
    if (options.outputId !== undefined) this.outputId = options.outputId;
    if (options.outputVer !== undefined) this.outputVer = options.outputVer;
    this.literal = options.literal;
    this.start = options.start;
    this.end = options.end;
    this.right = options.right;
  }

  public toJSON(): NodeyCode.SERIALIZE {
    let jsn = super.toJSON() as NodeyCode.SERIALIZE;
    // jsn.type = this.type;
    jsn.output = "o." + this.outputId + "." + this.outputVer;
    // if (this.content) jsn.content = this.content;
    if (this.literal) jsn.literal = this.literal;
    jsn.start = this.start;
    jsn.end = this.end;
    return jsn;
  }

  get typeChar() {
    return "s";
  }

  get output(): string {
    if (this.outputVer !== undefined)
      // may be 0
      return NodeyOutput.typeChar + "." + this.outputId + "." + this.outputVer;
    else return null;
  }

  set output(name: string) {
    let parts = name.split(".");
    this.outputId = parseInt(parts[1]);
    this.outputVer = parts[2];
  }

  positionRelativeTo(target: NodeyCode) {
    if (!target) return;
    //may run into historical targets that do not have position info
    let myStart = this.start || { line: 0, ch: 0 };
    if (target.start && target.end) {
      var deltaLine = Math.max(target.start.line - myStart.line, 0);
      var deltaCh = Math.max(target.start.ch - myStart.ch, 0);
      this.start = {
        line: deltaLine + this.start.line,
        ch: deltaCh + this.start.ch,
      };
      this.end = { line: deltaLine + this.end.line, ch: deltaCh + this.end.ch };
    }
  }

  public hasChild(name: string) {
    return this.content.find(
      (item) => item instanceof SyntaxToken === false && item === name
    );
  }

  public getChildren(): string[] {
    if (!this.content || this.content.length === 0) return [];
    return this.content.filter(
      (item) => !(item instanceof SyntaxToken)
    ) as string[];
  }
}

export namespace NodeyCode {
  export type Pos = { line: number; ch: number };

  export const EMPTY = () => {
    return new NodeyCode({ type: "EMPTY", content: [] });
  };

  export type Options = {
    type?: string;
    outputId?: number;
    outputVer?: any;
    content?: (SyntaxToken | string)[];
    start?: Pos;
    end?: Pos;
    right?: string;
    literal?: any;
  } & Nodey.Options;

  export type OutputPointer = {
    outputId: number;
    outputVer: string;
  };

  export interface SERIALIZE extends Nodey.SERIALIZE {
    type?: string;
    output: string;
    content?: any[];
    literal: string;
    start?: Pos;
    end?: Pos;
  }

  export function fromJSON(dat: NodeyCode.SERIALIZE): NodeyCode {
    let output = parseOutputPointer(dat);
    return new NodeyCode({
      parent: dat.parent,
      created: dat.start_checkpoint,
      type: dat.type,
      content: dat.content,
      literal: dat.literal,
      start: dat.start,
      end: dat.end,
      ...output,
    });
  }

  export function parseOutputPointer(dat: any): OutputPointer {
    try {
      let rawOut = dat.output.split(".");
      return { outputId: parseInt(rawOut[1]), outputVer: rawOut[2] };
    } catch (error) {
      // for older log format
      return { outputId: dat["outputId"], outputVer: dat["outputVer"] };
    }
  }
}

/*
 *  does not do anything. For syntax punctuation and new lines only
 */
export class SyntaxToken {
  tokens: string;

  constructor(tokens: string | { tokens: string }) {
    if (typeof tokens == "string") this.tokens = tokens;
    else this.tokens = tokens.tokens;
  }
}

export namespace SyntaxToken {
  export const KEY = "syntok";
}
