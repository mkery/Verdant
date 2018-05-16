
import {
  Session, Kernel, KernelMessage
} from '@jupyterlab/services';

import {
  PromiseDelegate
} from '@phosphor/coreutils';

import{
  Nodey
} from './nodey'


export
class ASTUtils {

  //Properties
  kernel: Kernel.IKernelConnection
  session: Session.ISession
  parserText: string

  constructor(){
    this.parserText =
`import sys
import ast
from ast import AST
import tokenize
from numbers import Number
import json
def makeNodey(node):
  jsn = {'type': type(node).__name__, 'node_uid': 0, 'content': []}
  if(hasattr(node, 'lineno')): #meaning it's a node that appears in the text
        jsn['line'] = node.lineno
        jsn['col'] = node.col_offset
  for field, value in ast.iter_fields(node):
        if(isinstance(value, str) or isinstance(value, Number)):
            jsn['literal'] = value
  for child in ast.iter_child_nodes(node):
        c = makeNodey(child)
        if(c and jsn):
            jsn['content'].append(c)
  if(len(jsn['content']) > 0 or 'literal' in jsn):
        return jsn`

    this.init()
  }

  get ready(): Promise<void> {
    return this._ready.promise
  }

  private async init()
  {
    await this.startVerdantKernel()
    await this.loadParserFunctions()
    this._ready.resolve(undefined);
  }

  private _ready = new PromiseDelegate<void>();


  startVerdantKernel()
  {
    return new Promise((accept, reject) => {
        Kernel.startNew().then(kernel => {
          this.kernel = kernel
          accept(kernel)
        })
    })
  }


  loadParserFunctions()
  {
    console.log("kernel ready to go", this.kernel)
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
    var jsn :string;
    let content: KernelMessage.IExecuteRequest = {
      code: 'json.dumps(makeNodey(ast.parse("""'+code+'""")))',
      stop_on_error: true
    };
    var onReply = (msg: KernelMessage.IExecuteReplyMsg): void => {
      //console.log("R: ", msg.content)
    }
    var onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
      let msgType = msg.header.msg_type;
      switch (msgType) {
         case 'execute_result':
         case 'display_data':
         case 'stream':
         case 'error':
           jsn = (<any>msg.content.data)['text/plain']
           break;
         case 'clear_output':
         case 'update_display_data':
         default:
           break;
         }
    }

    await this.runKernel(content, onReply, onIOPub)
    jsn = jsn.substr(1, jsn.length - 2)
    if(jsn == 'null')
      return
    //console.log("attempting parse", jsn)
    var dict = JSON.parse(jsn)
    var nodey = Nodey.fromJSON(dict, output)
    return nodey
  }


  runKernel(content: KernelMessage.IExecuteRequest, onReply: (msg: KernelMessage.IExecuteReplyMsg) => void , onIOPub: (msg: KernelMessage.IIOPubMessage) => void)
  {
    let future = this.kernel.requestExecute(content, false);
    future.onReply = onReply
    future.onIOPub = onIOPub
    return future.done
  }


  stopVerdantKernel()
  {

  }

}
