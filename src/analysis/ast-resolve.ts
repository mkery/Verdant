import { NodeyCode, NodeyCodeCell, NodeyMarkdown, SyntaxToken } from "../nodey";

import * as CodeMirror from "codemirror";

import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import { HistoryModel } from "../history-model";

import { ASTUtils, ParserNodey, MatchedNodey } from "./ast-utils";

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

  dictToNodeyList(
    dict: ParserNodey,
    nodeyList: ParserNodey[] = [],
    leaves: number[] = []
  ): [ParserNodey[], number[], number[]] {
    if ("literal" in dict) {
      var index = nodeyList.push(dict) - 1;
      leaves.push(index);
      return [nodeyList, leaves, [index]];
    } else if (!(SyntaxToken.KEY in dict)) {
      //just ignore SyntaxToken
      var children: number[] = [];
      dict.content.forEach((d: ParserNodey) => {
        let kids = [];
        [nodeyList, leaves, kids] = this.dictToNodeyList(d, nodeyList, leaves);
        console.log("content is", d, children, nodeyList, kids);
        children = children.concat(kids);
      });
      var nodey = {
        start: dict.start,
        end: dict.end,
        content: children,
        type: dict.type
      };
      var index = nodeyList.push(nodey) - 1;
      children.forEach(num => {
        nodeyList[num].parent = index;
      });
      return [nodeyList, leaves, [index]];
    }
    return [nodeyList, leaves, []];
  }

  nodeyToLeaves(nodey: NodeyCode, leaves: string[] = []): string[] {
    if (nodey.literal) leaves.push(nodey.name);
    else {
      nodey.content.forEach(name => {
        if (!(name instanceof SyntaxToken)) {
          var child = this.historyModel.getNodey(name) as NodeyCode;
          leaves = this.nodeyToLeaves(child, leaves);
        }
      });
    }
    return leaves;
  }

  recieve_newVersion(
    nodey: NodeyCode,
    updateID: string,
    jsn: string
  ): NodeyCode {
    if (nodey.pendingUpdate && nodey.pendingUpdate === updateID) {
      //console.log("Time to resolve", jsn, "with", nodey);
      var dict: ParserNodey = ASTUtils.reduceASTDict(
        JSON.parse(jsn)
      ) as ParserNodey;
      var [newNodey, newLeaves] = this.dictToNodeyList(dict);
      var oldLeaves = this.nodeyToLeaves(nodey);
      console.log("Listified nodey", newNodey, newLeaves, oldLeaves);
      console.log("Reduced AST", dict, nodey);
      console.log(this.historyModel.dump());

      var candidates = oldLeaves.map((item, index) => {
        //need to preserve the exact index of the original content to go back and edit it later
        return { item: item, index: index };
      });
      console.log("candidates are", candidates);
      this.matchLeaves(newNodey, newLeaves, candidates);
      console.log("Matched Leaves!", newNodey);
      var newParents = this.matchParentNodes(newLeaves, newNodey);
      while (newParents.length > 0) {
        newParents = this.matchParentNodes(newLeaves, newNodey);
      }
      this.finalizeMatch(newNodey.length - 1, newNodey);

      //resolved
      if (nodey.pendingUpdate === updateID) nodey.pendingUpdate = null;
    }
    return nodey;
  }

  finalizeMatch(root: number, newNodes: ParserNodey[]) {
    var parsedNode = newNodes[root];
    var match = parsedNode.match;
    if (match) {
      if (match.score !== 0) {
        // there was some change
        var nodey = this.historyModel.getNodey(match.nodey) as NodeyCode;
        var nodeyEdited = this.historyModel.markAsEdited(nodey);
        if (parsedNode.literal) {
          nodeyEdited.literal = parsedNode.literal;
        } else {
        }
      }
    } else {
      console.log("New Node! No match for", parsedNode);
    }
  }

  matchParentNodes(matchedLeaves: number[], newNodes: ParserNodey[]) {
    //for each leaf node, get its possible parents
    // the goal is, for the parent of the parsed leaf, try to figure out if it
    // is one of the old parents or no

    /*
    * First, get all the possible parent matches O(n)
    * 2. decide the best parent matches O(nk) where k = number possible matches
    * 3. update the history Model
    */
    var parsedParentOptions: {
      index: number;
      possibleMatches: number[];
      leafChildren: ParserNodey[];
    }[] = [];
    var nodeyParentOptions: {
      name: string;
      matched: { index: number; score: number };
      possibleMatches: { index: number; score: number }[];
    }[] = [];

    matchedLeaves.forEach(leafIndex => {
      var leaf = newNodes[leafIndex];
      if (leaf.parent) {
        var parsedIndex = parsedParentOptions.findIndex(item => {
          return item.index === leaf.parent;
        });
        if (parsedIndex <= -1)
          parsedIndex =
            parsedParentOptions.push({
              index: leaf.parent,
              possibleMatches: [],
              leafChildren: [leaf]
            }) - 1;
        else parsedParentOptions[parsedIndex].leafChildren.push(leaf);

        if (leaf.match.nodey) {
          var nodey = this.historyModel.getNodey(leaf.match.nodey);
          if (nodey.parent) {
            var nodeyIndex = nodeyParentOptions.findIndex(item => {
              return item.name === nodey.parent;
            });
            if (nodeyIndex <= -1) {
              nodeyIndex =
                nodeyParentOptions.push({
                  name: nodey.parent,
                  matched: null,
                  possibleMatches: []
                }) - 1;
            }
            parsedParentOptions[parsedIndex].possibleMatches.push(nodeyIndex);
          }
        }
      }
    });

    console.log("now options are ", parsedParentOptions, nodeyParentOptions);

    // Now we have a crazy list for all nodey parents and all parsed parents
    // of possible pairings. Grade each.
    parsedParentOptions.forEach(item => {
      var parsedParent = newNodes[item.index];
      var leafChildren = item.leafChildren;
      item.possibleMatches.forEach(candidate => {
        var oldParent = this.historyModel.getNodey(
          nodeyParentOptions[candidate].name
        ) as NodeyCode;
        var score = this.scoreParentMatch(
          parsedParent,
          oldParent,
          leafChildren
        );
        nodeyParentOptions[candidate].possibleMatches.push({
          index: item.index,
          score: score
        });
      });
    });

    //Now choose the best score for the nodeyParents
    nodeyParentOptions.forEach(nodeyParent => {
      var bestMatch = { index: -1, score: Number.MAX_SAFE_INTEGER };
      nodeyParent.possibleMatches.forEach(candidate => {
        if (candidate.score < bestMatch.score) bestMatch = candidate;
      });
      nodeyParent.matched = bestMatch;
    });

    // now choose the best match for each parsed Parent
    var finishedParsed = <number[]>[];
    parsedParentOptions.forEach(parsedParent => {
      if (newNodes[parsedParent.index].parent) {
        if (!newNodes[newNodes[parsedParent.index].parent].match) {
          finishedParsed.push(parsedParent.index);
        }
      }
      var bestMatch = { nodey: <string>null, score: Number.MAX_SAFE_INTEGER };
      parsedParent.possibleMatches.forEach(candidate => {
        var match = nodeyParentOptions[candidate].matched;
        if (match.index === parsedParent.index && match.score < bestMatch.score)
          bestMatch = {
            nodey: nodeyParentOptions[candidate].name,
            score: match.score
          };
      });
      console.log("best match for ", parsedParent, "is", bestMatch);
      if (bestMatch.nodey) newNodes[parsedParent.index].match = bestMatch;
    });

    return finishedParsed;
  }

  scoreParentMatch(
    parsedParent: ParserNodey,
    nodeParent: NodeyCode,
    leafChildren: ParserNodey[]
  ): number {
    /* Cost function
    *  current children versus children in oldParent
    *  cost of deleting oldParent
    *  cost of changig type of oldParent, if even a legal move
    *  cost of inserting a new node newParent
    *
    */
    var score = Number.MAX_SAFE_INTEGER;
    if (nodeParent.type !== parsedParent.type) {
      //TODO Case 1 or Case 2 is possible look up the chain
    } else {
      var numChildren = nodeParent.getChildren().length;
      var score = numChildren;
      leafChildren.forEach(leaf => {
        if (nodeParent.content.indexOf(leaf.match.nodey) > -1) score -= 1;
        else score += 1;
      });
      //TODO decide when Case 2 is possible and how
    }
    return score;
  }

  matchLeaves(
    newNodes: ParserNodey[],
    newLeaves: number[],
    oldLeaves: { item: string; index: number }[]
  ) {
    var choices: {
      leaf: number;
      options: { score: number; transforms: (() => void)[] }[];
    }[] = [];
    newLeaves.forEach((leafIndex: number) => {
      var [perfectMatch, options] = this.findLeafMatchOptions(
        leafIndex,
        newNodes,
        oldLeaves
      );
      if (perfectMatch) {
        oldLeaves.splice(perfectMatch.index, 1);
        newNodes[leafIndex].match = {
          nodey: perfectMatch.item,
          score: 0
        };
      } else choices.push({ leaf: leafIndex, options: options });
    });

    choices.forEach(imperfectMatch => {
      var match = this.chooseMatchOption(
        imperfectMatch.leaf,
        imperfectMatch.options,
        newNodes,
        oldLeaves
      );
      newNodes[imperfectMatch.leaf].match = match;
    });
  }

  findLeafMatchOptions(
    leafIndex: number,
    newNodes: ParserNodey[],
    oldLeaves: { item: string; index: number }[]
  ): [
    { item: string; index: number },
    { score: number; transforms: (() => void)[] }[]
  ] {
    var newLeaf = newNodes[leafIndex];
    var options = [];
    var matched: { item: string; index: number } = null;
    var i = 0;

    while (matched === null && i < oldLeaves.length) {
      var oldLeaf = this.historyModel.getNodey(oldLeaves[i].item) as NodeyCode;
      var [score, updates] = this._matchLiteralNode(newLeaf, oldLeaf);

      if (score === 0) {
        // perfect match
        matched = { item: oldLeaves[i].item, index: i };
      } else if (score != -1)
        options[oldLeaves[i].index] = { score: score, transforms: updates };

      i++;
    }

    return [matched, options];
  }

  chooseMatchOption(
    leafIndex: number,
    options: { score: number; transforms: (() => void)[] }[],
    newNodes: ParserNodey[],
    oldLeaves: { item: string; index: number }[]
  ): MatchedNodey {
    var newLeaf = newNodes[leafIndex];
    console.log(
      "No exact match found for",
      newLeaf,
      " now options are ",
      options,
      oldLeaves
    );

    var bestMatch;
    var matchIndex;
    for (var k = 0; k < oldLeaves.length; k++) {
      var j = oldLeaves[k].index;
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
      var match: MatchedNodey = {
        nodey: oldLeaves[matchIndex].item,
        score: bestMatch.score
      };
      oldLeaves.splice(matchIndex, 1);
    } else {
      var match: MatchedNodey = {
        nodey: "",
        score: 1
      };
    }

    return match;
  }

  /*
*
* OLDER CONSTRUCTION
*
*/
  /*private _matchUpperNode(
    node: ParserNodey,
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
    node: ParserNodey,
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
  }*/

  private _matchLiteralNode(
    node: ParserNodey,
    potentialMatch: NodeyCode
  ): [number, (() => any)[]] {
    if (!(potentialMatch.literal && "literal" in node)) return [-1, []]; // no match possible
    //leaf nodes
    var score = this.matchLiterals(
      node.literal + "",
      potentialMatch.literal + ""
    );
    var transforms: (() => any)[] = [];
    if (score !== 0.0) {
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
    return levenshtein.get(val1, val2) / Math.max(val1.length, val2.length);
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

  export function changeLiteral(node: ParserNodey, nodeName: string) {
    var newLiteral = node.literal;
    var target = this.historyModel.getNodeyHead(nodeName) as NodeyCode;
    target.start = node.start;
    target.end = node.end;
    console.log("Changing literal from ", target, " to " + newLiteral);
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

  export function addNewNode(node: ParserNodey, at: number, target: NodeyCode) {
    var nodey = buildStarNode.bind(this)(node, target);
    nodey.parent = target.name;
    console.log("Added a new node ", nodey, " to ", target);
    var starTarget = this.historyModel.markAsEdited(target);
    starTarget.content.splice(at, 0, nodey.name);
  }

  export function buildStarNode(
    node: ParserNodey,
    target: NodeyCode,
    prior: NodeyCode = null
  ): NodeyCode {
    var n = new NodeyCode(node);
    n.id = "*";
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
