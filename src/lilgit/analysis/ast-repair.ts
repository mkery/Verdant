const crypto = require("crypto");
import { Nodey, NodeyCodeCell, NodeyMarkdown, NodeyNotebook } from "../nodey/";

import { log } from "../notebook";

import * as levenshtein from "fast-levenshtein";

import { History, Star } from "../history/";

import { jsn } from "../notebook";

import { ASTUtils } from "./ast-utils";

export class ASTRepair {
  public readonly history: History;

  constructor(history: History) {
    this.history = history;
  }

  /*
   * TODO repair nodey code that's not a cell
   */
  public async repair(
    nodey: Nodey | Star<Nodey>,
    newText?: string,
    newContent?: jsn
  ) {
    let toFix = nodey;
    if (nodey instanceof Star) toFix = nodey.value;

    if (toFix instanceof NodeyCodeCell)
      return this.repairCodeCell(toFix, newText);
    else if (toFix instanceof NodeyMarkdown)
      return this.repairMarkdown(toFix, newText);
    else if (toFix instanceof NodeyNotebook)
      return this.repairNotebook(toFix, newContent);
  }

  private repairNotebook(nodey: NodeyNotebook, newContent: jsn) {
    // TODO
    log("TODO", nodey, newContent);
  }

  private repairMarkdown(nodey: NodeyMarkdown, newText: string) {
    let oldText: string;
    if (nodey instanceof Star) oldText = nodey.value.markdown;
    else oldText = nodey.markdown;
    let score = -1;
    if (oldText && newText) score = levenshtein.get(oldText, newText);
    else if (!oldText && !newText) score = 0; //both uninitialized
    if (score !== 0) {
      let edited = this.history.stage.markAsEdited(nodey) as Star<
        NodeyMarkdown
      >;
      edited.value.markdown = newText;
      return edited;
    }
    return nodey;
  }

  private async repairCodeCell(
    nodeToFix: NodeyCodeCell | Star<NodeyCodeCell>,
    text: string
  ) {
    let nodey: NodeyCodeCell;
    if (nodeToFix instanceof Star) nodey = nodeToFix.value;
    else nodey = nodeToFix;

    let textOrig = this.history.inspector.renderNode(nodey);
    log(
      "The exact affected nodey is",
      nodey,
      "|" + text + "|",
      "|" + textOrig + "|"
    );
    if (text !== textOrig) {
      // some text has changed for sure
      let nodeEdited = this.history.stage.markAsEdited(nodeToFix) as Star<
        NodeyCodeCell
      >;
      var updateID = crypto.randomBytes(20).toString("hex");
      let nodey = nodeEdited.value;
      nodey.pendingUpdate = updateID;

      let newNodey = await ASTUtils.parseRequest(text);
      log("RECIEVED ", newNodey);

      if (updateID === nodey.pendingUpdate) nodey.updateState(newNodey);
    }
  }
}
