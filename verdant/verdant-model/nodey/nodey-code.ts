import { Nodey } from "./nodey";

/*
 * Code holds AST details
 */
export class NodeyCode extends Nodey {
  type: string = "module"; // default top-level AST type is module
  content: (SyntaxToken | string)[] = [];
  start: NodeyCode.Pos;
  end: NodeyCode.Pos;
  literal: string | undefined;
  right: string | undefined; // lookup id for the next Nodey to the right of this one

  constructor(options: NodeyCode.Options) {
    super(options);
    this.updateState(options);
  }

  public updateState(options: NodeyCode.Options) {
    super.updateState(options);
    this.type = options.type || "module";
    if (options.content && options.content.length > 0) {
      this.content = options.content.slice(0);
      this.content = this.content.map((item) => {
        if (item instanceof SyntaxToken) return item;
        if (typeof item == "string") return item;
        else return new SyntaxToken(item); // fresh from a JSON file
      });
    }
    this.literal = options.literal;
    this.start = options.start;
    this.end = options.end;
    this.right = options.right;
  }

  public toJSON(): NodeyCode.SERIALIZE {
    let jsn = super.toJSON() as NodeyCode.SERIALIZE;
    // jsn.type = this.type;
    // if (this.content) jsn.content = this.content;
    if (this.literal) jsn.literal = this.literal;
    if (this.start) jsn.start = this.start;
    if (this.end) jsn.end = this.end;
    return jsn;
  }

  get typeChar() {
    return "s";
  }

  positionRelativeTo(target: NodeyCode) {
    if (!target) return;
    //may run into historical targets that do not have position info
    this.start = this.start || { line: 0, ch: 0 };
    this.end = this.end || { line: 0, ch: 0 };

    if (target.start && target.end) {
      var deltaLine = Math.max(target.start.line - this.start.line, 0);
      var deltaCh = Math.max(target.start.ch - this.start.ch, 0);
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
  export type Pos = { line: number; ch: number } | undefined;

  export const EMPTY = () => {
    return new NodeyCode({ type: "EMPTY", content: [] });
  };

  export const typeChar = "c";

  export type Options = {
    type?: string;
    content?: (SyntaxToken | string)[];
    start?: Pos;
    end?: Pos;
    right?: string;
    literal?: any;
  } & Nodey.Options;

  export interface SERIALIZE extends Nodey.SERIALIZE {
    type?: string;
    content?: any[];
    literal: string;
    start?: Pos;
    end?: Pos;
  }

  export function fromJSON(dat: NodeyCode.SERIALIZE): NodeyCode {
    return new NodeyCode({
      parent: dat.parent,
      created: dat.start_checkpoint,
      type: dat.type,
      content: dat.content,
      literal: dat.literal,
      start: dat.start,
      end: dat.end,
    });
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
