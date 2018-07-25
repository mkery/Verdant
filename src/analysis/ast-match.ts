import { NodeyCode, NodeyCodeCell, SyntaxToken } from "../model/nodey";

import { HistoryModel } from "../model/history";

import { ASTUtils } from "./ast-utils";

import * as levenshtein from "fast-levenshtein";

import { ASTResolve } from "./ast-resolve";

export class ASTMatch {
  historyModel: HistoryModel;
  resolver: ASTResolve;

  constructor(historyModel: HistoryModel, resolver: ASTResolve) {
    this.historyModel = historyModel;
    this.resolver = resolver;
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
          type: "_"
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
        var [parsedList, newLeaves] = this.resolver.dictToNodeyList(dict);
        var [nodeyList, oldLeaves] = this.resolver.nodeyToLeaves(nodey);
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
          if ("syntok" in parsedList[num].nodey)
            return new SyntaxToken(parsedList[num].nodey.syntok);

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
      if (!nodeyEdited.end) {
        nodeyEdited.start = parsedNode.start;
        nodeyEdited.end = parsedNode.end;
      } else {
        // fix position but be sure it's relative to this node snippet
        // because may not be the whole cell, so does not start at 0
        nodeyEdited.start = parsedNode.start;
        nodeyEdited.end = parsedNode.end;
        nodeyEdited.positionRelativeTo(relativeTo);
      }
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

    /*
    * Distance score
    */
    score += Math.abs(parsedProfile.level - nodeyProfile.level);
    score += Math.abs(parsedProfile.row - nodeyProfile.row);

    /*
    * SyntaxToken match score for non-space tokens
    * no kids
    */
    if ("syntok" in parsedNode || nodeyProfile.syntok === true) {
      if (nodeyProfile.syntok === false || "syntok" in parsedNode == false)
        score = NO_MATCH_SCORE;
      else score = this.matchLiterals(parsedNode.syntok, nodeyProfile.nodey);
      return score;
    }

    var nodeyNode = this.historyModel.getNodey(nodeyProfile.nodey) as NodeyCode;
    /*
    * Literal match score
    * Literal nodes do not score for type or children
    */
    if ("literal" in parsedNode || nodeyNode.literal) {
      if ("literal" in parsedNode === false || !nodeyNode.literal)
        score = NO_MATCH_SCORE;
      else score += this.matchLiterals(parsedNode.literal, nodeyNode.literal);
      return score;
    }

    /*
    * Type score, need to have wildcard _ when type is unknown
    */
    if (parsedNode.type != "_" && nodeyNode.type !== parsedNode.type) {
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
        } //handle syntax token matches
        /*else {
          let syn2 = nodeyNode.content[index]; // super conservative matching. may need to fix
          if (syn2 instanceof SyntaxToken && index.tokens === syn2.tokens)
            score -= 1;
          else score += 1;
        }*/
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
    console.log("Building star node for ", node, n);
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
        if ("syntok" in leaf) n.content.push(new SyntaxToken(leaf.syntok));
        else {
          var child = this.buildStarNode(leaf, target, newNodeList, prior);
          child.parent = n.name;
          if (prior) prior.right = child.name;
          n.content.push(child.name);
          prior = child;
        }
      }
    }

    return n;
  }

  private matchLiterals(a: string, b: string) {
    let score = levenshtein.get(a, b); // / Math.max(a.length, b.length);
    if (score / Math.max(a.length, b.length) > 0.8) score = NO_MATCH_SCORE;
    console.log("maybe change literal", a, b, score);
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
  syntok: boolean = false;
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
    this.syntok = options.syntok || false;
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
