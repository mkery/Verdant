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

  dictToNodeyList(
    dict: ParserNodey,
    nodeyList: ParsedNodeOptions[] = [],
    leaves: number[] = []
  ): [ParsedNodeOptions[], number[], number[]] {
    // set up parsed nodey for matching
    var option: ParsedNodeOptions = {
      nodey: dict,
      match: null,
      possibleMatches: []
    };

    if ("literal" in dict) {
      var index = nodeyList.push(option) - 1;
      leaves.push(index);
      return [nodeyList, leaves, [index]];
    }

    if (!dict.content) {
      var index = nodeyList.push(option) - 1;
      return [nodeyList, leaves, [index]];
    }

    var children: any[] = [];
    dict.content.forEach((d: ParserNodey) => {
      if (SyntaxToken.KEY in dict) {
        children.push(new SyntaxToken(dict[SyntaxToken.KEY]));
      } else {
        let kids = [];
        [nodeyList, leaves, kids] = this.dictToNodeyList(d, nodeyList, leaves);
        //console.log("content is", d, children, nodeyList, kids);
        children = children.concat(kids);
      }
    });
    option.nodey = {
      start: dict.start,
      end: dict.end,
      content: children,
      type: dict.type
    };

    var index = nodeyList.push(option) - 1;
    children.forEach(num => {
      nodeyList[num].nodey.parent = index;
    });
    return [nodeyList, leaves, [index]];
  }

  nodeyToLeaves(
    nodey: NodeyCode,
    oldNodey: NodeyOptions[] = [],
    leaves: number[] = []
  ): [NodeyOptions[], number[]] {
    var option: NodeyOptions = {
      nodey: nodey.name,
      match: null,
      possibleMatches: []
    };

    var index = oldNodey.push(option) - 1;

    if (nodey.literal) leaves.push(index);
    else {
      nodey.content.forEach(name => {
        if (!(name instanceof SyntaxToken)) {
          var child = this.historyModel.getNodey(name) as NodeyCode;
          [oldNodey, leaves] = this.nodeyToLeaves(child, oldNodey, leaves);
        }
      });
    }
    return [oldNodey, leaves];
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
      console.log("Reduced AST", dict, nodey);
      console.log(this.historyModel.dump());

      /*
      * First, create a list of Parser nodey options,
      * a list of Nodey options,
      * and a list of leaves from the parser AST and the
      * nodey AST. The list of leaves is our starting point
      * for matching
      */
      var [newNodey, newLeaves] = this.dictToNodeyList(dict);
      var [oldNodey, oldLeaves] = this.nodeyToLeaves(nodey);
      console.log("Listified nodey", newNodey, newLeaves, oldNodey, oldLeaves);

      /*
      * Next, match leaves
      */
      this.matchLeaves(newNodey, newLeaves, oldNodey, oldLeaves);
      console.log("Matched Leaves!", newNodey, oldNodey);
      var newParents = this.grabUnmatchedParents(newLeaves, newNodey, oldNodey);
      while (newParents.length > 0) {
        console.log("Now need to match", newParents);
        this.matchParentNodes(newParents, newNodey, oldNodey);
        console.log("Matched parents!", newNodey, oldNodey);
        newParents = this.grabUnmatchedParents(newParents, newNodey, oldNodey);
      }
      this.finalizeMatch(newNodey.length - 1, newNodey, oldNodey, nodey);

      //resolved
      if (nodey.pendingUpdate === updateID) nodey.pendingUpdate = null;
    }
    return nodey;
  }

  finalizeMatch(
    root: number,
    newNodes: ParsedNodeOptions[],
    oldNodes: NodeyOptions[],
    relativeTo: NodeyCode
  ) {
    var parsedNode = newNodes[root].nodey;
    console.log("PARSED NODE", parsedNode);
    var match = newNodes[root].match;
    var nodeyEdited: NodeyCode;
    if (match) {
      var nodeyMatch = oldNodes[match.index];
      var nodey = this.historyModel.getNodey(nodeyMatch.nodey) as NodeyCode;
      if (match.score !== 0) {
        // there was some change
        nodeyEdited = this.historyModel.markAsEdited(nodey);
        if (parsedNode.literal) nodeyEdited.literal = parsedNode.literal;
        if (parsedNode.content) {
          console.log("parsed node content is ", parsedNode.content);
          var content = parsedNode.content.map(num => {
            let child = this.finalizeMatch(num, newNodes, oldNodes, relativeTo);
            child.parent = nodeyEdited.name;
            return child.name;
          });
          nodeyEdited.content = content;
          console.log("edited node is ", nodeyEdited);
        }
      } else nodeyEdited = nodey; // exactly the same
    } else {
      console.log("New Node!", parsedNode);
      nodeyEdited = this.buildStarNode(parsedNode, relativeTo);
    }
    return nodeyEdited;
  }

  grabUnmatchedParents(
    matchedLeaves: number[],
    newNodes: ParsedNodeOptions[],
    oldNodes: NodeyOptions[]
  ) {
    var singleParents: number[] = [];

    matchedLeaves.forEach(leafIndex => {
      var leaf = newNodes[leafIndex];
      if (leaf.nodey.parent) {
        var parent = newNodes[leaf.nodey.parent];

        if (!parent.match && leaf.match && leaf.match.index > -1) {
          if (singleParents.indexOf(leaf.nodey.parent) <= -1) {
            singleParents.push(leaf.nodey.parent);
          }

          var nodeyOpt = oldNodes[leaf.match.index];
          if (nodeyOpt.parentIndex) {
            var nodeyParentOpt = oldNodes[nodeyOpt.parentIndex];
            if (!nodeyParentOpt.match) {
              var matchIndex = nodeyParentOpt.possibleMatches.findIndex(
                item => item.index === leaf.nodey.parent
              );
              if (matchIndex <= -1) {
                nodeyParentOpt.possibleMatches.push({
                  index: leaf.nodey.parent,
                  score: NO_MATCH_SCORE
                });
                parent.possibleMatches.push({
                  index: nodeyOpt.parentIndex,
                  score: NO_MATCH_SCORE
                });
              }
            }
          }
        }
      }
    });

    return singleParents;
  }

  matchParentNodes(
    newParents: number[],
    newNodey: ParsedNodeOptions[],
    oldNodey: NodeyOptions[]
  ) {
    //for each leaf node, get its possible parents
    // the goal is, for the parent of the parsed leaf, try to figure out if it
    // is one of the old parents or no

    /*
    * First, get all the possible parent matches O(n)
    * 2. decide the best parent matches O(nk) where k = number possible matches
    * 3. update the history Model
    */
    var refineParsed: number[] = [];
    var refineNodey: number[] = [];

    // Now we have a crazy list for all nodey parents and all parsed parents
    // of possible pairings. Grade each.
    newParents.forEach(index => {
      var parsedParent = newNodey[index];
      var leafChildren = parsedParent.nodey.content;
      parsedParent.possibleMatches.forEach(candidate => {
        var nodeyParent = oldNodey[candidate.index];
        var nodey = this.historyModel.getNodey(nodeyParent.nodey) as NodeyCode;
        var score = this.scoreParentMatch(
          parsedParent.nodey,
          nodey,
          leafChildren,
          oldNodey
        );
        candidate.score = score;
        if (score === 0) {
          //Perfect match!
          parsedParent.match = candidate;
          nodeyParent.match = { index: index, score: 0 };
        } else {
          //one possible match
          var matchIndex = nodeyParent.possibleMatches.findIndex(
            item => item.index === index
          );
          nodeyParent.possibleMatches[matchIndex].score = score;
          refineNodey.push(candidate.index);
          refineParsed.push(index);
        }
      });
    });

    //Now choose the best score for the nodeyParents
    refineNodey.forEach(index => {
      var nodeyParent = oldNodey[index];
      if (!nodeyParent.match) {
        var bestMatch = { index: -1, score: NO_MATCH_SCORE };
        nodeyParent.possibleMatches.forEach(candidate => {
          if (candidate.score < bestMatch.score) bestMatch = candidate;
        });
        nodeyParent.match = bestMatch;
        newNodey[bestMatch.index].match = {
          index: index,
          score: bestMatch.score
        };
      }
    });

    // now choose the best match for each parsed Parent
    refineParsed.forEach(index => {
      var parsedParent = newNodey[index];
      if (!parsedParent.match) {
        var bestMatch = { index: -1, score: NO_MATCH_SCORE };
        parsedParent.possibleMatches.forEach(candidate => {
          var nodeyParent = oldNodey[candidate.index];
          if (!nodeyParent.match && candidate.score < bestMatch.score)
            bestMatch = candidate;
        });
        console.log("best match for ", parsedParent, "is", bestMatch);
        if (bestMatch.index > -1) oldNodey[bestMatch.index].match = bestMatch;
        else parsedParent.match = { index: -1, score: 1 };
      }
    });
  }

  scoreParentMatch(
    parsedParent: ParserNodey,
    nodeParent: NodeyCode,
    leafChildren: ParsedNodeOptions[],
    oldNodey: NodeyOptions[]
  ): number {
    /* Cost function
    *  current children versus children in oldParent
    *  cost of deleting oldParent
    *  cost of changig type of oldParent, if even a legal move
    *  cost of inserting a new node newParent
    *
    */
    var score = NO_MATCH_SCORE;
    if (nodeParent.type !== parsedParent.type) {
      //TODO Case 1 or Case 2 is possible look up the chain
    } else {
      var numChildren = nodeParent.getChildren().length;
      var score = numChildren;
      leafChildren.forEach(leaf => {
        score += leaf.match.score;
        if (nodeParent.content.indexOf(oldNodey[leaf.match.index].nodey) > -1)
          score -= 1;
        else score += 1;
      });
      //TODO decide when Case 2 is possible and how
    }
    return score;
  }

  matchLeaves(
    newNodes: ParsedNodeOptions[],
    newLeaves: number[],
    oldNodes: NodeyOptions[],
    oldLeaves: number[]
  ) {
    newLeaves.forEach((leafIndex: number) => {
      var leaf = newNodes[leafIndex];
      this.findLeafMatchOptions(leaf, oldNodes, oldLeaves);
    });

    oldLeaves.forEach((leafIndex: number) => {
      var nodeyOpt = oldNodes[leafIndex];
      if (!nodeyOpt.match) {
        var bestMatch = { index: -1, score: NO_MATCH_SCORE };
        nodeyOpt.possibleMatches.forEach(match => {
          var leaf = newNodes[match.index];
          if (!leaf.match && match.score < bestMatch.score) bestMatch = match;
        });
        nodeyOpt.match = bestMatch;
        if (bestMatch.index > -1) {
          var leaf = newNodes[bestMatch.index];
          leaf.match = { index: leafIndex, score: bestMatch.score };
        }
      }
    });

    newLeaves.forEach((leafIndex: number) => {
      var leaf = newNodes[leafIndex];
      if (!leaf.match) leaf.match = { index: -1, score: 1 };
    });
  }

  findLeafMatchOptions(
    leaf: ParsedNodeOptions,
    oldNodeList: NodeyOptions[],
    oldLeaves: number[]
  ) {
    var i = 0;
    while (leaf.match === null && i < oldLeaves.length) {
      var oldLeaf = oldNodeList[oldLeaves[i]];
      if (!oldLeaf.match) {
        var oldNodey = this.historyModel.getNodey(oldLeaf.nodey) as NodeyCode;
        var score = this.matchLiteralNode(leaf.nodey, oldNodey);

        if (score === 0) {
          // perfect match
          leaf.match = { index: i, score: score };
          oldLeaf.match = { index: i, score: score };
        } else if (score != -1) {
          leaf.possibleMatches.push({ index: i, score: score });
          oldLeaf.possibleMatches.push({ index: i, score: score });
        }
      }
      i++;
    }
  }

  buildStarNode(
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

  private matchLiteralNode(
    node: ParserNodey,
    potentialMatch: NodeyCode
  ): number {
    if (!(potentialMatch.literal && "literal" in node)) return -1; // no match possible
    //leaf nodes
    var score =
      levenshtein.get(node.literal, potentialMatch.literal) /
      Math.max(node.literal.length, potentialMatch.literal.length);
    if (score !== 0.0) {
      // not a perfect match
      console.log(
        "maybe change literal",
        node.literal,
        potentialMatch.literal,
        score
      );
    }
    return score;
  }
}

export interface ParsedNodeOptions {
  nodey: ParserNodey;
  match: Match;
  possibleMatches: Match[];
}

export interface NodeyOptions {
  nodey: string;
  parentIndex?: number;
  match: Match;
  possibleMatches: Match[];
}

export interface ParserNodey {
  content?: any[];
  start: { line: number; ch: number };
  end: { line: number; ch: number };
  type?: string;
  literal?: string;
  syntok?: string;
  parent?: number;
}

export interface Match {
  index: number;
  score: number;
}

const NO_MATCH_SCORE = Number.MAX_SAFE_INTEGER;
