import { HistoryStore } from "./history-store";

import {
  Nodey,
  NodeyCode,
  NodeyOutput,
  NodeyCodeCell,
  NodeyMarkdown,
  SyntaxToken
} from "./nodey";

/* TODO temporary type
*/
type jsn = { [id: string]: any };

/**
 * A namespace for Nodey statics.
 */
export namespace NodeyFactory {
  export function fromJSON(dat: jsn): Nodey {
    switch (dat.typeName) {
      case "code":
        if (dat.content) {
          dat.content = dat.content.map((item: any) => {
            if (typeof item === "string" || item instanceof String) return item;
            else return new SyntaxToken(item[SyntaxToken.KEY]);
          });
        }
        return NodeyCode.fromJSON(dat);
      case "codeCell":
        if (dat.content) {
          dat.content = dat.content.map((item: any) => {
            if (typeof item === "string" || item instanceof String) return item;
            else return new SyntaxToken(item[SyntaxToken.KEY]);
          });
        }
        return NodeyCodeCell.fromJSON(dat);
      case "markdown":
        return NodeyMarkdown.fromJSON(dat);
      default:
        return;
    }
  }

  export function outputFromJSON(dat: jsn): NodeyOutput {
    return new NodeyOutput({
      raw: dat.raw,
      parent: dat.parent,
      created: dat.created
    });
  }

  export function dictToCodeCellNodey(
    dict: { [id: string]: any },
    position: number,
    historyStore: HistoryStore,
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
      historyStore.registerTiedNodey(n, forceTie);
    } else historyStore.store(n);

    //TODO fix cell position
    console.log(position);

    dictToCodeChildren(dict, historyStore, n);
    return n;
  }

  export function dictToCodeNodeys(
    dict: { [id: string]: any },
    historyStore: HistoryStore,
    prior: NodeyCode = null
  ): NodeyCode {
    dict.start.line -= 1; // convert the coordinates of the range to code mirror style
    dict.end.line -= 1;
    dict.start.ch -= 1;
    dict.end.ch -= 1;

    // give every node a nextNode so that we can shift/walk for repairs
    var n = new NodeyCode(dict);
    historyStore.store(n);

    if (prior) prior.right = n.name;

    dictToCodeChildren(dict, historyStore, n);
    return n;
  }

  function dictToCodeChildren(
    dict: { [id: string]: any },
    historyStore: HistoryStore,
    n: NodeyCode
  ) {
    var prior = null;
    n.content = [];
    for (var item in dict.content) {
      if (SyntaxToken.KEY in dict.content[item]) {
        n.content.push(new SyntaxToken(dict.content[item][SyntaxToken.KEY]));
      } else {
        var child = dictToCodeNodeys(dict.content[item], historyStore, prior);
        child.parent = n.name;
        if (prior) prior.right = child.name;
        n.content.push(child.name);
        prior = child;
      }
    }

    return n;
  }
}
