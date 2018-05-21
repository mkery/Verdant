
import {
  Session, KernelMessage
} from '@jupyterlab/services';

import {
  PromiseDelegate
} from '@phosphor/coreutils';

import{
  Nodey
} from './nodey'

import{
  KernelListen
} from './kernel-listen'

export
class ASTUtils {

  //Properties
  kernUtil: KernelListen
  session: Session.ISession
  parserText: string

  constructor(){
    this.parserText =`
import sys
import ast
from ast import AST
import tokenize
import token
from numbers import Number
import json
import io


def tokenASTCombine(tok, astNode):
    tok.pop(0)
    nodeyList, looseTokenList, tk = zipTokAST(tok, astNode, []) #skip start marker token
    while(len(tk) > 1): #skip the end maker
        if(tk[0].type != token.NEWLINE):
            nodeyList.append(formatToken(tk[0]))
        tk.pop(0)
    return json.dumps(nodeyList)


def formatToken(tk):
    return {'type': token.tok_name[tk.type], 'start': {'line': tk.start[0], 'col': tk.start[1]}, 'end': {'line': tk.end[0], 'col': tk.end[1]}, 'literal': tk.string}


def zipTokAST(tk, node, nodeyList):
    if(len(tk) < 1 or tk[0].type == token.ENDMARKER):
        return nodeyList, [], [] #end of tokens
    elif(node == None):
        return nodeyList, [], [] #end of nodes

    childrenZip = []
    for child in ast.iter_child_nodes(node): #depth fist
        cz, tz, tk = zipTokAST(tk, child, [])
        if(len(tz) > 0):
            childrenZip += tz
        if(len(cz) > 0):
            childrenZip += cz

    marker = {'type': type(node).__name__, 'content': childrenZip}
    looseTokenList = []

    if(hasattr(node, 'lineno')): #meaning it's a node that appears in the text
        line = node.lineno
        col = node.col_offset
        #print("node is", type(node).__name__, line, col, tk[0])
        # check for nodes that don't belong to anyone
        while(len(tk) > 0 and (tk[0].start[0] < line or (tk[0].start[0] == line and tk[0].start[1] < col))): #actually starts before this node
            if(tk[0].type != token.NEWLINE):
                looseTokenList.append(formatToken(tk[0]))
            tk.pop(0)
        if(len(tk) > 0 and tk[0].start[0] == line and tk[0].start[1] == col):
            if(tk[0].type != token.NEWLINE):
                formatted = formatToken(tk[0])
                marker['start'] = formatted['start']
                marker['end'] = formatted['end']
                marker['literal'] = formatted['literal']
            tk.pop(0)

    if('literal' in marker or len(childrenZip) > 0):
        nodeyList.append(marker)
    return nodeyList, looseTokenList, tk




def parseCode(code):
    tree = ast.parse(code)
    code = code.encode("unicode_escape").decode("utf-8")
    bytes = io.BytesIO(code.encode('utf-8'))
    g = tokenize.tokenize(bytes.readline)
    tk = list(g)
    print(tokenASTCombine(tk, tree))
`
  }

  get ready(): Promise<void> {
    return this._ready.promise
  }

  setKernUtil(kern : KernelListen)
  {
    this.kernUtil = kern
    this._ready = new PromiseDelegate<void>()
    this.init()
  }

  private async init()
  {
    await this.kernUtil.kernelReady
    await this.loadParserFunctions()
    console.log("loaded Parser!")
    this._ready.resolve(undefined);
  }

  private _ready = new PromiseDelegate<void>();


  loadParserFunctions()
  {
    console.log("kernel ready to go", this.kernUtil.kernel)
    let content: KernelMessage.IExecuteRequest = {
      code: this.parserText,
      stop_on_error: true
    };
    var onReply = (msg: KernelMessage.IExecuteReplyMsg): void => {
      console.log("R: ", msg.content)
    }
    var onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
      console.log("IO: ", msg.content)
    }
    return this.runKernel(content, onReply, onIOPub)
  }


  async generateCodeNodey(code: string, output: { [key : string] : any}) : Promise<Nodey>
  {
    // escape strings that will cause a syntax error
    console.log("trying to encode" , encodeURI(code))
    //console.log(code)
    var jsn :string;
    let content: KernelMessage.IExecuteRequest = {
      code: 'parseCode("""'+code+'""")',
      stop_on_error: true
    };
    var onReply = (msg: KernelMessage.IExecuteReplyMsg): void => {
      //console.log("R: ", msg)
    }
    var onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
      //console.log("IO: ", msg)
      let msgType = msg.header.msg_type;
      switch (msgType) {
         case 'execute_result':
         case 'display_data':
         case 'error':
           jsn = (<any>msg.content.data)['text/plain']
           break;
         case 'stream':
           jsn = (<any>msg.content)['text']
           break;
         case 'clear_output':
         case 'update_display_data':
         default:
           break;
         }
    }

    await this.runKernel(content, onReply, onIOPub)
    console.log("execution finished!")
    if(jsn == 'null')
      return
    // preserve newlines, etc - use valid JSON
    jsn = jsn.replace(/\\n/g, "\\n")
                   .replace(/\\'/g, "\\'")
                   .replace(/\\"/g, '\\"')
                   .replace(/\\&/g, "\\&")
                   .replace(/\\r/g, "\\r")
                   .replace(/\\t/g, "\\t")
                   .replace(/\\b/g, "\\b")
                   .replace(/\\f/g, "\\f");
    // remove non-printable and other non-valid JSON chars
    jsn = jsn.replace(/[\u0000-\u0019]+/g,"");
    if(jsn === "[]")
      return
    console.log("attempting parse", jsn)
    var dict = JSON.parse(jsn)
    var nodey = Nodey.fromJSON(dict[0], output)
    return nodey
  }


  runKernel(content: KernelMessage.IExecuteRequest, onReply: (msg: KernelMessage.IExecuteReplyMsg) => void , onIOPub: (msg: KernelMessage.IIOPubMessage) => void)
  {
    let future = this.kernUtil.kernel.requestExecute(content, false);
    future.onReply = onReply
    future.onIOPub = onIOPub
    return future.done
  }


  stopVerdantKernel()
  {

  }


}
