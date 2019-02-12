import { NodeyCode, NodeyCodeCell, SyntaxToken } from "../model/nodey";
import { HistoryStore } from "../model/history-store";

import { Star } from "../model/history-stage";
import { History } from "../model/history";

type Range = { start: Pos; end: Pos };
type Pos = { line: number; ch: number };
/*
*
*/
export namespace ASTUtils {
  /*
  *
  */
  export function findNodeAtRange(
    nodey: NodeyCodeCell,
    change: Range,
    history: History
  ): NodeyCode {
    return Private._findNodeAtRange(
      nodey,
      0,
      Math.max(0, nodey.getChildren().length - 1),
      change,
      history
    );
  }

  /*
  *
  */
  //return 0 for match, 1 for to the right, -1 for to the left, 2 for both
  export function inRange(nodey: NodeyCode, change: Range): number {
    var val = 0;
    if (change.start.line < nodey.start.line) val = -1;
    else if (
      change.start.line === nodey.start.line &&
      change.start.ch < nodey.start.ch
    )
      val = -1;

    if (change.end.line > nodey.end.line) {
      if (val === -1) val = 2;
      else val = 1;
    } else if (
      change.end.line === nodey.end.line &&
      change.end.ch > nodey.end.ch
    ) {
      if (val === -1) val = 2;
      else val = 1;
    }
    return val;
  }

  /*
  * goal: get rid of wrappers or any types called Module
  */
  export function reduceASTDict(ast: {
    [key: string]: any;
  }): { [key: string]: any } {
    if (ast.content && ast.content.length === 1) {
      // check if this node is a wrapper or not
      var child = ast.content[0];
      return reduceASTDict(child);
    } else if (ast.type === "Module") ast.type = "_"; // wildcard
    return ast;
  }

  export function dictToCodeCellNodey(
    dict: { [id: string]: any },
    checkpoint: number,
    historyStore: HistoryStore,
    forceTie: string = null
  ) {
    if ("type" in dict === false) {
      dict.type = "Module";
    }

    var n = new NodeyCodeCell(dict);
    n.created = checkpoint;
    if (forceTie) {
      // only occurs when cells change type from code/markdown
      historyStore.registerTiedNodey(n, forceTie);
    } else historyStore.store(n);

    //TODO fix cell position

    dictToCodeChildren(dict, checkpoint, historyStore, n);
    return n;
  }

  export function dictToCodeNodeys(
    dict: { [id: string]: any },
    checkpoint: number,
    historyStore: HistoryStore,
    prior: NodeyCode = null
  ): NodeyCode {
    // give every node a nextNode so that we can shift/walk for repairs
    var n = new NodeyCode(dict);
    n.created = checkpoint;
    historyStore.store(n);

    if (prior) prior.right = n.name;

    dictToCodeChildren(dict, checkpoint, historyStore, n);
    return n;
  }

  function dictToCodeChildren(
    dict: { [id: string]: any },
    checkpoint: number,
    historyStore: HistoryStore,
    n: NodeyCode
  ) {
    var prior = null;
    n.content = [];
    for (var item in dict.content) {
      if (SyntaxToken.KEY in dict.content[item]) {
        n.content.push(new SyntaxToken(dict.content[item][SyntaxToken.KEY]));
      } else {
        var child = dictToCodeNodeys(
          dict.content[item],
          checkpoint,
          historyStore,
          prior
        );
        child.parent = n.name;
        if (prior) prior.right = child.name;
        n.content.push(child.name);
        prior = child;
      }
    }

    return n;
  }
}

namespace Private {
  /*
  *
  */
  export function _findNodeAtRange(
    node: NodeyCode,
    min: number,
    max: number,
    change: Range,
    history: History
  ): NodeyCode {
    console.log("Looking for node at", change, node);
    var children: string[] = node.getChildren();
    if (min > max || max < min || children.length < 1) return node;
    var match = null;
    var mid = Math.floor((max - min) / 2) + min;
    console.log("CHILDREN", children, mid, children[mid]);
    var midNodey = <NodeyCode>history.store.getLatestOf(children[mid]);
    var direction = ASTUtils.inRange(midNodey, change);
    console.log("checking mid range", midNodey, direction, change);

    if (direction === 0) {
      var midChildren = midNodey.getChildren();
      // it's in this node, check for children to be more specific
      if (midChildren.length < 1) match = midNodey;
      // found!
      else
        match =
          _findNodeAtRange(
            midNodey,
            0,
            Math.max(0, midChildren.length - 1),
            change,
            history
          ) || midNodey; // found!
    } else if (direction === 2) return null;
    // there is no match at this level
    else if (direction === -1)
      // check the left
      match = _findNodeAtRange(node, min, mid - 1, change, history);
    else if (direction === 1)
      // check the right
      match = _findNodeAtRange(node, mid + 1, max, change, history);

    if (match) {
      // if there's a match, now find it's closest parsable parent
      return match; //TODO
    }
    return null;
  }
}

export type $NodeyCode$ = NodeyCode | Star<NodeyCode>;
export type $NodeyCodeCell$ = NodeyCodeCell | Star<NodeyCodeCell>;

export namespace $NodeyCode$ {
  /*
  * Helper functions for matching
  */
  export function getType(nodey: NodeyCode | Star<NodeyCode>): string {
    if (nodey instanceof NodeyCode) return nodey.type;
    return nodey.value.type;
  }

  export function setRight(nodey: NodeyCode | Star<NodeyCode>, right: string) {
    if (nodey instanceof NodeyCode) nodey.right = right;
    else nodey.value.right = right;
  }

  export function pendingUpdate(nodey: NodeyCode | Star<NodeyCode>): string {
    if (nodey instanceof NodeyCode) return nodey.pendingUpdate;
    return nodey.value.pendingUpdate;
  }

  export function setPendingUpdate(
    nodey: NodeyCode | Star<NodeyCode>,
    value: string
  ): void {
    if (nodey instanceof NodeyCode) nodey.pendingUpdate = value;
    else nodey.value.pendingUpdate = value;
  }

  export function getEnd(nodey: NodeyCode | Star<NodeyCode>): Pos {
    if (nodey instanceof NodeyCode) return nodey.end;
    return nodey.value.end;
  }

  export function setEnd(nodey: NodeyCode | Star<NodeyCode>, end: Pos) {
    if (nodey instanceof NodeyCode) nodey.end = end;
    else nodey.value.end = end;
  }

  export function getStart(nodey: NodeyCode | Star<NodeyCode>): Pos {
    if (nodey instanceof NodeyCode) return nodey.start;
    return nodey.value.start;
  }

  export function setStart(nodey: NodeyCode | Star<NodeyCode>, start: Pos) {
    if (nodey instanceof NodeyCode) nodey.start = start;
    else nodey.value.start = start;
  }

  export function getParent(nodey: NodeyCode | Star<NodeyCode>): string {
    if (nodey instanceof NodeyCode) return nodey.parent;
    return nodey.value.parent;
  }

  export function positionRelativeTo(
    nodey: NodeyCode | Star<NodeyCode>,
    relativeTo: NodeyCode | Star<NodeyCode>
  ) {
    let target: NodeyCode;
    if (relativeTo instanceof Star) target = relativeTo.value;
    else target = relativeTo;
    if (nodey instanceof NodeyCode) nodey.positionRelativeTo(target);
    else nodey.value.positionRelativeTo(target);
  }

  export function getContent(nodey: NodeyCode | Star<NodeyCode>) {
    if (nodey instanceof NodeyCode) return nodey.content;
    else return nodey.value.content;
  }

  export function setContent(
    nodey: NodeyCode | Star<NodeyCode>,
    content: (string | SyntaxToken)[]
  ) {
    if (nodey instanceof NodeyCode) nodey.content = content;
    else nodey.value.content = content;
  }

  export function getLiteral(nodey: NodeyCode | Star<NodeyCode>) {
    if (nodey instanceof NodeyCode) return nodey.literal;
    else return nodey.value.literal;
  }
}
