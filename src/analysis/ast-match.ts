import { NodeyCode, NodeyCodeCell, SyntaxToken } from "../model/nodey";

import { History } from "../model/history";

import { ASTUtils, $NodeyCode$ } from "./ast-utils";

import { Star, UnsavedStar } from "../model/history-stage";

import * as levenshtein from "fast-levenshtein";

import { ASTResolve } from "./ast-resolve";

export class ASTMatch {
  history: History;
  resolver: ASTResolve;

  constructor(history: History, resolver: ASTResolve) {
    this.history = history;
    this.resolver = resolver;
  }

  async recieve_newVersion(
    nodey: $NodeyCode$,
    updateID: string,
    jsn: string
  ): Promise<$NodeyCode$> {
    if (
      $NodeyCode$.pendingUpdate(nodey) &&
      $NodeyCode$.pendingUpdate(nodey) === updateID
    ) {
      console.log("Time to resolve", jsn, "with", nodey);

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
        var nodeyList: NodeyMatchOptions[] = [
          new NodeyMatchOptions({
            nodey: nodey.name,
            match: { index: 0, score: 0 },
            possibleMatches: [],
            level: 0,
            row: 0
          })
        ];
      } else {
        dict = JSON.parse(jsn) as ParserNodey;

        /* only reduce if the target type is not a Module
        * NodeyCodeCell are always Module AST type, so
        * no need to reduce
        */
        let val: NodeyCode;
        if (nodey instanceof Star) val = nodey.value;
        else val = nodey;
        if (val instanceof NodeyCodeCell === false) {
          dict = ASTUtils.reduceASTDict(dict) as ParserNodey;
          console.log("Reduced AST", dict, nodey);
        }
        console.log("COMPARING AST", dict, nodey);
        this.history.dump();

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

      let newNodey = this.finalizeMatch(
        parsedList.length - 1,
        parsedList,
        nodeyList,
        null // this nodey is the starting root so no viable parent
      );

      //resolved
      if ($NodeyCode$.pendingUpdate(nodey) === updateID)
        $NodeyCode$.setPendingUpdate(nodey, null);
      return newNodey;
    } else {
      console.log(
        "RECIEVED OLD UPDATE",
        updateID,
        jsn,
        $NodeyCode$.pendingUpdate(nodey)
      );
      return nodey;
    }
  }

  finalizeMatch(
    root: number,
    parsedList: ParsedNodeOptions[],
    nodeyList: NodeyMatchOptions[],
    parent: $NodeyCode$
  ): $NodeyCode$ {
    var parsedNode = parsedList[root].nodey;
    var match = parsedList[root].match;
    var nodeyEdited: $NodeyCode$;
    if (match !== null && match.index > -1) {
      var nodeyMatch = nodeyList[match.index];
      var nodey = this.history.store.getLatestOf(
        nodeyMatch.nodey
      ) as $NodeyCode$;
      //console.log("PARSED NODE", parsedNode, nodey);
      if (match.score !== 0) {
        // there was some change
        nodeyEdited = this.history.stage.markAsEdited(nodey) as Star<NodeyCode>;
        if (parsedNode.literal) nodeyEdited.value.literal = parsedNode.literal;
      } else nodeyEdited = nodey; // exactly the same

      // unfortunately we traverse even if no change if positions aren't set
      if (
        parsedNode.content &&
        (match.score !== 0 || !$NodeyCode$.getEnd(nodeyEdited))
      ) {
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
        $NodeyCode$.setContent(nodeyEdited, content);
        //console.log("edited node is ", nodeyEdited);
      }
      //fix position
      if (!$NodeyCode$.getEnd(nodeyEdited)) {
        $NodeyCode$.setStart(nodeyEdited, {
          line: parsedNode.start.line - 1,
          ch: Math.max(parsedNode.start.ch - 1, 0) //TODO bug!
        });
        $NodeyCode$.setEnd(nodeyEdited, {
          line: parsedNode.end.line - 1,
          ch: Math.max(parsedNode.end.ch - 1, 0) //TODO bug!
        });
      } else {
        // fix position but be sure it's relative to this node snippet
        // because may not be the whole cell, so does not start at 0
        $NodeyCode$.setStart(nodeyEdited, {
          line: parsedNode.start.line - 1,
          ch: Math.max(parsedNode.start.ch - 1, 0) //TODO bug!
        });
        $NodeyCode$.setEnd(nodeyEdited, {
          line: parsedNode.end.line - 1,
          ch: Math.max(parsedNode.end.ch - 1, 0) //TODO bug!
        });
        $NodeyCode$.positionRelativeTo(nodeyEdited, parent);
      }
    } else {
      console.log("New Node!", parsedNode, parent);
      if ("syntok" in parsedNode) {
        /*
          Crud. This is a dead end for matching because if we've reached here,
          a new syntok has shown up without a parent. This can happen if a chunk
          of code is commented out. Probably needs some special matching case
          to make smooth matching between code being commented and not //TODO
        */
        console.log("Attempt force match!", parent);
        nodeyEdited = this.forceReplace(parent, parsedNode);
      } else {
        nodeyEdited = this.buildStarNode(parsedNode, parent, parsedList);
      }
    }
    return nodeyEdited;
  }

  grabUnmatchedParents(
    matchedLeaves: number[],
    newParents: number[][],
    parsedList: ParsedNodeOptions[],
    nodeyList: NodeyMatchOptions[]
  ): number[][] {
    //console.log("GRAB grabUnmatchedParents ", matchedLeaves);
    if (matchedLeaves.length < 1) {
      // make sure we don't miss any nodes that need to be matched
      parsedList.map((item, index) => {
        if (!item.match) {
          if (!newParents[item.level]) newParents[item.level] = [index];
          else newParents[item.level].push(index);
        }
      });
    } else
      matchedLeaves.forEach(leafIndex => {
        var leaf = parsedList[leafIndex];
        if ("parent" in leaf.nodey) {
          var parent = parsedList[leaf.nodey.parent];

          if (!parent.match) {
            if (!newParents[parent.level])
              newParents[parent.level] = [leaf.nodey.parent];
            else if (
              newParents[parent.level].indexOf(leaf.nodey.parent) <= -1
            ) {
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
    nodeyList: NodeyMatchOptions[]
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
        this.declareMatch(
          nodeyList[bestMatch.index],
          parsedProfile,
          bestMatch.score
        ); //DEBUG only

        if (bestMatch.index > -1) {
          nodeyList[bestMatch.index].match = bestMatch;
          parsedProfile.match = bestMatch;
        } else parsedProfile.match = { index: -1, score: 1 };
      }
    });
  }

  scoreMatch(
    parsedProfile: ParsedNodeOptions,
    nodeyProfile: NodeyMatchOptions,
    parsedList: ParsedNodeOptions[],
    nodeyList: NodeyMatchOptions[]
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

    var nodeyNode = this.history.store.getLatestOf(
      nodeyProfile.nodey
    ) as $NodeyCode$;
    console.log("Looking for nodey", nodeyProfile.nodey, nodeyNode);
    /*
    * Literal match score
    * Literal nodes do not score for type or children
    */
    let nodeyLiteral = $NodeyCode$.getLiteral(nodeyNode);
    if ("literal" in parsedNode || nodeyLiteral) {
      if (!("literal" in parsedNode) || !nodeyLiteral) score = NO_MATCH_SCORE;
      else score += this.matchLiterals(parsedNode.literal, nodeyLiteral);
      console.log(
        "Matching two literals!",
        score,
        parsedNode.literal,
        nodeyLiteral,
        "literal" in parsedNode,
        !nodeyLiteral
      );
      return score;
    }

    /*
    * Type score, need to have wildcard _ when type is unknown
    */
    let nodeyType = $NodeyCode$.getType(nodeyNode);
    let parsedType = parsedNode.type;
    console.log("TYPE MATCH?", nodeyType, parsedType, nodeyType === parsedType);
    if (parsedType != "_" && nodeyType !== parsedType) {
      score = NO_MATCH_SCORE;
      return score; //TODO some cases can change type
    }

    /*
    * Child match score
    */
    let nodeyContent = $NodeyCode$.getContent(nodeyNode);
    let parsedContent = parsedNode.content;
    let childScore = 0;
    if (parsedContent && nodeyContent) {
      childScore += nodeyContent.length; // number of children including syntok
      parsedContent.forEach(index => {
        if (index instanceof SyntaxToken === false) {
          var leaf = parsedList[index];
          if (leaf.match && leaf.match.index > -1) {
            childScore += leaf.match.score;
            /*console.log(
              "child matches " +
                leaf.match.score +
                " " +
                childScore +
                " " +
                score
            );//DEBUG only*/
            var matchNodey = nodeyList[leaf.match.index];
            //check if nodey child is accounted for
            if (
              matchNodey.syntok === true ||
              nodeyContent.indexOf(matchNodey.nodey) > -1
            ) {
              childScore -= 1;
            } else childScore += 1; //nodey child did not belong with nodeyNode
          } else {
            childScore += 1; //new child
            console.log("leaf has no match, ", leaf, index); //DEBUG only
          }
        } //handle syntax token matches for spaces
        else {
          childScore -= 1;
        }
      });
    }
    //console.log("child score is ", childScore, score);
    score += childScore;
    return score;
  }

  // a debugging method only
  private declareMatch(
    nodeyOp: NodeyMatchOptions,
    parsedOp: ParsedNodeOptions,
    score: number
  ) {
    /*let rendered = "";
    if (!nodeyOp) rendered = "(V●ᴥ●V)";
    else if (nodeyOp.syntok) rendered = nodeyOp.nodey;
    else {
      let nodey = this.history.store.get(nodeyOp.nodey);
      rendered = this.history.inspector.renderNode(nodey).text;
    }*/
    console.log("Best match for ", parsedOp, "is " + score + " = ", nodeyOp);
  }

  matchLeaves(
    parsedList: ParsedNodeOptions[],
    newLeaves: number[],
    nodeyList: NodeyMatchOptions[],
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
        this.declareMatch(
          nodeyOpt,
          parsedList[bestMatch.index],
          bestMatch.score
        ); //DEBUG only
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
    nodeyList: NodeyMatchOptions[],
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
    newNodeDat: ParserNodey,
    parentNode: $NodeyCode$,
    newNodeList: ParsedNodeOptions[],
    prior: $NodeyCode$ = null
  ): UnsavedStar {
    /*
    * First create a new Nodey Code
    */
    let nodey = new NodeyCode(newNodeDat);
    nodey.parent = parentNode.name;
    if (prior) $NodeyCode$.setRight(prior, nodey.name);
    prior = null;

    /* convert the coordinates of the range to code mirror style */
    nodey.start.line -= 1;
    nodey.end.line -= 1;
    nodey.start.ch -= 1;
    nodey.end.ch -= 1;

    /*
    * Adjust the coordinates of the new node to be relative
    * to established nodes
    */
    if ($NodeyCode$.getStart(parentNode))
      $NodeyCode$.positionRelativeTo(nodey, parentNode); //TODO if from the past, target may not have a position

    /*
    * Now store this new star node in temp store
    */
    let star = this.history.stage.markPendingNewNode(nodey, parentNode);

    /*
    * Finally go through the content of this new star node
    * and create star nodes of all its children
    */
    if (newNodeDat.content)
      star.value.content = newNodeDat.content.map(item => {
        let child: SyntaxToken | string;
        if (item instanceof SyntaxToken) child = item;
        else {
          var leaf = newNodeList[item].nodey;
          if ("syntok" in leaf) child = new SyntaxToken(leaf.syntok);
          else {
            let babyStar = this.buildStarNode(
              leaf,
              parentNode,
              newNodeList,
              prior
            );
            babyStar.parent = star.name;
            if (prior) $NodeyCode$.setRight(prior, babyStar.name);
            prior = babyStar;
            child = babyStar.name;
          }
        }
        return child;
      });

    console.log("Building star node for ", newNodeDat, star, parentNode);
    return star;
  }

  private matchLiterals(a: string, b: string) {
    let score = levenshtein.get(a, b); // / Math.max(a.length, b.length);
    //if (score / Math.max(a.length, b.length) > 0.8) score = NO_MATCH_SCORE;
    //console.log("maybe change literal", a, b, score);
    return score;
  }

  // HACK: see special case in finalizeMatch above, need a more robust solution
  private forceReplace(
    nodey: $NodeyCode$,
    parsedSyntok: ParserNodey
  ): Star<NodeyCode> {
    let nodeyEdited;
    if (nodey instanceof Star) nodeyEdited = nodey;
    else
      nodeyEdited = this.history.stage.markAsEdited(nodey) as Star<NodeyCode>;
    if (nodeyEdited.value.literal) nodeyEdited.value.literal = null;
    nodeyEdited.value.content = [new SyntaxToken(parsedSyntok.syntok)];
    console.log("FORCE REPLACE", nodeyEdited);
    return nodeyEdited;
  }
}

export interface ParsedNodeOptions {
  nodey: ParserNodey;
  match: Match;
  possibleMatches: Match[];
  level: number;
  row: number;
}

export class NodeyMatchOptions {
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
