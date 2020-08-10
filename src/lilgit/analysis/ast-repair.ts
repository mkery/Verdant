const crypto = require("crypto");
import { NodeyCodeCell } from "../nodey/";

import { log } from "../notebook";

import { History } from "../history/";

import { ASTUtils } from "./ast-utils";

export class ASTRepair {
  public readonly history: History;

  constructor(history: History) {
    this.history = history;
  }

  /*
   * TODO update to get working again
   */
  public async repair(nodey: NodeyCodeCell, text: string) {
    let textOrig = this.history.inspector.renderNode(nodey);
    log(
      "The exact affected nodey is",
      nodey,
      "|" + text + "|",
      "|" + textOrig + "|"
    );
    if (text !== textOrig) {
      // some text has changed for sure
      this.history.stage.markAsEdited(nodey);
      var updateID = crypto.randomBytes(20).toString("hex");
      nodey.pendingUpdate = updateID;

      let newNodey = await ASTUtils.parseRequest(text);
      log("RECIEVED ", newNodey);
      //TODODODODODODODDODODOD
      if (updateID === nodey.pendingUpdate) nodey.updateState(newNodey);
    }
  }
}
