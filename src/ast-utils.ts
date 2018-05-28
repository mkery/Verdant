import * as CodeMirror
  from 'codemirror';

import{
  CodeMirrorEditor
} from '@jupyterlab/codemirror';

import * as crypto from 'crypto';

import {
  Session, KernelMessage
} from '@jupyterlab/services';

import {
  PromiseDelegate
} from '@phosphor/coreutils';

import{
  Nodey, NodeyCode
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
    return {'type': token.tok_name[tk.type], 'start': {'line': tk.start[0], 'ch': tk.start[1]}, 'end': {'line': tk.end[0], 'ch': tk.end[1]}, 'literal': tk.string}


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

    list.sort(childrenZip, key = lambda x : x['start']['line']*10000+x['start']['ch'] )

    marker = {'type': type(node).__name__, 'content': childrenZip}
    looseTokenList = []
    if(len(childrenZip) > 0):
        marker['start'] = childrenZip[0]['start']
        marker['end'] = childrenZip[len(childrenZip) - 1]['end']

    if(hasattr(node, 'lineno')): #meaning it's a node that appears in the text
        line = node.lineno
        ch = node.col_offset
        #print("node is", type(node).__name__, line, ch, tk[0])
        # check for nodes that don't belong to anyone
        while(len(tk) > 0 and (tk[0].start[0] < line or (tk[0].start[0] == line and tk[0].start[1] < ch))): #actually starts before this node
            if(tk[0].type != token.NEWLINE):
                looseTokenList.append(formatToken(tk[0]))
            tk.pop(0)
        if(len(tk) > 0 and tk[0].start[0] == line and tk[0].start[1] == ch):
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
    #print("got code", str)
    tree = ast.parse(code)
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
    var onReply = (msg: KernelMessage.IExecuteReplyMsg): void => {
      console.log("R: ", msg.content)
    }
    var onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
      console.log("IO: ", msg.content)
    }
    return this.runKernel(this.parserText, onReply, onIOPub)
  }


  async generateCodeNodey(code: string, options: { [key : string] : any}) : Promise<NodeyCode>
  {
    return new Promise<NodeyCode>((accept, reject) => {
      var onReply = (msg: KernelMessage.IExecuteReplyMsg): void => {
        //console.log(code, "R: ", msg)
      }
      var onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
        //console.log(code, "IO: ", msg)
        let msgType = msg.header.msg_type;
        switch (msgType) {
           case 'execute_result':
           case 'display_data':
           case 'error':
             console.error(code, "IO: ", msg)
             reject()
             break;
           case 'stream':
             var jsn = (<any>msg.content)['text']
             //console.log("py 2 ast execution finished!", jsn)
             accept(this.recieve_generateAST(jsn, options))
             break;
           case 'clear_output':
           case 'update_display_data':
           default:
             break;
           }
      }

      this.parseCode(code, onReply, onIOPub)
    })
  }


  private parseCode(code: string, onReply: (msg: KernelMessage.IExecuteReplyMsg) => void , onIOPub: (msg: KernelMessage.IIOPubMessage) => void)
  {
    // annoying but important: make sure docstrings do not interrupt the string literal
    code = code.replace(/""".*"""/g, (str) => {return "'"+str+"'"})
    // make sure newline inside strings doesn't cause an EOL error
    code = code.replace(/".*\\n.*"/g, (str) => {
      return str.replace(/\\n/g, "\\\n")
    })
    this.runKernel('parseCode("""'+code+'""")', onReply, onIOPub)
  }


  recieve_generateAST(jsn: string, options: { [key : string] : any}) : NodeyCode
  {
    if(jsn == 'null')
      return NodeyCode.EMPTY()
    if(jsn === "[]\n")
      return NodeyCode.EMPTY()

    var dict = JSON.parse(jsn)
    var nodey = Nodey.dictToCodeNodeys(Object.assign({}, dict[0], options))
    return nodey
  }


  runKernel(code: string, onReply: (msg: KernelMessage.IExecuteReplyMsg) => void , onIOPub: (msg: KernelMessage.IIOPubMessage) => void)
  {
    var request : KernelMessage.IExecuteRequest = {
      silent: true,
      user_expressions: {},
      code: code
    }
    let future = this.kernUtil.kernel.requestExecute(request, false);
    future.onReply = onReply
    future.onIOPub = onIOPub
    return future.done
  }



  repairAST(nodey : NodeyCode, change : CodeMirror.EditorChange, editor : CodeMirrorEditor)
  {
    //console.log("Time to repair", nodey)
    var affected = this.findAffectedChild(nodey.content, 0, Math.max(0, nodey.content.length - 1), change)
    this.updateNodeyPositions(affected, change)
    var text = editor.doc.getRange(affected.start, affected.end)
    console.log("The exact affected nodey is", affected, text)
    this.resolveAST(affected, text)
  }


  updateNodeyPositions(affected : NodeyCode, change: CodeMirror.EditorChange)
  {
    var shift = this.calcShift(affected, change)
    console.log("Following nodes, shift by", shift)
    var ch = shift[shift.length - 1]
    if(shift.length === 1) //we're still on the same line as we were before
      ch += affected.end.ch
    affected.end = {'line': shift.length - 1 + affected.end.line, 'ch': ch}
  }

  calcShift(nodey : NodeyCode, change: CodeMirror.EditorChange) : number[]
  {
    //TODO figure out copy paste
    var added : number[] = []
    var removed : number[] = []

    if(change.text.length > 0) //code was added
      added = change.text.map((item) => item.length) // for each line, how many characters were added
    if(change.removed.length > 0) // code was removed
      removed = change.removed.map((item) => -1 * item.length) // for each line, how many characters were added

    if(added.length >= removed.length)
      return added.map((item, index) => item + (removed[index] || 0))
    else
      return removed.map((item, index) => item + (added[index] || 0))
  }


  findAffectedChild(list: NodeyCode[], min: number, max: number, change : CodeMirror.EditorChange) : NodeyCode
  {
    var mid = Math.round((max - min)/2) + min
    var direction = this.inRange(list[mid], change)

    if((min >= max || max <= min) && direction !== 0) //end condition no more to explore
      return null

    if(direction === 0) // it's in this node, check for children to be more specific
    {
      if(list[mid].content.length < 1)
        return list[mid]
      else
        return this.findAffectedChild(list[mid].content, 0, Math.max(0, list[mid].content.length - 1), change) || list[mid]
    }
    else if(direction === 2)
      return null // there is no match at this level
    else if(direction === -1) // check the left
      return this.findAffectedChild(list, min, mid - 1, change)
    else if(direction === 1) // check the right
      return this.findAffectedChild(list, mid + 1, max, change)
  }


  //return 0 for match, 1 for to the right, -1 for to the left, 2 for both
  inRange(nodey : NodeyCode, change : CodeMirror.EditorChange) : number
  {
    var val = 0
    if(change.from.line < nodey.start.line)
      val = -1
    else if(change.from.line === nodey.start.line && change.from.ch < nodey.start.ch)
      val = -1

    if(change.to.line > nodey.end.line)
    {
      if(val === -1)
        val = 2
      else
        val = 1
    }
    else if(change.to.line === nodey.end.line && change.to.ch > nodey.end.ch)
    {
      if(val === -1)
        val = 2
      else
        val = 1
    }
    return val
  }


  async resolveAST(nodey : NodeyCode, newCode : string) : Promise<NodeyCode>
  {
    return new Promise<NodeyCode>((accept, reject) => {
      var updateID = crypto.randomBytes(20).toString('hex');
      nodey.pendingUpdate = updateID
      var onReply = (msg: KernelMessage.IExecuteReplyMsg): void => {
        console.log("R: ", msg)
      }
      var onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
        console.log("IO: ", msg)
        if(msg.header.msg_type === "stream")
        {
          var jsn = (<any>msg.content)['text']
          //console.log("py 2 ast execution finished!", jsn)
          accept(this.recieve_resolveAST(jsn, nodey, updateID))
        }
      }
      this.parseCode(newCode, onReply, onIOPub)
    })
  }


  recieve_resolveAST(jsn: string, node: NodeyCode, updateID: string) : NodeyCode
  {
    if(node.pendingUpdate && node.pendingUpdate === updateID)
    {
      console.log("Time to resolve", jsn, "with", node)

    }
    return node
  }

}
