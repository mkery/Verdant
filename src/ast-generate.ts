import * as CodeMirror
  from 'codemirror';

import{
  CodeMirrorEditor
} from '@jupyterlab/codemirror';

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

import {
  ASTResolve
} from './ast-resolve'

import {
  Model
} from './model'


export
class ASTGenerate{

  //Properties
  kernUtil: KernelListen
  session: Session.ISession
  astResolve: ASTResolve
  parserText: string
  historyModel: Model

  constructor(historyModel : Model){
    this.historyModel = historyModel
    this.astResolve = new ASTResolve()
    this.parserText =`
import sys
import ast
from ast import AST
import tokenize
import token
from numbers import Number
import json
import io

def startsWith(start, tk):
    if(start):
        return start['line'] < tk.start[0] or (start['line'] == tk.start[0] and start['ch'] <= tk.start[1])
    return False

def getStart(node):
    if(hasattr(node, 'lineno')):
        return {'line' : node.lineno, 'ch': node.col_offset }
    else: # try to get to the first subnode that has a lineno
        child = next(ast.iter_child_nodes(node), None)
        loc = getStart(child) if child else None
        return loc



def formatToken(tk):
    return {'type': token.tok_name[tk.type], 'start': {'line': tk.start[0], 'ch': tk.start[1]}, 'end': {'line': tk.end[0], 'ch': tk.end[1]}, 'literal': tk.string}

def formatTokenList(tk_list):
    formatted = []
    for tk in tk_list:
        formatted.append(formatToken(tk))
    return formatted

def getNewBounty(bounty, tk):
    target = bounty[-1] if len(bounty) > 0 else None

    if(target):
        if(tk.string == '['): bounty.append('[')

        elif(tk.string == '('): bounty.append('(')

        elif(tk.string == '{'): bounty.append('{')

        match = fulfillBounty(bounty, tk)
        if(match) : bounty.pop()
        else: raise ValueError('Unmatched target '+str(target)+": "+str(bounty))

    return bounty


def fulfillBounty(bounty, tk):
    target = bounty[-1] if len(bounty) > 0 else None
    if(tk.string == ']'):
        return True
    if(tk.string == ')'):
        return True
    if(tk.string == '}'):
        return True
    return False


def processTokenList(tk_list):
    bounty = []
    formatted = []
    for tk in tk_list:
        bounty = getNewBounty(bounty, tk)
        formatted.append(formatToken(tk))
    return bounty, formatted


def splitBeforeTokens(content, nodey, before_tokens):
    prevNodey = content[-1] if content != [] else None
    middle = []
    nodeyMatch = []
    for tk in before_tokens:
        if(nodey and tk['start']['line'] == nodey['start']['line']):
            nodeyMatch.append(tk)
        elif(prevNodey and tk['start']['line'] == prevNodey['start']['line']):
            content += tk
        else:
            middle += tk
    if nodeyMatch != []:
        nodey['content'] = nodeyMatch + (nodey['content'] or [])
    return content, middle, nodey


def splitAfterTokens(prevStart, nodeStart, after_tokens):
    middle = []
    nodeyMatch = []
    for tok in after_tokens:
        if nodeStart and tok.start[0] == nodeStart['line'] and ((not prevStart) or tok.start[0] != prevStart['line']):
            nodeyMatch.append(tok)
        else:
            middle.append(tok)
    return middle, nodeyMatch




def processTokens_before(node, tokenList):
    chunkList = []
    before = []
    child = next(ast.iter_child_nodes(node), None)
    if child:
        start = getStart(child)
        if(start):
            for chunk in tokenList:
                if(startsWith(start, chunk)): #start of child
                    chunkList.append(chunk)
                else:
                    before.append(chunk)
            newBounty, before_formatted = processTokenList(before)
            return newBounty, before_formatted, chunkList

    return [], [], tokenList



def processTokens_middle(node, tokenList, bounty):
    children = ast.iter_child_nodes(node)
    child1 = next(children, None)
    content = []

    if child1:
        chunkList = []
        child2 = next(children, None)
        child2_start = None
        while(child2 and not child2_start):
            child2_start = getStart(child2)
            if(not child2_start):
                child2 = next(children, None)
        if(child2):
            child1_start = getStart(child1)
            for chunk in tokenList:
                if(child2 and startsWith(child2_start, chunk)): #start of child 2
                    #first, give all the tokens collected so far to child1. child2 starts with what remains
                    before_tokens, child_nodey, after_tokens = zipTokensAST(chunkList, child1, bounty)
                    content, before_tokens, child_nodey = splitBeforeTokens(content, child_nodey, before_tokens)
                    content += before_tokens
                    if child_nodey: content.append(child_nodey)
                    chunkList = []
                    if(after_tokens != []):
                        after_tokens, chunkList = splitAfterTokens(child1_start, child2_start, after_tokens)
                        content += formatTokenList(after_tokens)
                    child1_start = child2_start
                    child1 = child2
                    child2 = next(children, None)
                    child2_start = getStart(child2) if child2 else None

                chunkList.append(chunk)
        else:
            chunkList = tokenList

        before_tokens, child_nodey, after_tokens = zipTokensAST(chunkList, child1, bounty)
        content, before_tokens, child_nodey = splitBeforeTokens(content, child_nodey, before_tokens)
        content += before_tokens
        if child_nodey: content.append(child_nodey)
        chunkList = after_tokens
        return bounty, content, chunkList
    else:
        # no children, but eat what can
        start = getStart(node)
        content = []
        if(start):
            if(tokenList[0].start[0] == start['line'] and tokenList[0].start[1] == start['ch']):
                content.append(formatToken(tokenList.pop(0)))
                end = content[-1]
        return bounty, content, tokenList


def zipTokensAST(tokens, node, parentBounty = []):

    bounty = []

    bounty, before_tokens, tokens = processTokens_before(node, tokens)

    bounty, content, remainder = processTokens_middle(node, tokens, bounty)
    if(content != []):
        if(remainder != []):
            remainder, chunkList = splitAfterTokens(None, content[-1]['start'], remainder)
            content += formatTokenList(chunkList)
        nodey = {'type': type(node).__name__, 'start': content[0]['start'], 'end': content[-1]['end'], 'content': content}
    else:
        nodey = None
    return before_tokens, nodey, remainder


def main(text):
    tree = ast.parse(text)
    split = text.split('\\n')
    bytes = io.BytesIO(text.encode())
    g = tokenize.tokenize(bytes.readline)
    tokens = list(g)
    tokens.pop(0) #get rid of encoding stuff
    before_tokens, nodey, remainder = zipTokensAST(tokens, tree)
    nodey['content'] = before_tokens + nodey['content'] + formatTokenList(remainder)
    nodey['content'].pop() #remove end marker
    print (json.dumps(nodey))
`
  }


  get ready(): Promise<void> {
    return this._ready.promise
  }
  private _ready = new PromiseDelegate<void>();

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
    this.runKernel('main("""'+code+'""")', onReply, onIOPub)
  }


  recieve_generateAST(jsn: string, options: { [key : string] : any}) : NodeyCode
  {
    if(jsn == 'null')
      return NodeyCode.EMPTY()
    if(jsn === "[]\n")
      return NodeyCode.EMPTY()

    //console.log("trying to parse", jsn)
    var dict = JSON.parse(jsn)
    console.log(dict)
    var nodey = Nodey.dictToCodeNodeys(Object.assign({}, dict, options), this.historyModel)
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


  async repairAST(nodey : NodeyCode, change : CodeMirror.EditorChange, editor : CodeMirrorEditor)
  {
    return new Promise<NodeyCode>((accept, reject) => {
      var [recieve_reply, newCode] = this.astResolve.repairAST(nodey, change, editor)

      var onReply = (msg: KernelMessage.IExecuteReplyMsg): void => {
        console.log("R: ", msg)
      }
      var onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
        console.log("IO: ", msg)
        if(msg.header.msg_type === "stream")
        {
          var jsn = (<any>msg.content)['text']
          //console.log("py 2 ast execution finished!", jsn)
          accept(recieve_reply(jsn))
        }
      }
      this.parseCode(newCode, onReply, onIOPub)
    })
  }


}
