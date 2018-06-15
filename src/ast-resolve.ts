import { NodeyCode } from "./nodey";

import * as CodeMirror from "codemirror";

import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import { HistoryModel } from "./history-model";

import * as crypto from "crypto";
import * as levenshtein from "fast-levenshtein";

export class ASTResolve {
  historyModel: HistoryModel;

  constructor(historyModel: HistoryModel) {
    this.historyModel = historyModel;
  }

  repairAST(
    nodey: NodeyCode,
    change: CodeMirror.EditorChange,
    editor: CodeMirrorEditor
  ) {
    var range = {
      start: { line: change.from.line, ch: change.from.ch },
      end: { line: change.to.line, ch: change.to.ch }
    }; // first convert code mirror coordinates to our coordinates
    var affected = this.findAffectedChild(
      nodey,
      0,
      Math.max(0, nodey.content.length - 1),
      range
    );

    if (affected) {
      // shift all nodey positions after affected
      var newEnd = this.repairPositions(affected, change);
      // return the text from this node's new range
      var text = editor.doc.getRange(affected.start, newEnd);
      console.log(
        "The exact affected nodey is",
        affected,
        text,
        range.start,
        newEnd
      );
    } // if there's no specific node broken, the whole cell node is broken
    else {
      affected = nodey;
      // return the text from this node's new range
      var text = editor.doc.getValue();
      console.log("The exact affected nodey is", affected, text, range);
    }

    var updateID = crypto.randomBytes(20).toString("hex");
    affected.pendingUpdate = updateID;

    var kernel_reply = this.recieve_newVersion.bind(this, affected, updateID);
    return [kernel_reply, text];
  }

  /*
  * Convert into full line ranges, to increase the likelihood that we get a nodey that the python
  * parser can parse (it fails on random little snippets)
  */
  solveRange(change: CodeMirror.EditorChange, editor: CodeMirrorEditor) {
    var lineRange = {
      start: { line: change.from.line, ch: change.from.ch },
      end: { line: change.to.line, ch: change.to.ch }
    };
    lineRange.start.ch = 0;
    return lineRange;
  }

  fullLinesRange(change: CodeMirror.EditorChange, editor: CodeMirrorEditor) {
    var lineRange = {
      start: { line: change.from.line, ch: change.from.ch },
      end: { line: change.to.line, ch: change.to.ch }
    };
    lineRange.start.ch = 0;
    lineRange.end.ch = editor.doc.getLine(change.to.line).length;
    return lineRange;
  }

  findAffectedChild(
    node: NodeyCode,
    min: number,
    max: number,
    change: { start: any; end: any }
  ): NodeyCode {
    var content: string[] = node.content;
    var match = null;
    var mid = Math.round((max - min) / 2) + min;
    var midNodey = <NodeyCode>this.historyModel.getNodeyHead(content[mid]);
    var direction = this.inRange(midNodey, change);

    if ((min >= max || max <= min) && direction !== 0)
      //end condition no more to explore
      return null;

    if (direction === 0) {
      // it's in this node, check for children to be more specific
      if (midNodey.content.length < 1) match = midNodey;
      // found!
      else
        match =
          this.findAffectedChild(
            midNodey,
            0,
            Math.max(0, midNodey.content.length - 1),
            change
          ) || midNodey; // found!
    } else if (direction === 2) return null;
    // there is no match at this level
    else if (direction === -1)
      // check the left
      match = this.findAffectedChild(node, min, mid - 1, change);
    else if (direction === 1)
      // check the right
      match = this.findAffectedChild(node, mid + 1, max, change);

    if (match) {
      // if there's a match, now find it's closest parsable parent
      return match; //TODO
    }
    return null;
  }

  repairPositions(
    affected: NodeyCode,
    change: CodeMirror.EditorChange
  ): { line: number; ch: number } {
    // shift all nodes after this changed node
    var [nodeEnd, deltaLine, deltaCh] = this.calcShift(affected, change);
    if (affected.right) {
      var right = this.historyModel.getNodeyHead(affected.right) as NodeyCode;
      if (right.start.line !== nodeEnd.line) deltaCh = 0;
      this.shiftAllAfter(right, deltaLine, deltaCh);
    }
    return nodeEnd;
  }

  calcShift(
    affected: NodeyCode,
    change: CodeMirror.EditorChange
  ): [{ line: number; ch: number }, number, number] {
    var nodeEnd = affected.end;

    // calculate deltas
    var deltaLine = 0;
    var deltaCh = 0;

    var added_line = change.text.length;
    var removed_line = change.removed.length;
    deltaLine = added_line - removed_line;

    var added_ch = (change.text[Math.max(change.text.length - 1, 0)] || "")
      .length;
    var removed_ch = (
      change.removed[Math.max(change.removed.length - 1, 0)] || ""
    ).length;
    deltaCh = added_ch - removed_ch;

    // need to calculate: change 'to' line is not dependable because it is before coordinates only
    var endLine = change.from.line + deltaLine;

    // update this node's coordinates
    if (endLine === nodeEnd.line) nodeEnd.ch = nodeEnd.ch + deltaCh;
    else nodeEnd.line = nodeEnd.line + deltaLine;

    return [nodeEnd, deltaLine, deltaCh];
  }

  shiftAllAfter(nodey: NodeyCode, deltaLine: number, deltaCh: number): void {
    if (deltaLine === 0 && deltaCh === 0)
      //no more shifting, stop
      return;

    console.log(
      "Shifting ",
      nodey,
      "by",
      deltaLine,
      " ",
      deltaCh,
      " before:" + nodey.start.line + " " + nodey.start.ch
    );
    nodey.start.line += deltaLine;
    nodey.end.line += deltaLine;
    nodey.start.ch += deltaCh;

    //Now be sure to shift all children
    this.shiftAllChildren(nodey, deltaLine, deltaCh);

    if (nodey.right) {
      var rightSibling = this.historyModel.getNodeyHead(
        nodey.right
      ) as NodeyCode;
      if (rightSibling.start.line !== nodey.start.line) deltaCh = 0;
      this.shiftAllAfter(rightSibling, deltaLine, deltaCh);
    }
  }

  shiftAllChildren(nodey: NodeyCode, deltaLine: number, deltaCh: number): void {
    for (var i in nodey.content) {
      var child = this.historyModel.getNodeyHead(nodey.content[i]) as NodeyCode;
      child.start.line += deltaLine;
      child.end.line += deltaLine;
      child.start.ch += deltaCh;
      this.shiftAllChildren(child, deltaLine, deltaCh);
    }
  }

  //return 0 for match, 1 for to the right, -1 for to the left, 2 for both
  inRange(nodey: NodeyCode, change: { start: any; end: any }): number {
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

  recieve_newVersion(
    nodey: NodeyCode,
    updateID: string,
    jsn: string
  ): NodeyCode {
    if (nodey.pendingUpdate && nodey.pendingUpdate === updateID) {
      console.log("Time to resolve", jsn, "with", nodey);
      var dict = this.reduceAST(JSON.parse(jsn));
      console.log("Reduced AST", dict);

      var [score, transforms] = this.matchNode(dict, nodey);
      console.log("Match?", score, transforms);
      this.historyModel.starNodey(transforms, nodey);

      //resolved
      if (nodey.pendingUpdate === updateID) nodey.pendingUpdate = null;
    }
    return nodey;
  }

  reduceAST(ast: { [key: string]: any }): { [key: string]: any } {
    if (ast.content && ast.content.length === 1) {
      // check if this node is a wrapper or not
      var child = ast.content[0];
      if (
        child.start.line === ast.start.line &&
        child.start.ch === ast.start.ch &&
        child.end.line === ast.end.line &&
        child.end.ch === ast.end.ch
      )
        return this.reduceAST(child);
    }
    return ast;
  }

  match(
    nodeIndex: number,
    nodeList: { [key: string]: any }[],
    oldNodeyList: string[],
    candidateList: any[]
  ): [number, any[], any[]] {
    var nodeToMatch = nodeList[nodeIndex];
    var options = [];
    var updates = [];
    var totalScore = 0;
    console.log("Attempting to match", nodeToMatch);

    for (var i = 0; i < candidateList.length; i++) {
      var candidate = this.historyModel.getNodeyHead(
        candidateList[i]
      ) as NodeyCode;
      var [score, updates] = this.matchNode(nodeToMatch, candidate);

      if (score === 0) {
        // perfect match
        candidateList.splice(i, 1); // remove from candidate list
        if (nodeIndex < nodeList.length - 1)
          return this.match(
            nodeIndex + 1,
            nodeList,
            oldNodeyList,
            candidateList
          );
        else return [0, candidateList, []];
      }

      if (score != -1) options[i] = { score: score, transforms: updates };
    }

    // if we've gotten here, an exact match was NOT found
    if (nodeIndex < nodeList.length - 1)
      var [totalScore, candidateList, updates] = this.match(
        nodeIndex + 1,
        nodeList,
        oldNodeyList,
        candidateList
      );

    console.log(nodeToMatch, " now options are ", options, candidateList);
    var bestMatch;
    var matchIndex;
    for (var j = 0; j < candidateList.length; j++) {
      if (options[j]) {
        //can use this one
        if (!bestMatch || bestMatch.score > options[j].score) {
          bestMatch = options[j];
          matchIndex = j;
        }
      }
    }

    if (bestMatch) {
      totalScore = bestMatch.score;
      candidateList.splice(matchIndex, 1);
      updates.concat(bestMatch.transforms);
    } else updates.push(this.addNewNode.bind(this, nodeToMatch, nodeIndex));

    return [totalScore, candidateList, updates];
  }

  matchNode(
    node: { [key: string]: any },
    potentialMatch: NodeyCode
  ): [number, any[]] {
    if (node.type !== potentialMatch.type) return [-1, []];
    if (node.literal && potentialMatch.literal)
      //leaf nodes
      return [
        this.matchLiterals(node.literal + "", potentialMatch.literal + ""),
        [this.changeLiteral.bind(this, node)]
      ];
    else {
      var [totalScore, candidateList, updates] = this.match(
        0,
        node.content,
        potentialMatch.content,
        potentialMatch.content.slice(0)
      );
      candidateList.map(x => {
        updates.push(
          this.removeOldNode.bind(this, this.historyModel.getNodeyHead(x))
        );
      });
      return [totalScore, updates];
    }
  }

  changeLiteral(node: { [key: string]: any }, target: NodeyCode) {
    console.log(
      "Changing literal from " + target.literal + " to " + node.literal
    );
    target.literal = node.literal;
  }

  addNewNode(node: { [key: string]: any }, at: number, target: NodeyCode) {
    var nodey = this.buildStarNode(node, target);
    nodey.parent = target.name;
    console.log("Added a new node " + nodey + " to ", target);
    target.content.splice(at, 0, nodey.name);
  }

  buildStarNode(
    node: { [key: string]: any },
    target: NodeyCode,
    prior: NodeyCode = null
  ): NodeyCode {
    node.id = "*";
    var n = new NodeyCode(node);
    n.start.line -= 1; // convert the coordinates of the range to code mirror style
    n.end.line -= 1;
    n.positionRelativeTo(target);
    var num = this.historyModel.registerStarNodey(n);
    n.version = num;

    if (prior) prior.right = n.name;
    prior = null;

    n.content = [];
    for (var item in node.content) {
      var child = this.buildStarNode(node.content[item], target, prior);
      child.parent = n.name;
      if (prior) prior.right = child.name;
      n.content.push(child.name);
      prior = child;
    }

    return n;
  }

  removeOldNode(node: NodeyCode, target: NodeyCode) {
    var index = target.content.indexOf(node.name);
    console.log("Removing old node", node, "from", target);
    target.content.splice(index, 1);
  }

  matchLiterals(val1: string, val2: string): number {
    return levenshtein.get(val1, val2);
  }
}
