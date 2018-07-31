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

import {
  ParserNodey,
  ASTMatch,
  NodeyOptions,
  ParsedNodeOptions
} from "./ast-match";

export class ASTResolve {
  historyModel: HistoryModel;
  match: ASTMatch;

  constructor(historyModel: HistoryModel) {
    this.historyModel = historyModel;
    this.match = new ASTMatch(historyModel, this);
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
    var pos = editor.getCursorPosition();
    var addedLines = change.text;
    var removedLines = change.removed;
    var line = pos.line - (addedLines.length - 1) + (removedLines.length - 1);
    var ch = 0 - addedLines[0].length + removedLines[0].length;
    if (line != pos.line) {
      let lineText = editor.doc.getLine(line);
      ch += lineText.length;
    } else {
      ch += pos.column;
    }

    var range = {
      start: { line: line, ch: ch },
      end: { line: pos.line, ch: pos.column }
    }; // first convert code mirror coordinates to our coordinates
    console.log("cursor pos is now", pos, range);

    var affected = ASTUtils.findNodeAtRange(nodey, range, this.historyModel);

    if (affected) {
      //some types cannot be parsed alone by Python TODO
      var unparsable = ["Str", "STRING", "keyword", "NUMBER", "Num"];
      while (unparsable.indexOf(affected.type) !== -1) {
        console.log("affected is", affected);
        affected = this.historyModel.getNodey(affected.parent) as NodeyCode;
      }

      // shift all nodey positions after affected
      var newEnd = this.repairPositions(affected, change, range);
      // return the text from this node's new range
      var text = editor.doc.getRange(affected.start, newEnd);
      let textOrig = this.historyModel.inspector.renderNode(affected).text;
      console.log(
        "The exact affected nodey is",
        affected,
        "|" + text + "|",
        "|" + textOrig + "|",
        range.start,
        newEnd
      );
    } // if there's no specific node broken, the whole cell node is broken
    else {
      affected = nodey;
      // return the text from this node's new range
      var text = editor.doc.getValue();
      console.log(
        "The exact affected nodey is",
        affected,
        "|" + text + "|",
        range
      );
    }

    var updateID = crypto.randomBytes(20).toString("hex");
    affected.pendingUpdate = updateID;

    var kernel_reply = this.match.recieve_newVersion.bind(
      this.match,
      affected,
      updateID
    );
    return [kernel_reply, text];
  }

  matchASTOnInit(nodey: NodeyCodeCell) {
    var updateID = crypto.randomBytes(20).toString("hex");
    nodey.pendingUpdate = updateID;

    var kernel_reply = this.match.recieve_newVersion.bind(
      this.match,
      nodey,
      updateID
    );
    return kernel_reply;
  }

  repairPositions(
    affected: NodeyCode,
    change: CodeMirror.EditorChange,
    range: {
      start: { line: number; ch: number };
      end: { line: number; ch: number };
    }
  ): { line: number; ch: number } {
    // shift all nodes after this changed node
    var [nodeEnd, deltaLine, deltaCh] = this.calcShift(affected, change, range);
    console.log("SHIFT IS", nodeEnd, deltaLine, deltaCh, affected.end);
    if (affected.right) {
      var right = this.historyModel.getNodeyHead(affected.right) as NodeyCode;
      if (right.start.line !== nodeEnd.line) deltaCh = 0;
      this.shiftAllAfter(right, deltaLine, deltaCh);
    }
    return nodeEnd;
  }

  calcShift(
    affected: NodeyCode,
    change: CodeMirror.EditorChange,
    range: {
      start: { line: number; ch: number };
      end: { line: number; ch: number };
    }
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
    var endLine = range.end.line;

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

    if ("literal" in dict || SyntaxToken.KEY in dict) {
      //gotta check non-space Syntax tokens like brakets
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
      if (SyntaxToken.KEY in d && d[SyntaxToken.KEY] === " ") {
        // don't care about spacing
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
        if (name instanceof SyntaxToken) {
          if (name.tokens !== " ") {
            //ignore spaces
            var toktok: NodeyOptions = new NodeyOptions({
              nodey: name.tokens,
              syntok: true,
              match: null,
              possibleMatches: [],
              level: level + 1,
              row: kidRow,
              parentIndex: index
            });
            kidRow++;
            let tokIndex = nodeyList.push(toktok) - 1;
            leaves.push(tokIndex);
          }
        } else {
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
}
