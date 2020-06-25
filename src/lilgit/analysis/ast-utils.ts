import { NodeyCode, NodeyCodeCell, SyntaxToken } from "../nodey/";
import { ServerConnection } from "@jupyterlab/services";
import { URLExt } from "@jupyterlab/coreutils";
import { jsn } from "../notebook";
import { Star, History } from "../history/";
import { log } from "../notebook";

type Range = { start: Pos; end: Pos };
type Pos = { line: number; ch: number };
/*
 *
 */
export namespace ASTUtils {
  export async function parseRequest(rawText: string = ""): Promise<jsn> {
    let text = Private.cleanCodeString(rawText);
    let fullRequest = {
      method: "POST",
      body: JSON.stringify({ code: text }),
    };
    let serverSettings = ServerConnection.makeSettings();

    let fullUrl = URLExt.join(serverSettings.baseUrl, "/lilgit/parse");

    log("To parse:", fullUrl, fullRequest);
    /*return new Promise<jsn>(accept => {
      ServerConnection.makeRequest(fullUrl, fullRequest, serverSettings).then(
        response => {
          if (response.status !== 200) {
            response.text().then(data => {
              console.error(
                "A parser error occured on:\n " + text + "\n" + data
              );
              accept(failSafeParse(rawText));
            });
          } else response.text().then(data => accept(JSON.parse(data)));
        }
      );
    });*/
    return failSafeParse(rawText);
  }

  function failSafeParse(code: string): jsn {
    let failsafe = {
      type: "Module",
      start: { line: 0, ch: 0 },
      end: { line: 0, ch: 0 },
      literal: code,
    };
    let lines = code.split("\n");
    let lastCh = lines[lines.length - 1].length;
    failsafe["end"] = { line: lines.length - 1, ch: lastCh - 1 };
    return failsafe;
  }

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
}

namespace Private {
  export function cleanCodeString(code: string): string {
    // annoying but important: make sure docstrings do not interrupt the string literal
    var newCode = code.replace(/""".*"""/g, (str) => {
      return "'" + str + "'";
    });

    // turn ipython magics commands into comments
    let magics = /(%)(\w)+(\s)*(\w)*(\n|$)/g; // regex to avoid styled strings that use %
    let matches = magics.exec(newCode);
    if (matches) newCode = newCode.replace(matches[0][0], "#");

    // remove any triple quotes, which will mess us up
    newCode = newCode.replace(/"""/g, "'''");

    // make sure newline inside strings doesn't cause an EOL error
    // and make sure any special characters are escaped correctly
    newCode = newCode.replace(/(").*?(\\.).*?(?=")/g, (str) => {
      return str.replace(/\\/g, "\\\\");
    });
    newCode = newCode.replace(/(').*?(\\.).*?(?=')/g, (str) => {
      return str.replace(/\\/g, "\\\\");
    });
    //log("cleaned code is ", newCode);
    return newCode;
  }
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
    log("Looking for node at", change, node);
    var children: string[] = node.getChildren();
    if (min > max || max < min || children.length < 1) return node;
    var match = null;
    var mid = Math.floor((max - min) / 2) + min;
    log("CHILDREN", children, mid, children[mid]);
    var midNodey = <NodeyCode>history.store.getLatestOf(children[mid]);
    var direction = ASTUtils.inRange(midNodey, change);
    log("checking mid range", midNodey, direction, change);

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
