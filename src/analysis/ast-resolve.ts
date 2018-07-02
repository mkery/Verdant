import { NodeyCode, NodeyCodeCell, NodeyMarkdown, SyntaxToken } from "../nodey";

import * as CodeMirror from "codemirror";

import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import { HistoryModel } from "../history-model";

import { ASTUtils } from "./ast-utils";

import * as crypto from "crypto";
import * as levenshtein from "fast-levenshtein";

export class ASTResolve {
  historyModel: HistoryModel;

  constructor(historyModel: HistoryModel) {
    this.historyModel = historyModel;
  }

  repairMarkdown(nodey: NodeyMarkdown, newText: string) {
    var oldText = nodey.markdown;
    var score = levenshtein.get(oldText, newText);
    if (score !== 0) {
      let history = this.historyModel.getVersionsFor(nodey);
      if (!history.starNodey) {
        let nodey = history.versions[history.versions.length - 1];
        history.starNodey = nodey.clone();
        history.starNodey.version = "*";
        (history.starNodey as NodeyMarkdown).markdown = newText;
      } else (history.starNodey as NodeyMarkdown).markdown = newText;
    }
  }

  repairAST(
    nodey: NodeyCodeCell,
    change: CodeMirror.EditorChange,
    editor: CodeMirrorEditor
  ) {
    var range = {
      start: change.from,
      end: change.to
    }; // first convert code mirror coordinates to our coordinates

    //check that the line numbers are accurate
    // code mirror's "sticky" system can cause problems
    if (
      (change.from as any).sticky === "before" &&
      (change.to as any).sticky === "before"
    ) {
      var lines = change.text.length - 1;
      if (range.end.line - range.start.line < lines) {
        range.end.line = range.start.line + lines;
        range.end.ch = change.text[lines].length;
      }
    }

    var affected = ASTUtils.findNodeAtRange(nodey, range, this.historyModel);

    if (affected) {
      //some types cannot be parsed alone by Python TODO
      var unparsable = ["Str", "STRING", "keyword"];
      while (unparsable.indexOf(affected.type) !== -1) {
        console.log("affected is", affected);
        affected = this.historyModel.getNodey(affected.parent) as NodeyCode;
      }

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

  matchASTOnInit(nodey: NodeyCodeCell) {
    var updateID = crypto.randomBytes(20).toString("hex");
    nodey.pendingUpdate = updateID;

    var kernel_reply = this.recieve_newVersion.bind(this, nodey, updateID);
    return kernel_reply;
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
    var children = nodey.getChildren();
    for (var i in children) {
      var child = this.historyModel.getNodeyHead(children[i]) as NodeyCode;
      child.start.line += deltaLine;
      child.end.line += deltaLine;
      child.start.ch += deltaCh;
      this.shiftAllChildren(child, deltaLine, deltaCh);
    }
  }

  recieve_newVersion(
    nodey: NodeyCode,
    updateID: string,
    jsn: string
  ): NodeyCode {
    if (nodey.pendingUpdate && nodey.pendingUpdate === updateID) {
      //console.log("Time to resolve", jsn, "with", nodey);
      var dict = ASTUtils.reduceASTDict(JSON.parse(jsn));
      console.log("Reduced AST", dict, nodey, JSON.parse(jsn));

      var [score, candidates, transforms] = this.match(
        0,
        [dict],
        [{ item: nodey.name, index: 0 }],
        null
      );
      console.log("Match?", score, transforms, candidates);
      if (transforms.length > 0) {
        //each transform will stage itself
        transforms.forEach((fun: () => void) => fun());
      }

      //resolved
      if (nodey.pendingUpdate === updateID) nodey.pendingUpdate = null;
    }
    return nodey;
  }

  match(
    nodeIndex: number,
    nodeList: { [key: string]: any }[],
    candidateList: { item: any; index: number }[],
    parent: NodeyCode
  ): [number, { item: any; index: number }[], (() => any)[]] {
    var nodeToMatch = nodeList[nodeIndex];
    var options = [];
    var updates: (() => any)[] = [];
    var totalScore = 0;

    for (var i = 0; i < candidateList.length; i++) {
      var [score, updates] = this.matchNode(nodeToMatch, candidateList[i].item);

      if (score === 0) {
        // perfect match
        var match = candidateList[i];
        if (!(match.item instanceof SyntaxToken)) {
          var matchNode = this.historyModel.getNodey(match.item) as NodeyCode;
          matchNode.start = nodeToMatch.start;
          matchNode.end = nodeToMatch.end;
        }
        candidateList.splice(i, 1); // remove from candidate list
        if (nodeIndex < nodeList.length - 1)
          return this.match(nodeIndex + 1, nodeList, candidateList, parent);
        else return [0, candidateList, updates];
      }

      if (score != -1)
        options[candidateList[i].index] = { score: score, transforms: updates };
    }

    // if we've gotten here, an exact match was NOT found
    if (nodeIndex < nodeList.length - 1 && candidateList.length > 0)
      var [totalScore, candidateList, updates] = this.match(
        nodeIndex + 1,
        nodeList,
        candidateList,
        parent
      );

    console.log(
      "No exact match found for",
      nodeToMatch,
      " now options are ",
      options,
      candidateList
    );
    updates = []; // need to pick from several choices
    var bestMatch;
    var matchIndex;
    for (var k = 0; k < candidateList.length; k++) {
      console.log("candidate", candidateList[k].item);
      var j = candidateList[k].index;
      if (options[j]) {
        //can use this one
        if (!bestMatch || bestMatch.score > options[j].score) {
          bestMatch = options[j];
          matchIndex = k;
        }
      }
    }

    if (bestMatch) {
      console.log("there is a best match!", bestMatch);
      totalScore = bestMatch.score;
      var match = candidateList[matchIndex];
      if (!(match.item instanceof SyntaxToken)) {
        var matchNode = this.historyModel.getNodey(match.item) as NodeyCode;
        matchNode.start = nodeToMatch.start;
        matchNode.end = nodeToMatch.end;
      }
      candidateList.splice(matchIndex, 1);
      bestMatch.transforms.forEach(item => updates.push(item));
    } else {
      console.log("maybe add", nodeToMatch);
      if (nodeToMatch[SyntaxToken.KEY])
        updates.push(
          ASTTransforms.addNewStnTok.bind(this, nodeToMatch, nodeIndex, parent)
        );
      else
        updates.push(
          ASTTransforms.addNewNode.bind(this, nodeToMatch, nodeIndex, parent)
        );
    }

    console.log("sending on updates", updates);
    return [totalScore, candidateList, updates];
  }

  matchNode(
    node: { [key: string]: any },
    potentialMatch: any
  ): [number, (() => any)[]] {
    if (SyntaxToken.KEY in node || potentialMatch instanceof SyntaxToken) {
      return this._matchSyntaxToken(node, potentialMatch);
    } else {
      var matchNode = this.historyModel.getNodey(
        potentialMatch as string
      ) as NodeyCode;
      if (node.literal || matchNode.literal)
        return this._matchLiteralNode(node, matchNode);
      else return this._matchUpperNode(node, matchNode);
    }
  }

  private _matchUpperNode(
    node: { [key: string]: any },
    potentialMatch: NodeyCode
  ): [number, (() => any)[]] {
    var candidates = potentialMatch.content.map((item, index) => {
      //need to preserve the exact index of the original content to go back and edit it later
      return { item: item, index: index };
    });
    //console.log("candidates are", candidates, node);
    var [totalScore, candidateRemain, updates] = this.match(
      0,
      node.content,
      candidates,
      potentialMatch
    );
    candidateRemain.map(x => {
      console.log("maybe remove remainder", x);
      if (x.item instanceof SyntaxToken)
        updates.push(
          ASTTransforms.removeSyntaxToken.bind(this, x.item, potentialMatch)
        );
      else updates.push(ASTTransforms.removeOldNode.bind(this, x.item));
    });
    return [totalScore, updates];
  }

  private _matchSyntaxToken(
    node: { [key: string]: any },
    potentialMatch: any
  ): [number, (() => any)[]] {
    if (!(potentialMatch instanceof SyntaxToken && SyntaxToken.KEY in node))
      return [-1, []]; // no match possible

    var score = this.matchLiterals(
      node[SyntaxToken.KEY],
      potentialMatch.tokens
    );
    var transforms = [];
    if (score !== 0)
      transforms = [
        ASTTransforms.changeSyntaxToken.bind(
          this,
          node[SyntaxToken.KEY],
          potentialMatch
        )
      ];
    return [score, transforms];
  }

  private _matchLiteralNode(
    node: { [key: string]: any },
    potentialMatch: NodeyCode
  ): [number, (() => any)[]] {
    if (!(potentialMatch.literal && "literal" in node)) return [-1, []]; // no match possible
    //leaf nodes
    var score = this.matchLiterals(
      node.literal + "",
      potentialMatch.literal + ""
    );
    var transforms: (() => any)[] = [];
    if (score !== 0) {
      // not a perfect match
      console.log(
        "maybe change literal",
        node.literal,
        potentialMatch.literal,
        score
      );
      transforms = [
        ASTTransforms.changeLiteral.bind(this, node, potentialMatch.name)
      ];
    }
    return [score, transforms];
  }

  matchLiterals(val1: string, val2: string): number {
    return levenshtein.get(val1, val2);
  }
}

export namespace ASTTransforms {
  /*
  * Important steps: make the change, then mark all affected
  * nodes as edited
  */
  export function removeOldNode(toRemove: string) {
    var target = this.historyModel.getNodeyHead(toRemove);
    var parent = this.historyModel.getNodeyHead(target.parent);
    var index = parent.content.indexOf(target);
    console.log("Removing old node", target, "from", parent);
    var starTarget = this.historyModel.markAsEdited(parent);
    starTarget.content.splice(index, 1);
  }

  export function removeSyntaxToken(tok: SyntaxToken, parent: NodeyCode) {
    var index = parent.content.indexOf(tok);
    console.log("Removing old token", tok, "from", parent, index);
    var starTarget = this.historyModel.markAsEdited(parent);
    starTarget.content.splice(index, 1);
  }

  export function changeLiteral(
    node: { [key: string]: any },
    nodeName: string
  ) {
    var newLiteral = node.literal;
    var target = this.historyModel.getNodeyHead(nodeName) as NodeyCode;
    target.start = node.start;
    target.end = node.end;
    console.log("Changing literal from " + target + " to " + newLiteral);
    var starTarget = this.historyModel.markAsEdited(target);
    starTarget.literal = newLiteral;
  }

  export function changeSyntaxToken(newToken: any, target: SyntaxToken) {
    //TODO do we count this as a change?
    target.tokens = newToken;
  }

  export function addNewStnTok(syntok: string, at: number, target: NodeyCode) {
    var s = new SyntaxToken(syntok);
    console.log("Added a new syntax token ", s, " to ", target);
    var starTarget = this.historyModel.markAsEdited(target);
    starTarget.content.splice(at, 0, s);
  }

  export function addNewNode(
    node: { [key: string]: any },
    at: number,
    target: NodeyCode
  ) {
    var nodey = buildStarNode.bind(this)(node, target);
    nodey.parent = target.name;
    console.log("Added a new node ", nodey, " to ", target);
    var starTarget = this.historyModel.markAsEdited(target);
    starTarget.content.splice(at, 0, nodey.name);
  }

  export function buildStarNode(
    node: { [key: string]: any },
    target: NodeyCode,
    prior: NodeyCode = null
  ): NodeyCode {
    node.id = "*";

    var n = new NodeyCode(node);
    n.start.line -= 1; // convert the coordinates of the range to code mirror style
    n.end.line -= 1;
    if (target.start) n.positionRelativeTo(target); //TODO if from the past, target may not have a position
    var label = this.historyModel.addStarNode(n, target);
    n.version = label;

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
}
