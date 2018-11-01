import { CellListen } from "../jupyter-hooks/cell-listen";

export abstract class Nodey {
  id: number; //id for this node
  version: any; //chronological number
  readonly created: number; //id marking which checkpoint
  readonly parent: string; //lookup id for the parent Nodey of this Nodey

  constructor(options: { [id: string]: any }, cloneFrom?: Nodey) {
    if (cloneFrom) {
      this.id = cloneFrom.id;
      this.created = cloneFrom.created;
      this.parent = cloneFrom.parent;
    }
    if (options.id) this.id = options.id;
    if (options.created) this.created = options.created;
    if (options.parent) this.parent = options.parent;
  }

  get name(): string {
    return this.typeChar + "." + this.id + "." + this.version;
  }

  public toJSON(): { [id: string]: any } {
    return { created: this.created, parent: this.parent };
  }

  abstract get typeChar(): string;
}

/*
* Notebook holds a list of cells
*/
export class NodeyNotebook extends Nodey {
  cells: string[];

  constructor(options: { [id: string]: any }, cloneFrom?: NodeyNotebook) {
    super(options, cloneFrom);
    if (cloneFrom) {
      this.cells = cloneFrom.cells;
    }
    if (options.cells) this.cells = options.cells;
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
  raw: { [id: string]: any };

  constructor(options: { [id: string]: any }, cloneFrom?: NodeyOutput) {
    super(options, cloneFrom);
    if (cloneFrom) {
      this.raw = cloneFrom.raw;
    }
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
    return new NodeyOutput({ raw: {}, dependsOn: [] });
  }
}

/*
* Code holds AST details
*/
export class NodeyCode extends Nodey {
  type: string;
  output: string[] = [];
  content: any[];
  start: { line: number; ch: number };
  end: { line: number; ch: number };
  literal: any;
  right: string; // lookup id for the next Nodey to the right of this one

  constructor(options: { [id: string]: any }, cloneFrom?: NodeyCode) {
    super(options, cloneFrom);
    if (cloneFrom) {
      this.type = cloneFrom.type;
      if (cloneFrom.content) this.content = cloneFrom.content.slice(0);
      if (cloneFrom.output) this.output = cloneFrom.output.slice(0);
      this.literal = cloneFrom.literal;
      this.start = cloneFrom.start;
      this.end = cloneFrom.end;
      this.right = cloneFrom.right;
    }
    if (options.type) this.type = options.type;
    if (options.content) this.content = options.content;
    if (this.output) this.output = options.output;
    if (options.literal) this.literal = options.literal;
    if (options.start) this.start = options.start;
    if (options.end) this.end = options.end;
    if (options.right) this.right = options.right;
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

  getChildren() {
    if (!this.content || this.content.length === 0) return [];
    return this.content.filter(item => !(item instanceof SyntaxToken));
  }

  static EMPTY() {
    return new NodeyCode({ type: "EMPTY", content: [] });
  }
}

/*
* Cell-level nodey interface
*/
export interface NodeyCell extends Nodey {
  readonly cell: CellListen;
}

/*
* Code Cell-level nodey
*/
export class NodeyCodeCell extends NodeyCode implements NodeyCell {
  readonly cell: CellListen;

  constructor(options: { [id: string]: any }, cloneFrom?: NodeyCodeCell) {
    super(options, cloneFrom);
    if (cloneFrom) {
      this.cell = cloneFrom.cell;
    }
    if (options.cell) this.cell = options.cell;
  }

  get typeChar() {
    return "c";
  }
}

/*
* Markdown nodey
*/
export class NodeyMarkdown extends Nodey implements NodeyCell {
  readonly cell: CellListen;
  markdown: string;

  constructor(options: { [id: string]: any }, cloneFrom?: NodeyMarkdown) {
    super(options, cloneFrom);
    if (cloneFrom) {
      this.cell = cloneFrom.cell;
      this.markdown = cloneFrom.markdown;
    }
    if (options.cell) this.cell = options.cell;
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
