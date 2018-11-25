type jsn = { [i: string]: any };

type NodeyOptions = {
  id?: number; //id for this node
  version?: any; //chronological number
  created?: number; //id marking which checkpoint
  parent?: string | number; //lookup id for the parent Nodey of this Nodey
  cells?: string[];
  raw?: { [i: string]: any };
  type?: string;
  output?: string[];
  content?: (SyntaxToken | string)[];
  start?: { line: number; ch: number };
  end?: { line: number; ch: number };
  literal?: any;
  right?: string;
  markdown?: string;
};

export abstract class Nodey {
  id: number; //id for this node
  version: any; //chronological number
  created: number; //id marking which checkpoint
  parent: string; //lookup id for the parent Nodey of this Nodey

  constructor(options: NodeyOptions) {
    this.id = options.id;
    if (options.created) this.created = options.created;
    if (options.parent) this.parent = options.parent + "";
  }

  get name(): string {
    return this.typeChar + "." + this.id + "." + this.version;
  }

  public toJSON(): { [i: string]: any } {
    return { created: this.created, parent: this.parent };
  }

  abstract get typeChar(): string;
}

/*
* Notebook holds a list of cells
*/
export class NodeyNotebook extends Nodey {
  cells: string[];

  constructor(options: NodeyOptions = {}) {
    super(options);
    if (options.cells && options.cells.length > 0)
      this.cells = options.cells.slice(0);
  }

  public toJSON() {
    return { created: this.created, cells: this.cells };
  }

  get typeChar() {
    return "n";
  }
}

/*
*  does not do anything. For syntax punctuation and new lines only
*/
export class SyntaxToken {
  tokens: string;

  constructor(tokens: string) {
    this.tokens = tokens;
  }
}

export namespace SyntaxToken {
  export const KEY = "syntok";
}

/*
* Output holds raw output
*/
export class NodeyOutput extends Nodey {
  raw: { [i: string]: any };

  constructor(options: NodeyOptions) {
    super(options);
    if (options.raw) this.raw = options.raw;
  }

  public toJSON() {
    let jsn = super.toJSON();
    jsn.raw = this.raw;
    return jsn;
  }

  get typeChar() {
    return "o";
  }

  static EMPTY() {
    return new NodeyOutput({ raw: {} });
  }
}

/*
* Code holds AST details
*/
export class NodeyCode extends Nodey {
  type: string;
  output: string[] = [];
  content: (SyntaxToken | string)[];
  start: { line: number; ch: number };
  end: { line: number; ch: number };
  literal: any;
  right: string; // lookup id for the next Nodey to the right of this one
  pendingUpdate: string;

  constructor(options: NodeyOptions) {
    super(options);
    this.type = options.type;
    if (options.content && options.content.length > 0)
      this.content = options.content.slice(0);
    if (options.output && options.output.length > 0)
      this.output = options.output.slice(0);
    this.literal = options.literal;
    this.start = options.start;
    this.end = options.end;
    this.right = options.right;
  }

  public toJSON() {
    let jsn = super.toJSON();
    jsn.type = this.type;
    jsn.output = this.output;
    if (this.content) jsn.content = this.content;
    if (this.literal) jsn.literal = this.literal;
    return jsn;
  }

  get typeChar() {
    return "s";
  }

  positionRelativeTo(target: NodeyCode) {
    //may run into historical targets that do not have position info
    let myStart = this.start || { line: 0, ch: 0 };
    if (target.start && target.end) {
      var deltaLine = Math.max(target.start.line - myStart.line, 0);
      var deltaCh = Math.max(target.start.ch - myStart.ch, 0);
      this.start = {
        line: deltaLine + this.start.line,
        ch: deltaCh + this.start.ch
      };
      this.end = { line: deltaLine + this.end.line, ch: deltaCh + this.end.ch };
    }
  }

  public hasChild(name: string) {
    return this.content.find(
      item => item instanceof SyntaxToken === false && item === name
    );
  }

  getOutput(): string[] {
    return this.output;
  }

  addOutput(name: string) {
    this.output.push(name);
  }

  public getChildren(): string[] {
    if (!this.content || this.content.length === 0) return [];
    return this.content.filter(
      item => !(item instanceof SyntaxToken)
    ) as string[];
  }

  static EMPTY() {
    return new NodeyCode({ type: "EMPTY", content: [] });
  }
}

/*
* Cell-level nodey interface
*/
export interface NodeyCell extends Nodey {}

/*
* Code Cell-level nodey
*/
export class NodeyCodeCell extends NodeyCode implements NodeyCell {
  constructor(options: NodeyOptions) {
    super(options);
  }

  get typeChar() {
    return "c";
  }
}

export namespace NodeyNotebook {
  export function fromJSON(dat: jsn): NodeyNotebook {
    return new NodeyNotebook({
      parent: dat.parent,
      created: dat.created
    });
  }
}

/*
* Markdown nodey
*/
export class NodeyMarkdown extends Nodey implements NodeyCell {
  markdown: string;

  constructor(options: NodeyOptions) {
    super(options);
    if (options.markdown) this.markdown = options.markdown;
  }

  public toJSON() {
    let jsn = super.toJSON();
    jsn.markdown = this.markdown;
    return jsn;
  }

  get typeChar() {
    return "c";
  }
}

export namespace NodeyOutput {
  export function fromJSON(dat: jsn): NodeyOutput {
    return new NodeyOutput({
      raw: dat.raw,
      parent: dat.parent,
      created: dat.created
    });
  }
}

export namespace NodeyCodeCell {
  export function fromJSON(dat: jsn): NodeyCodeCell {
    return new NodeyCodeCell({
      parent: dat.parent,
      created: dat.created,
      type: dat.type,
      content: dat.content,
      output: dat.output,
      literal: dat.literal
    });
  }
}

export namespace NodeyCode {
  export function fromJSON(dat: jsn): NodeyCode {
    return new NodeyCode({
      parent: dat.parent,
      created: dat.created,
      type: dat.type,
      content: dat.content,
      output: dat.output,
      literal: dat.literal
    });
  }
}

export namespace NodeyMarkdown {
  export function fromJSON(dat: jsn): NodeyMarkdown {
    return new NodeyMarkdown({
      parent: dat.parent,
      created: dat.created
    });
  }
}
