import {
  NodeyCode,
  NodeyCodeCell,
  NodeyMarkdown,
  SyntaxToken
} from "../model/nodey";

import * as CodeMirror from "codemirror";

import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import { HistoryModel } from "../model/history";

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
      var unparsable = ["Str", "STRING", "keyword", "NUMBER", "Num", "COMMENT"];
      while (unparsable.indexOf(affected.type) !== -1) {
        console.log("affected is", affected);
        affected = this.historyModel.getNodey(affected.parent) as NodeyCode;
      }

      // shift all nodey positions after affected
      var newEnd = this.repairPositions(affected, change);
      // return the text from this node's new range
      var text = editor.doc.getRange(
        { line: affected.start.line, ch: Math.max(affected.start.ch - 1, 0) },
        newEnd
      );
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
    leaves: number[] = [],
    level: number = 0,
    row: number = 0
  ): [ParsedNodeOptions[], number[], number[]] {
    // set up parsed nodey for matching
    var option: ParsedNodeOptions = {
      nodey: dict,
      match: null,
      possibleMatches: [],
      level: level,
      row: row
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
    var kidRow = 0;
    dict.content.forEach((d: ParserNodey) => {
      if (SyntaxToken.KEY in d) {
        children.push(new SyntaxToken(d[SyntaxToken.KEY]));
      } else {
        let kids = [];
        [nodeyList, leaves, kids] = this.dictToNodeyList(
          d,
          nodeyList,
          leaves,
          level + 1,
          kidRow
        );
        kidRow++;
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
      if (num instanceof SyntaxToken === false)
        nodeyList[num].nodey.parent = index;
    });
    return [nodeyList, leaves, [index]];
  }

  nodeyToLeaves(
    nodey: NodeyCode,
    nodeyList: NodeyOptions[] = [],
    leaves: number[] = [],
    parentIndex: number = -1,
    level: number = 0,
    row: number = 0
  ): [NodeyOptions[], number[]] {
    var option: NodeyOptions = new NodeyOptions({
      nodey: nodey.name,
      match: null,
      possibleMatches: [],
      level: level,
      row: row
    });

    if (parentIndex > -1) option.parentIndex = parentIndex;
    var index = nodeyList.push(option) - 1;

    if (nodey.literal) leaves.push(index);
    else if (nodey.content) {
      var kidRow = 0;
      nodey.content.forEach(name => {
        if (!(name instanceof SyntaxToken)) {
          var child = this.historyModel.getNodey(name) as NodeyCode;
          [nodeyList, leaves] = this.nodeyToLeaves(
            child,
            nodeyList,
            leaves,
            index,
            level + 1,
            kidRow
          );
          kidRow++;
        }
      });
    }
    return [nodeyList, leaves];
  }

  recieve_newVersion(
    nodey: NodeyCode,
    updateID: string,
    jsn: string
  ): NodeyCode {
    if (nodey.pendingUpdate && nodey.pendingUpdate === updateID) {
      //console.log("Time to resolve", jsn, "with", nodey);
      var dict: ParserNodey;
      if (jsn.length < 2) {
        //just an empty cell
        dict = {
          start: { line: 0, ch: 0 },
          end: { line: 0, ch: 0 },
          type: "Module"
        };
        var parsedList: ParsedNodeOptions[] = [
          {
            nodey: dict,
            match: { index: 0, score: 0 },
            possibleMatches: [],
            level: 0,
            row: 0
          }
        ];
        var nodeyList: NodeyOptions[] = [
          new NodeyOptions({
            nodey: nodey.name,
            match: { index: 0, score: 0 },
            possibleMatches: [],
            level: 0,
            row: 0
          })
        ];
      } else {
        dict = JSON.parse(jsn) as ParserNodey;
        if (nodey instanceof NodeyCodeCell === false) {
          // only reduce if the target type is not a Module
          // NodeyCodeCell are always Module AST type, so
          // no need to reduce
          dict = ASTUtils.reduceASTDict(dict) as ParserNodey;
        }
        console.log("Reduced AST", dict, nodey);
        console.log(this.historyModel.dump());

        /*
      * First, create a list of Parser nodey options,
      * a list of Nodey options,
      * and a list of leaves from the parser AST and the
      * nodey AST. The list of leaves is our starting point
      * for matching
      */
        var [parsedList, newLeaves] = this.dictToNodeyList(dict);
        var [nodeyList, oldLeaves] = this.nodeyToLeaves(nodey);
        console.log("Listified nodey", parsedList, nodeyList);

        /*
      * Next, match leaves
      */
        this.matchLeaves(parsedList, newLeaves, nodeyList, oldLeaves);
        var newParents: number[][] = [];
        newParents = this.grabUnmatchedParents(
          newLeaves,
          newParents,
          parsedList,
          nodeyList
        );
        console.log(
          "Matched Leaves!",
          parsedList,
          nodeyList,
          newParents,
          newLeaves
        );
        while (newParents.length > 0) {
          var parents = newParents.pop();
          //just in case there is no parent on some levels
          while ((!parents || parents.length === 0) && newParents.length > 0)
            parents = newParents.pop();
          console.log("need to match", parents, newParents);
          this.matchParentNodes(parents, parsedList, nodeyList);
          newParents = this.grabUnmatchedParents(
            parents,
            newParents,
            parsedList,
            nodeyList
          );
        }
      }
      this.finalizeMatch(parsedList.length - 1, parsedList, nodeyList, nodey);

      //resolved
      if (nodey.pendingUpdate === updateID) nodey.pendingUpdate = null;
    }
    return nodey;
  }

  finalizeMatch(
    root: number,
    parsedList: ParsedNodeOptions[],
    nodeyList: NodeyOptions[],
    relativeTo: NodeyCode
  ) {
    var parsedNode = parsedList[root].nodey;
    var match = parsedList[root].match;
    var nodeyEdited: NodeyCode;
    if (match !== null && match.index > -1) {
      var nodeyMatch = nodeyList[match.index];
      var nodey = this.historyModel.getNodey(nodeyMatch.nodey) as NodeyCode;
      //console.log("PARSED NODE", parsedNode, nodey);
      if (match.score !== 0) {
        // there was some change
        nodeyEdited = this.historyModel.markAsEdited(nodey);
        if (parsedNode.literal) nodeyEdited.literal = parsedNode.literal;
      } else nodeyEdited = nodey; // exactly the same

      // unfortunately we traverse even if no change if positions aren't set
      if (parsedNode.content && (match.score !== 0 || !nodeyEdited.end)) {
        //TODO optimize
        var content = parsedNode.content.map(num => {
          if (num instanceof SyntaxToken) return num;

          let child = this.finalizeMatch(
            num,
            parsedList,
            nodeyList,
            nodeyEdited
          );
          child.parent = nodeyEdited.name;
          return child.name;
        });
        nodeyEdited.content = content;
        //console.log("edited node is ", nodeyEdited);
      }
      //fix position
      nodeyEdited.start = parsedNode.start;
      nodeyEdited.end = parsedNode.end;
    } else {
      console.log("New Node!", parsedNode);
      nodeyEdited = this.buildStarNode(parsedNode, relativeTo, parsedList);
      if (!relativeTo.content) relativeTo.content = [];
      relativeTo.content.push(nodeyEdited.name);
    }
    return nodeyEdited;
  }

  grabUnmatchedParents(
    matchedLeaves: number[],
    newParents: number[][],
    parsedList: ParsedNodeOptions[],
    nodeyList: NodeyOptions[]
  ): number[][] {
    matchedLeaves.forEach(leafIndex => {
      var leaf = parsedList[leafIndex];
      if ("parent" in leaf.nodey) {
        var parent = parsedList[leaf.nodey.parent];

        if (!parent.match) {
          if (!newParents[parent.level])
            newParents[parent.level] = [leaf.nodey.parent];
          else if (newParents[parent.level].indexOf(leaf.nodey.parent) <= -1) {
            newParents[parent.level].push(leaf.nodey.parent);
          }

          if (leaf.match && leaf.match.index > -1) {
            var nodeyOpt = nodeyList[leaf.match.index];
            if ("parentIndex" in nodeyOpt && nodeyOpt.parentIndex !== null) {
              var nodeyParentOpt = nodeyList[nodeyOpt.parentIndex];
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
      }
    });

    return newParents;
  }

  matchParentNodes(
    newParents: number[],
    parsedList: ParsedNodeOptions[],
    nodeyList: NodeyOptions[]
  ) {
    var nodeyCandidates: number[] = [];
    //for each leaf node, get its possible parents
    // the goal is, for the parent of the parsed leaf, try to figure out if it
    // is one of the old parents or no

    /*
    * First, get all the possible parent matches O(n)
    * 2. decide the best parent matches O(nk) where k = number possible matches
    * 3. update the history Model
    */
    var refineParsed: number[] = [];

    // Now we have a crazy list for all nodey parents and all parsed parents
    // of possible pairings. Grade each.
    newParents.forEach(index => {
      var parsedNodey = parsedList[index];
      var options = nodeyCandidates;
      if (parsedNodey.possibleMatches.length > 0)
        options = parsedNodey.possibleMatches.map(item => item.index);
      else if (nodeyCandidates.length < 1) {
        // only make this list if we need to
        nodeyList.forEach((item, index) => {
          if (!item.match) nodeyCandidates.push(index);
        });
      }
      this.findMatchOptions(index, options, nodeyList, parsedList);
      if (!parsedNodey.match) refineParsed.push(index);
    });

    // now choose the best match for each parsed Parent
    refineParsed.forEach(index => {
      var parsedProfile = parsedList[index];
      if (!parsedProfile.match) {
        var bestMatch = { index: -1, score: NO_MATCH_SCORE };
        parsedProfile.possibleMatches.forEach(candidate => {
          var nodeyProfile = nodeyList[candidate.index];
          if (!nodeyProfile.match && candidate.score < bestMatch.score) {
            /*
            * nodeyProfile is currently a top choice for parsedProfile
            * check that parsedProfile is also a top choice for nodeyProfile
            */
            if (nodeyProfile.isTopChoice(index, parsedList)) {
              bestMatch = candidate;
            }
          }
        });
        console.log("best match for ", parsedProfile, "is", bestMatch);

        if (bestMatch.index > -1) {
          nodeyList[bestMatch.index].match = bestMatch;
          parsedProfile.match = bestMatch;
        } else parsedProfile.match = { index: -1, score: 1 };
      }
    });
  }

  scoreMatch(
    parsedProfile: ParsedNodeOptions,
    nodeyProfile: NodeyOptions,
    parsedList: ParsedNodeOptions[],
    nodeyList: NodeyOptions[]
  ): number {
    /*
    * Start with a perfect score
    */
    var score = 0;
    var parsedNode = parsedProfile.nodey;
    var nodeyNode = this.historyModel.getNodey(nodeyProfile.nodey) as NodeyCode;

    /*
    * Distance score
    */
    score += Math.abs(parsedProfile.level - nodeyProfile.level);
    score += Math.abs(parsedProfile.row - nodeyProfile.row);

    /*
    * Literal match score
    * Literal nodes do not score for type or children
    */
    if ("literal" in parsedNode && nodeyNode.literal) {
      score += this.matchLiteralNode(parsedNode, nodeyNode);
      return score;
    }

    /*
    * Type score
    */
    if (nodeyNode.type !== parsedNode.type) {
      score = NO_MATCH_SCORE;
      return score; //TODO some cases can change type
    }

    /*
    * Child match score
    */
    var leafChildren = parsedNode.content;
    if (leafChildren) {
      var numChildren = nodeyNode.getChildren().length;
      score += numChildren;
      leafChildren.forEach(index => {
        if (index instanceof SyntaxToken === false) {
          var leaf = parsedList[index];
          if (leaf.match && leaf.match.index > -1) {
            score += leaf.match.score;
            var matchNodey = nodeyList[leaf.match.index].nodey;
            //check if nodey child is accounted for
            if (nodeyNode.hasChild(matchNodey)) score -= 1;
            else score += 1; //nodey child did not belong with nodeyNode
          } else {
            score += 1; //new child
            console.log("leaf has no match, ", leaf, index); //DEBUG only
          }
        }
      });
    }

    return score;
  }

  matchLeaves(
    parsedList: ParsedNodeOptions[],
    newLeaves: number[],
    nodeyList: NodeyOptions[],
    oldLeaves: number[]
  ) {
    newLeaves.forEach((leafIndex: number) => {
      this.findMatchOptions(leafIndex, oldLeaves, nodeyList, parsedList);
    });

    oldLeaves.forEach((leafIndex: number) => {
      var nodeyOpt = nodeyList[leafIndex];
      if (!nodeyOpt.match) {
        var bestMatch = { index: -1, score: NO_MATCH_SCORE };
        nodeyOpt.possibleMatches.forEach(match => {
          var leaf = parsedList[match.index];
          if (!leaf.match && match.score < bestMatch.score) bestMatch = match;
        });
        nodeyOpt.match = bestMatch;
        if (bestMatch.index > -1) {
          var leaf = parsedList[bestMatch.index];
          leaf.match = { index: leafIndex, score: bestMatch.score };
        }
      }
    });

    newLeaves.forEach((leafIndex: number) => {
      var leaf = parsedList[leafIndex];
      if (!leaf.match) leaf.match = { index: -1, score: 1 };
    });
  }

  findMatchOptions(
    parsedIndex: number,
    nodeyCandidates: number[],
    nodeyList: NodeyOptions[],
    parsedList: ParsedNodeOptions[]
  ) {
    var parsedProfile = parsedList[parsedIndex];
    var i = 0;
    while (parsedProfile.match === null && i < nodeyCandidates.length) {
      var candidate = nodeyCandidates[i];
      var nodeyProfile = nodeyList[candidate];
      if (!nodeyProfile.match) {
        var score = this.scoreMatch(
          parsedProfile,
          nodeyProfile,
          parsedList,
          nodeyList
        );

        if (score === 0) {
          //Perfect match!
          parsedProfile.match = { index: candidate, score: 0 };
          nodeyProfile.match = { index: parsedIndex, score: 0 };
        } else {
          nodeyProfile.possibleMatches.push({
            score: score,
            index: parsedIndex
          });
          parsedProfile.possibleMatches.push({
            score: score,
            index: candidate
          });
        }
      }
      i++;
    }
  }

  buildStarNode(
    node: ParserNodey,
    target: NodeyCode,
    newNodeList: ParsedNodeOptions[],
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
      if (node.content[item] instanceof SyntaxToken)
        n.content.push(node.content[item]);
      else {
        var leaf = newNodeList[node.content[item]].nodey;
        var child = this.buildStarNode(leaf, target, newNodeList, prior);
        child.parent = n.name;
        if (prior) prior.right = child.name;
        n.content.push(child.name);
        prior = child;
      }
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
  level: number;
  row: number;
}

export class NodeyOptions {
  nodey: string;
  parentIndex?: number;
  match: Match;
  possibleMatches: Match[];
  level: number;
  row: number;
  private topChoice: number = NO_MATCH_SCORE;

  constructor(options: { [key: string]: any }) {
    this.nodey = options.nodey;
    this.parentIndex = options.parentIndex || null;
    this.match = options.match || null;
    this.possibleMatches = options.possibleMatches || [];
    this.level = options.level;
    this.row = options.row;
  }

  isTopChoice(index: number, parsedList: ParsedNodeOptions[]) {
    if (this.topChoice === NO_MATCH_SCORE || parsedList[this.topChoice].match) {
      this.possibleMatches = this.possibleMatches.filter(item => {
        if (item.index < 0) return true;
        var parsed = parsedList[item.index];
        if (parsed.match) return false;
        else if (item.score < this.topChoice) this.topChoice = item.index;
        return true;
      });
    }
    return this.topChoice === index;
  }
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
