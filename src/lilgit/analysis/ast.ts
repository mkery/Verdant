import { Notebook } from "@jupyterlab/notebook";
import { Star } from "../model/history-stage";
import { CodeCell, MarkdownCell, Cell } from "@jupyterlab/cells";
import { Checkpoint, ChangeType, CellRunData } from "../model/checkpoint";

import {
  NodeyCell,
  NodeyCode,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyNotebook,
  NodeyOutput
} from "../model/nodey";
import { ASTResolve } from "./ast-resolve";
import { ASTUtils } from "./ast-utils";
import { History } from "../model/history";
import { ServerConnection } from "@jupyterlab/services";
import { URLExt } from "@jupyterlab/coreutils";

export class AST {
  readonly history: History;

  //Properties
  private readonly astResolve: ASTResolve;

  // Settings for the notebook server.
  private readonly serverSettings: ServerConnection.ISettings;

  constructor(history: History) {
    this.history = history;
    this.astResolve = new ASTResolve(history);
    this.serverSettings = ServerConnection.makeSettings();
  }

  public async coldStartNotebook(
    notebook: Notebook,
    checkpoint: Checkpoint
  ): Promise<[NodeyNotebook, CellRunData[]]> {
    let changedCells: CellRunData[] = [];
    let model = new NodeyNotebook();
    model.created = checkpoint.id;
    this.history.store.store(model);
    let cellsReady: Promise<void>[] = [];
    notebook.widgets.forEach((item, index) => {
      if (item instanceof Cell) {
        cellsReady.push(
          this.freshNodey(item, index, changedCells, checkpoint, model)
        );
      }
    });
    await Promise.all(cellsReady);

    return [model, changedCells];
  }

  public async hotStartNotebook(
    notebook: Notebook,
    checkpoint: Checkpoint
  ): Promise<[NodeyNotebook | Star<NodeyNotebook>, CellRunData[]]> {
    let changedCells: CellRunData[] = [];
    let prior = this.history.store.currentNotebook;
    let newNotebook = this.history.stage.markAsEdited(prior) as Star<
      NodeyNotebook
    >;
    let cellsReady: Promise<void>[] = [];
    notebook.widgets.forEach((item, index) => {
      if (item instanceof Cell) {
        let name = newNotebook.value.cells[index];

        if (name) {
          // this cell has been seen before //TODO false assumption
          let oldCell = this.history.store.get(name);
          let text: string;
          if (item instanceof CodeCell) text = item.editor.model.value.text;
          else text = item.model.value.text;
          cellsReady.push(
            this.repairCell(oldCell, text).then(newCell => {
              if (newCell instanceof Star) {
                newNotebook.value.cells[index] = newCell.name;
                newCell.parent = newNotebook.name;
              }
            })
          );
        } else {
          cellsReady.push(
            this.freshNodey(item, index, changedCells, checkpoint, newNotebook)
          );
        }
      }
    });
    await Promise.all(cellsReady);
    return [newNotebook, changedCells];
  }

  private async freshNodey(
    cell: Cell,
    index: number,
    changedCells: CellRunData[],
    checkpoint: Checkpoint,
    notebook: NodeyNotebook | Star<NodeyNotebook>
  ) {
    return this.createCellNodey(cell, checkpoint).then(nodey => {
      if (notebook instanceof Star) notebook.value.cells[index] = nodey.name;
      else notebook.cells[index] = nodey.name;
      nodey.parent = notebook.name;
      changedCells.push({
        node: nodey.name,
        changeType: ChangeType.ADDED
      });
    });
  }

  public async repairCell(nodey: NodeyCell | Star<NodeyCell>, text: string) {
    if (nodey instanceof Star) {
      if (nodey.value instanceof NodeyCode)
        return this.repairCodeCell(nodey as Star<NodeyCodeCell>, text);
      else if (nodey.value instanceof NodeyMarkdown)
        return this.astResolve.repairMarkdown(
          nodey as Star<NodeyMarkdown>,
          text
        );
    }
    if (nodey instanceof NodeyCode) return this.repairCodeCell(nodey, text);
    else if (nodey instanceof NodeyMarkdown)
      return this.astResolve.repairMarkdown(nodey as NodeyMarkdown, text);
  }

  public async createCellNodey(cell: Cell, checkpoint: Checkpoint) {
    let nodey: NodeyCell;
    if (cell instanceof CodeCell) {
      // First, create code cell from text
      let text: string = cell.editor.model.value.text;
      if (text.length > 0)
        nodey = await this.generateCodeNodey(text, checkpoint.id);
      else {
        nodey = new NodeyCodeCell({
          start: { line: 1, ch: 0 },
          end: { line: 1, ch: 0 },
          type: "Module",
          created: checkpoint.id
        });
        this.history.store.store(nodey);
      }
      // Next, create output
      let output_raw = cell.outputArea.model.toJSON();
      let output = new NodeyOutput({
        raw: output_raw,
        created: checkpoint.id,
        parent: nodey.name
      });
      this.history.store.store(output);
      (nodey as NodeyCodeCell).output = output.name;
    } else if (cell instanceof MarkdownCell) {
      // create markdown cell from text
      let text = cell.model.value.text;
      nodey = new NodeyMarkdown({ markdown: text });
      nodey.created = checkpoint.id;
      this.history.store.store(nodey);
    }
    return nodey;
  }

  private async parseRequest(text: string = ""): Promise<string> {
    text = this.cleanCodeString(text);
    let fullRequest = {
      method: "POST",
      body: JSON.stringify({ code: text })
    };

    let fullUrl = URLExt.join(this.serverSettings.baseUrl, "/lilgit/parse");

    return new Promise<string>(accept => {
      ServerConnection.makeRequest(
        fullUrl,
        fullRequest,
        this.serverSettings
      ).then(response => {
        if (response.status !== 200) {
          response.text().then(data => {
            console.error("A parser error occured on:\n " + text + "\n" + data);
            accept(JSON.stringify(this.failSafeParse(text)));
          });
        } else response.text().then(data => accept(data));
      });
    });
  }

  private failSafeParse(code: string) {
    let failsafe = {
      type: "Module",
      start: { line: 0, ch: 0 },
      end: { line: 0, ch: 0 },
      literal: code
    };
    let lines = code.split("\n");
    let lastCh = lines[lines.length - 1].length;
    failsafe["end"] = { line: lines.length - 1, ch: lastCh - 1 };
    return failsafe;
  }

  private cleanCodeString(code: string): string {
    // annoying but important: make sure docstrings do not interrupt the string literal
    var newCode = code.replace(/""".*"""/g, str => {
      return "'" + str + "'";
    });

    // turn ipython magics commands into comments
    //newCode = newCode.replace(/%/g, "#"); TODO can't do bc styled strings!

    // remove any triple quotes, which will mess us up
    newCode = newCode.replace(/"""/g, "'''");

    // make sure newline inside strings doesn't cause an EOL error
    // and make sure any special characters are escaped correctly
    newCode = newCode.replace(/(").*?(\\.).*?(?=")/g, str => {
      return str.replace(/\\/g, "\\\\");
    });
    newCode = newCode.replace(/(').*?(\\.).*?(?=')/g, str => {
      return str.replace(/\\/g, "\\\\");
    });
    //console.log("cleaned code is ", newCode);
    return newCode;
  }

  private async generateCodeNodey(
    code: string,
    checkpoint: number
  ): Promise<NodeyCode> {
    let jsn = await this.parseRequest(code);
    var dict = {};
    if (jsn.length > 2) dict = JSON.parse(jsn);
    else console.log("Recieved empty?", dict);
    var nodey = ASTUtils.dictToCodeCellNodey(
      dict,
      checkpoint,
      this.history.store
    );
    return nodey;
  }

  private async repairCodeCell(
    nodey: NodeyCodeCell | Star<NodeyCodeCell>,
    text: string
  ) {
    return new Promise<NodeyCode>((accept, reject) => {
      var [proceed, recieve_reply, newCode] = this.astResolve.repairCellAST(
        nodey,
        text
      );
      // only go ahead and parse if necissary
      if (proceed)
        this.parseRequest(newCode).then(response => {
          console.log("RECIEVED ", response);
          if (!response) reject();
          accept(recieve_reply(response));
        });
      else accept(recieve_reply());
    });
  }
}
