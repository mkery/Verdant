import { HistoryStore } from "./history-store";

import { NodeyCode, NodeyCodeCell, SyntaxToken } from "./nodey";

/**
 * A namespace for Nodey statics.
 */
export namespace NodeyFactory {
  export function dictToCodeCellNodey(
    dict: { [id: string]: any },
    _: number,
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
