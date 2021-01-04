import { jsn } from "../notebook";
import { History, CodeHistory } from "../history";
import { CodeCell, MarkdownCell, Cell, RawCell } from "@jupyterlab/cells";
import { ASTUtils } from "./ast-utils";
import { Checkpoint } from "../checkpoint";
import {
  SyntaxToken,
  NodeyCell,
  NodeyCode,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyNotebook,
  NodeyOutput,
  NodeyRawCell,
} from "../nodey";

export class ASTCreate {
  history: History;

  constructor(history: History) {
    this.history = history;
  }

  public createNotebook(options: NodeyNotebook.Options) {
    let notebook = new NodeyNotebook(options);
    this.history.store.store(notebook);
    return notebook;
  }

  public createMarkdown(options: NodeyMarkdown.Options) {
    let nodey = new NodeyMarkdown(options);
    this.history.store.store(nodey);
    return nodey;
  }

  public createCode(options: jsn) {
    let n = new NodeyCode(options);
    this.history.store.store(n);
    if ("content" in options) this.unpackContent(options, n);
    return n;
  }

  public createCodeCell(options: jsn) {
    let n = new NodeyCodeCell(options);
    this.history.store.store(n);
    if ("content" in options) this.unpackContent(options, n);
    return n;
  }

  public createSyntaxToken(tok: string) {
    return new SyntaxToken(tok);
  }

  public createOutput(options: NodeyOutput.Options, parent: NodeyCodeCell) {
    let output = new NodeyOutput(options);
    this.history.store.store(output);
    let cell_history = this.history.store.getHistoryOf(parent) as CodeHistory;
    cell_history.addOutput(parent.version, output);
    return output;
  }

  public createRawCell(options: jsn) {
    let nodey = new NodeyRawCell(options);
    this.history.store.store(nodey);
    return nodey;
  }

  public async fromCell(cell: Cell, checkpoint: Checkpoint) {
    let nodey: NodeyCell = null;
    if (cell instanceof CodeCell) {
      // First, create code cell from text
      let text: string = cell.editor.model.value.text;
      if (text.length > 0)
        nodey = await this.generateCodeNodey(text, checkpoint.id);
      else {
        nodey = this.createCodeCell({
          start: { line: 1, ch: 0 },
          end: { line: 1, ch: 0 },
          type: "Module",
          created: checkpoint.id,
        });
      }
      // Next, create output if there is output
      let output_raw = cell.outputArea.model.toJSON();
      if (output_raw.length > 0) {
        this.createOutput(
          {
            raw: output_raw,
            created: checkpoint.id,
            parent: nodey.name,
          },
          nodey as NodeyCodeCell
        );
      }
    } else if (cell instanceof MarkdownCell) {
      // create markdown cell from text
      let text = cell.model.value.text;
      nodey = this.createMarkdown({ markdown: text, created: checkpoint.id });
    } else if (cell instanceof RawCell) {
      // create raw cell from text
      let text: string = cell.editor.model.value.text;
      nodey = this.createRawCell({ literal: text, created: checkpoint.id });
    }
    return nodey;
  }

  public async generateCodeNodey(
    code: string,
    checkpoint: number
  ): Promise<NodeyCode> {
    let dict = await ASTUtils.parseRequest(code);
    dict["created"] = checkpoint;
    let nodey = this.createCodeCell(dict);
    return nodey;
  }

  private unpackContent(dict: { [id: string]: any }, parent: NodeyCode) {
    let prior = null;
    parent.content = [];
    for (let item in dict.content) {
      let raw = dict.content[item];
      raw["created"] = dict["created"];
      raw["prior"] = prior;
      raw["parent"] = parent.name;
      let child: NodeyCode = null;
      if (SyntaxToken.KEY in raw)
        parent.content.push(this.createSyntaxToken(raw[SyntaxToken.KEY]));
      else {
        child = this.createCode(raw);
        if (prior) prior.right = child.name;
        prior = child;
        parent.content.push(child.name);
      }
    }
    return parent;
  }
}
