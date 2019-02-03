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

type jsn = { [key: string]: any };

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

  public async repairNotebook(
    matchTo: NodeyNotebook | Star<NodeyNotebook>,
    notebook: Notebook,
    checkpoint: Checkpoint
  ): Promise<[NodeyNotebook | Star<NodeyNotebook>, CellRunData[]]> {
    let model: NodeyNotebook | Star<NodeyNotebook>;
    let changedCells: CellRunData[] = [];
    if (!matchTo) {
      model = new NodeyNotebook();
      this.history.store.store(model);
      let cellsReady: Promise<void>[] = [];
      notebook.widgets.forEach((item, index) => {
        if (item instanceof Cell) {
          cellsReady.push(
            this.createCellNodey(item, checkpoint).then(nodey => {
              (model as NodeyNotebook).cells[index] = nodey.name;
              nodey.parent = model.name;
              changedCells.push({
                node: nodey.name,
                changeType: ChangeType.ADDED
              });
            })
          );
        }
      });

      await Promise.all(cellsReady);
    } else {
      let priorNotebook = this.history.store.currentNotebook;
      let newNotebook = this.history.stage.markAsEdited(priorNotebook) as Star<
        NodeyNotebook
      >;
      let cellsReady: Promise<void>[] = [];
      notebook.widgets.forEach((item, index) => {
        if (item instanceof Cell) {
          let name = newNotebook.value.cells[index];
          if (name && Cell instanceof CodeCell) {
            let oldCell = this.history.store.get(name) as NodeyCodeCell;
            let text: string = item.editor.model.value.text;
            cellsReady.push(
              this.matchASTOnInit(oldCell, text).then(newCell => {
                newNotebook.value.cells[index] = newCell.name;
                newCell.parent = newNotebook.name;
              })
            );
          } else if (name && Cell instanceof MarkdownCell) {
            let oldCell = this.history.store.get(name) as NodeyMarkdown;
            let newCell = this.history.stage.markAsEdited(oldCell);
            let text = item.model.value.text;
            (newCell.value as NodeyMarkdown).markdown = text;
            newCell.value.parent = newNotebook.name;
          }
        }
        model = newNotebook;
      });
      await Promise.all(cellsReady);
    }
    return [model, changedCells];
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
        nodey = await this.generateCodeNodey(text, { created: checkpoint.id });
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

  private async matchASTOnInit(nodey: NodeyCodeCell, newCode: string) {
    console.log("trying to match code on startup");
    let recieve_reply = this.astResolve.matchASTOnInit(nodey);
    let response = await this.parseRequest(newCode);
    return recieve_reply(response);
  }

  private async generateCodeNodey(
    code: string,
    options: jsn = {}
  ): Promise<NodeyCode> {
    let jsn = await this.parseRequest(code);
    var dict = options;
    if (jsn.length > 2) dict = Object.assign({}, dict, JSON.parse(jsn));
    else console.log("Recieved empty?", dict);
    var nodey = ASTUtils.dictToCodeCellNodey(dict, this.history.store);
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
