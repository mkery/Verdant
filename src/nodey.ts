import { CellListen } from "./jupyter-hooks/cell-listen";

import { HistoryModel } from "./history-model";

import {
  serialized_NodeyOutput,
  serialized_Nodey,
  serialized_NodeyCode,
  serialized_NodeyMarkdown
} from "./file-manager";

export abstract class Nodey {
  private node_id: number; //id for this node
  private version_id: any; //chronological number
  run: string; //id marking which run
  timestamp: Date; //timestamp when created
  pendingUpdate: string;
  parent: string; //lookup id for the parent Nodey of this Nodey

  constructor(options: { [id: string]: any }) {
    this.node_id = options.id;
    this.run = options.run;
    this.timestamp = options.timestamp;
    this.parent = options.parent;
  }

  get name(): string {
    return this.node_id + "." + this.version_id;
  }

  get id(): any {
    return this.node_id;
  }

  set id(val: any) {
    this.node_id = val;
  }

  get version(): any {
    return this.version_id;
  }

  set version(verNum: any) {
    this.version_id = verNum;
  }

  abstract clone(): Nodey;

  abstract toJSON(): serialized_Nodey;

  abstract typeName(): string;
}

/*
*  does not do anything. For syntax punctuation and new lines only
*/
export class SyntaxToken {
  tokens: string;

  constructor(tokens: string) {
    this.tokens = tokens;
  }

  toJSON(): { [id: string]: any } {
    return { syntok: this.tokens };
  }
}

export namespace SyntaxToken {
  export const KEY = "syntok";
}

export class NodeyOutput extends Nodey {
  dependsOn: Nodey[];
  raw: {};

  constructor(options: { [id: string]: any }) {
    super(options);
    this.raw = options; // note for different output types, the data is all named differently
    this.dependsOn = (<any>options)["dependsOn"];
  }

  static EMPTY() {
    return new NodeyOutput({ raw: {}, dependsOn: [] });
  }

  clone(): Nodey {
    return new NodeyOutput({
      dependsOn: this.dependsOn,
      raw: this.raw,
      id: this.id,
      parent: this.parent
    });
  }

  toJSON(): serialized_NodeyOutput {
    return { output: this.raw }; //TODO
  }

  typeName(): string {
    return "output";
  }
}

export class NodeyCode extends Nodey {
  type: string;
  output: string[];
  content: any[];
  start: { line: number; ch: number };
  end: { line: number; ch: number };
  literal: any;
  right: string; // lookup id for the next Nodey to the right of this one

  constructor(options: { [id: string]: any }) {
    super(options);
    this.type = options.type;
    this.content = options.content;
    this.output = (<any>options)["output"];
    this.literal = options.literal;
    this.start = options.start;
    this.end = options.end;
    this.right = options.right;
  }

  positionRelativeTo(target: NodeyCode) {
    var deltaLine = target.start.line;
    var deltaCh = target.start.ch;
    this.start = {
      line: deltaLine + this.start.line,
      ch: deltaCh + this.start.ch
    };
    this.end = { line: deltaLine + this.end.line, ch: deltaCh + this.end.ch };
  }

  getChildren() {
    return this.content.filter(item => !(item instanceof SyntaxToken));
  }

  toJSON(): serialized_NodeyCode {
    var jsn: serialized_NodeyCode = { type: this.type };
    if (this.literal) jsn.literal = this.literal;
    if (this.output && this.output.length > 0) {
      jsn.output = this.output;
    }
    if (this.content && this.content.length > 0)
      jsn.content = this.content.map(item => {
        if (item instanceof SyntaxToken) return item.toJSON();
        return item;
      });

    return jsn;
  }

  clone(): Nodey {
    //really important to slice the content array or it references, instead of copies, the list
    return new NodeyCode({
      type: this.type,
      content: this.content.slice(0),
      literal: this.literal,
      start: this.start,
      end: this.end,
      right: this.right,
      id: this.id,
      parent: this.parent
    });
  }

  typeName(): string {
    return "code";
  }

  static EMPTY() {
    return new NodeyCode({ type: "EMPTY", content: [] });
  }
}

/*
* Cell-level nodey
*/
export interface NodeyCell extends Nodey {
  cell: CellListen;
  starNodes: Nodey[];
}

export class NodeyCodeCell extends NodeyCode implements NodeyCell {
  cell: CellListen;
  starNodes: NodeyCode[];

  constructor(options: { [id: string]: any }) {
    super(options);
    this.cell = options.cell;
  }

  clone(): Nodey {
    var node = super.clone() as NodeyCodeCell;
    node.cell = this.cell;
    return node;
  }
}

export class NodeyMarkdown extends Nodey implements NodeyCell {
  markdown: string;
  cell: CellListen;
  starNodes: NodeyMarkdown[];

  constructor(options: { [id: string]: any }) {
    super(options);
    this.cell = options.cell;
    this.markdown = options.markdown;
  }

  clone(): Nodey {
    return new NodeyMarkdown({
      markdown: this.markdown,
      id: this.id,
      parent: this.parent,
      cell: this.cell
    });
  }

  toJSON(): serialized_NodeyMarkdown {
    return { markdown: this.markdown };
  }

  typeName(): string {
    return "markdown cell";
  }
}

/**
 * A namespace for Nodey statics.
 */
export namespace Nodey {
  export function dictToCodeCellNodey(
    dict: { [id: string]: any },
    historyModel: HistoryModel
  ) {
    dict.start.line -= 1; // convert the coordinates of the range to code mirror style
    dict.end.line -= 1;

    var n = new NodeyCodeCell(dict);
    historyModel.registerCellNodey(n);

    dictToCodeChildren(dict, historyModel, n);
    return n;
  }

  export function dictToCodeNodeys(
    dict: { [id: string]: any },
    historyModel: HistoryModel,
    prior: NodeyCode = null
  ): NodeyCode {
    dict.start.line -= 1; // convert the coordinates of the range to code mirror style
    dict.end.line -= 1;

    // give every node a nextNode so that we can shift/walk for repairs
    var n = new NodeyCode(dict);
    historyModel.registerNodey(n);

    if (prior) prior.right = n.name;

    dictToCodeChildren(dict, historyModel, n);
    return n;
  }

  function dictToCodeChildren(
    dict: { [id: string]: any },
    historyModel: HistoryModel,
    n: NodeyCode
  ) {
    var prior = null;
    n.content = [];
    for (var item in dict.content) {
      if (SyntaxToken.KEY in dict.content[item]) {
        console.log(
          "Found snytax token!",
          dict.content[item][SyntaxToken.KEY],
          n.id
        );
        n.content.push(new SyntaxToken(dict.content[item][SyntaxToken.KEY]));
      } else {
        var child = dictToCodeNodeys(dict.content[item], historyModel, prior);
        child.parent = n.name;
        if (prior) prior.right = child.name;
        n.content.push(child.name);
        prior = child;
      }
    }

    return n;
  }

  export function dictToMarkdownNodey(
    text: string,
    historyModel: HistoryModel,
    cell: CellListen
  ) {
    var n = new NodeyMarkdown({ markdown: text, cell: cell });
    historyModel.registerCellNodey(n);
    return n;
  }

  export function dictToOutputNodey(
    output: { [id: string]: any },
    historyModel: HistoryModel
  ) {
    var n = new NodeyOutput(output);
    historyModel.registerOutputNodey(n);
    return n;
  }
}
