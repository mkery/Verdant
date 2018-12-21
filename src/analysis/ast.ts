import * as CodeMirror from "codemirror";
import { Notebook } from "@jupyterlab/notebook";
import { CodeMirrorEditor } from "@jupyterlab/codemirror";
import { Session, KernelMessage } from "@jupyterlab/services";
import { PromiseDelegate } from "@phosphor/coreutils";
import { Star } from "../model/history-stage";
import { CodeCell, MarkdownCell, Cell } from "@jupyterlab/cells";
import { Checkpoint, ChangeType, CellRunData } from "../model/checkpoint";
import { Parser } from "./Parser";
import {
  NodeyCell,
  NodeyCode,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyNotebook,
  NodeyOutput
} from "../model/nodey";
import { KernelListen } from "../jupyter-hooks/kernel-listen";
import { ASTResolve } from "./ast-resolve";
import { NodeyFactory } from "../model/nodey-factory";
import { History } from "../model/history";

export class AST {
  //Properties
  kernUtil: KernelListen;
  session: Session.ISession;
  astResolve: ASTResolve;
  parserText: string;
  history: History;

  constructor(history: History) {
    this.history = history;
    this.astResolve = new ASTResolve(history);
  }

  get ready(): Promise<void> {
    return this._ready.promise;
  }
  private _ready = new PromiseDelegate<void>();

  setKernUtil(kern: KernelListen) {
    this.kernUtil = kern;
    this._ready = new PromiseDelegate<void>();
    this.init();
  }

  private async init() {
    await this.kernUtil.kernelReady;
    await this.loadParserFunctions();
    console.log("loaded Parser!");
    this._ready.resolve(undefined);
  }

  loadParserFunctions() {
    console.log("kernel ready to go", this.kernUtil.kernel);
    var onReply = (msg: KernelMessage.IExecuteReplyMsg): void => {
      console.log("R: ", msg.content);
    };
    var onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
      console.log("IO: ", msg.content);
    };
    return this.runKernel(Parser.text, onReply, onIOPub);
  }

  async generateCodeNodey(
    code: string,
    options: { [key: string]: any } = {}
  ): Promise<NodeyCode> {
    return new Promise<NodeyCode>((accept, reject) => {
      var onReply = (_: KernelMessage.IExecuteReplyMsg): void => {
        //console.log(code, "R: ", msg)
      };
      var onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
        //console.log(code, "IO: ", msg)
        let msgType = msg.header.msg_type;
        switch (msgType) {
          case "execute_result":
          case "display_data":
          case "error":
            console.error(code, "IO: ", msg);
            reject();
            break;
          case "stream":
            var jsn = (<any>msg.content)["text"];
            //console.log("py 2 ast execution finished!", jsn)
            accept(this.recieve_generateAST(jsn, options));
            break;
          case "clear_output":
          case "update_display_data":
          default:
            break;
        }
      };

      this.parseCode(code, onReply, onIOPub);
    });
  }

  public markdownToCodeNodey(
    markdown: NodeyMarkdown,
    code: string
  ): Promise<NodeyCode> {
    return new Promise<NodeyCode>((accept, reject) => {
      var onReply = (_: KernelMessage.IExecuteReplyMsg): void => {
        //console.log(code, "R: ", msg)
      };
      var onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
        //console.log(code, "IO: ", msg)
        let msgType = msg.header.msg_type;
        switch (msgType) {
          case "execute_result":
          case "display_data":
          case "error":
            console.error(code, "IO: ", msg);
            reject();
            break;
          case "stream":
            var jsn = (<any>msg.content)["text"];
            //console.log("py 2 ast execution finished!", jsn)
            accept(
              this.recieve_generateAST_tieMarkdown(jsn, markdown.name, {})
            );
            break;
          case "clear_output":
          case "update_display_data":
          default:
            break;
        }
      };

      this.parseCode(code, onReply, onIOPub);
    });
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

  private parseCode(
    code: string,
    onReply: (msg: KernelMessage.IExecuteReplyMsg) => void,
    onIOPub: (msg: KernelMessage.IIOPubMessage) => void
  ) {
    code = this.cleanCodeString(code);
    this.runKernel('parse("""' + code + '""")', onReply, onIOPub);
  }

  recieve_generateAST(jsn: string, options: { [key: string]: any }): NodeyCode {
    //console.log("Recieved", jsn);
    var dict = options;
    if (jsn.length > 2) dict = Object.assign({}, dict, JSON.parse(jsn));
    else console.log("Recieved empty?", dict);
    var nodey = NodeyFactory.dictToCodeCellNodey(dict, this.history.store);
    console.log("Recieved code!", dict, nodey);
    return nodey;
  }

  recieve_generateAST_tieMarkdown(
    jsn: string,
    forceTie: string,
    options: { [key: string]: any }
  ): NodeyCode {
    //console.log("Recieved", jsn);
    var dict = options;
    if (jsn.length > 2) dict = Object.assign({}, dict, JSON.parse(jsn));
    else console.log("Recieved empty?", dict);
    var nodey = NodeyFactory.dictToCodeCellNodey(
      dict,
      this.history.store,
      forceTie
    );
    console.log("Recieved code!", dict, nodey);
    return nodey;
  }

  runKernel(
    code: string,
    onReply: (msg: KernelMessage.IExecuteReplyMsg) => void,
    onIOPub: (msg: KernelMessage.IIOPubMessage) => void
  ) {
    var request: KernelMessage.IExecuteRequest = {
      silent: true,
      user_expressions: {},
      code: code
    };
    let future = this.kernUtil.kernel.requestExecute(request, false);
    future.onReply = onReply;
    future.onIOPub = onIOPub;
    return future.done;
  }

  async repairMarkdown(
    nodey: NodeyMarkdown | Star<NodeyMarkdown>,
    newText: string
  ) {
    this.astResolve.repairMarkdown(nodey, newText);
  }

  async matchASTOnInit(nodey: NodeyCodeCell, newCode: string) {
    console.log("trying to match code on startup");
    return new Promise<NodeyCode>((accept, reject) => {
      var recieve_reply = this.astResolve.matchASTOnInit(nodey);

      var onReply = (msg: KernelMessage.IExecuteReplyMsg): void => {
        console.log("R: ", msg);
      };
      var onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
        console.log("IO: ", msg);
        if (msg.header.msg_type === "stream") {
          var jsn = (<any>msg.content)["text"];
          //console.log("py 2 ast execution finished!", jsn)
          accept(recieve_reply(jsn));
        } else if (msg.header.msg_type === "error") {
          console.error("Failed to parse", newCode);
          reject();
        }
      };
      this.parseCode(newCode, onReply, onIOPub);
    });
  }

  async repairNotebook(
    matchTo: NodeyNotebook | Star<NodeyNotebook>,
    notebook: Notebook,
    checkpoint: Checkpoint
  ): Promise<[NodeyNotebook, CellRunData[]]> {
    let model: NodeyNotebook;
    let changedCells: CellRunData[] = [];
    if (!matchTo) {
      model = new NodeyNotebook();
      this.history.store.store(model);
      let cellsReady: Promise<void>[] = [];
      notebook.widgets.forEach((item, index) => {
        if (item instanceof Cell) {
          cellsReady.push(
            this.createCellNodey(item, checkpoint).then(nodey => {
              model.cells[index] = nodey.name;
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
    }
    return [model, changedCells];
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

  async repairAST(
    nodey: NodeyCodeCell,
    change: CodeMirror.EditorChange,
    editor: CodeMirrorEditor
  ) {
    return new Promise<NodeyCode>((accept, reject) => {
      var [recieve_reply, newCode] = this.astResolve.repairAST(
        nodey,
        change,
        editor
      );

      var onReply = (msg: KernelMessage.IExecuteReplyMsg): void => {
        console.log("R: ", msg);
      };
      var onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
        console.log("IO: ", msg);
        if (msg.header.msg_type === "stream") {
          var jsn = (<any>msg.content)["text"];
          //console.log("py 2 ast execution finished!", jsn)
          accept(recieve_reply(jsn));
        } else if (msg.header.msg_type === "error") {
          console.error("Failed to parse", newCode);
          reject();
        }
      };
      this.parseCode(newCode, onReply, onIOPub);
    });
  }

  async repairFullAST(nodey: NodeyCell | Star<NodeyCell>, text: string) {
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

  private async repairCodeCell(
    nodey: NodeyCodeCell | Star<NodeyCodeCell>,
    text: string
  ) {
    return new Promise<NodeyCode>((accept, reject) => {
      var [recieve_reply, newCode] = this.astResolve.repairFullAST(nodey, text);

      var onReply = (msg: KernelMessage.IExecuteReplyMsg): void => {
        console.log("R: ", msg);
      };
      var onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
        console.log("IO: ", msg);
        if (msg.header.msg_type === "stream") {
          var jsn = (<any>msg.content)["text"];
          //console.log("py 2 ast execution finished!", jsn)
          accept(recieve_reply(jsn));
        } else if (msg.header.msg_type === "error") {
          console.error("Failed to parse", newCode);
          reject();
        }
      };
      this.parseCode(newCode, onReply, onIOPub);
    });
  }
}
