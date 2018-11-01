import { CodeCell } from "@jupyterlab/cells";

import { HistoryModel } from "./history";

import {
  serialized_NodeyOutput,
  serialized_Nodey,
  serialized_NodeyCode,
  serialized_NodeyMarkdown,
  serialized_NodeyCodeCell
} from "../file-manager";

import {
  Nodey,
  NodeyCode,
  NodeyCell,
  NodeyOutput,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyNotebook,
  SyntaxToken
} from "./nodey";

/**
 * A namespace for Nodey statics.
 */
export namespace NodeyFactory {
  export function fromJSON(dat: serialized_Nodey): Nodey {
    switch (dat.typeName) {
      case "code":
        var codedat = dat as serialized_NodeyCode;
        var content = codedat.content;
        if (content) {
          content = content.map(item => {
            if (typeof item === "string" || item instanceof String) return item;
            else return new SyntaxToken(item[SyntaxToken.KEY]);
          });
        }
        return new NodeyCode({
          type: codedat.type,
          content: content,
          output: codedat.output,
          literal: codedat.literal,
          right: codedat.right,
          parent: codedat.parent,
          run: codedat.runs
        });
      case "codeCell":
        var codedat = dat as serialized_NodeyCode;
        var content = codedat.content;
        if (content) {
          content = content.map(item => {
            if (typeof item === "string" || item instanceof String) return item;
            else return new SyntaxToken(item[SyntaxToken.KEY]);
          });
        }
        return new NodeyCodeCell({
          type: codedat.type,
          output: codedat.output,
          content: content,
          literal: codedat.literal,
          right: codedat.right,
          parent: codedat.parent,
          run: codedat.runs
        });
      case "markdown":
        var markdat = dat as serialized_NodeyMarkdown;
        return new NodeyMarkdown({
          markdown: markdat.markdown,
          parent: markdat.parent,
          run: markdat.runs
        });
      default:
        return;
    }
  }

  export function outputFromJSON(dat: serialized_NodeyOutput): NodeyOutput {
    return new NodeyOutput({
      raw: dat.raw,
      parent: dat.parent,
      run: dat.runs
    });
  }

  export function dictToCodeCellNodey(
    dict: { [id: string]: any },
    position: number,
    historyModel: HistoryModel,
    forceTie: string = null
  ) {
    if ("start" in dict === false) {
      dict.start = { line: 1, ch: 0 };
      dict.end = { line: 1, ch: 0 };
    }
    if ("type" in dict === false) {
      dict.type = "Module";
    }

    dict.start.line -= 1; // convert the coordinates of the range to code mirror style
    dict.end.line -= 1;
    dict.start.ch -= 1;
    dict.end.ch -= 1;

    var n = new NodeyCodeCell(dict);
    if (forceTie) {
      // only occurs when cells change type from code/markdown
      historyModel.registerTiedNodey(n, forceTie);
    } else historyModel.registerCellNodey(n, position);

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
    dict.start.ch -= 1;
    dict.end.ch -= 1;

    // give every node a nextNode so that we can shift/walk for repairs
    var n = new NodeyCode(dict);
    historyModel.store(n);

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
    position: number,
    historyModel: HistoryModel,
    cell: CellListen,
    forceTie: string = null
  ) {
    var n = new NodeyMarkdown({ markdown: text, cell: cell });
    if (forceTie) {
      // only occurs when cells change type from code/markdown
      historyModel.registerTiedNodey(n, forceTie);
    } else historyModel.registerCellNodey(n, position);
    return n;
  }

  export function outputToNodey(
    cell: CodeCell,
    historyModel: HistoryModel,
    oldOutput: NodeyOutput[] = null,
    runId: number = -1
  ): string[] {
    let outarea = cell.outputArea;
    if (!outarea) return []; // no output!

    var output = cell.outputArea.model.toJSON();

    if (oldOutput) {
      // need to check if the output is different
      if (
        JSON.stringify(output) === JSON.stringify(oldOutput.map(out => out.raw))
      )
        return []; //outputs are the same don't bother
    }

    var outNode: string[] = [];

    if (output.length > 0) {
      for (var item in output) {
        var out = dictToOutputNodey(output[item], historyModel);
        if (runId !== -1) out.run.push(runId);
        outNode.push(out.name);
      }
    }
    return outNode;
  }

  function dictToOutputNodey(
    output: { [id: string]: any },
    historyModel: HistoryModel
  ) {
    var n = new NodeyOutput({ raw: output });
    historyModel.store(n);
    return n;
  }
}
