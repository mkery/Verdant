import * as CodeMirror from "codemirror";

import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import { Session, KernelMessage } from "@jupyterlab/services";

import { PromiseDelegate } from "@phosphor/coreutils";

import { Nodey, NodeyCode, NodeyCodeCell, NodeyMarkdown } from "../model/nodey";

import { KernelListen } from "../jupyter-hooks/kernel-listen";

import { ASTResolve } from "./ast-resolve";

import { History } from "../model/history";

export class ASTGenerate {
  //Properties
  kernUtil: KernelListen;
  session: Session.ISession;
  astResolve: ASTResolve;
  parserText: string;
  historyModel: History;

  constructor(historyModel: History) {
    this.historyModel = historyModel;
    this.astResolve = new ASTResolve(historyModel);
    this.parserText = `

# coding: utf-8

# In[70]:


# coding: utf-8
import sys
import re
import string
import ast
from ast import AST
import tokenize
import token
from numbers import Number
import json
import io


# In[71]:


def posFromText(text, textPos):
    snippet = text[:textPos+1]
    lines = snippet.split("\\n")
    ln = len(lines)
    ch = len(lines[-1])
    return {'line': ln, 'ch': ch}



# In[72]:


def findNodeStart(node):
    if hasattr(node, 'lineno'):
        return {'line': node.lineno, 'ch': node.col_offset}
    elif  type(node).__name__ == "Module":
        return {'line': 1, 'ch': 0}
    else: # must be some kind of wrapper node
        children = ast.iter_child_nodes(node)
        firstChild = next(children, None)
        if firstChild is None: return None
        return findNodeStart(firstChild)


# In[73]:


def findNextChild(children, itr):
    banned = ["Store", "Load"]
    if(itr + 1 < len(children)):
        child = children[itr + 1]
        if(type(child).__name__ not in banned):
            return child, itr + 1
        else:
            return findNextChild(children, itr + 1)
    else:
        return None, itr + 1


# In[74]:


def captureStuff(text, end, nodeItem, puncStop = "", puncNL = False):
    content = []
    end, item = visit(nodeItem, text, end, len(text), None)
    content.append(item)
    # get any symbols like commas and spaces
    end, symbols = getPunctuationBetween(text, end, puncStop, puncNL)
    content += symbols
    return end, content


# In[75]:


def stmtOrExpr(node):
    myType = type(node).__name__
    myContent = []
    myStart = {'line': node.lineno, 'ch': node.col_offset}
    me = {'type': myType, 'start': myStart, 'end': None, 'content': myContent}
    return me


# In[76]:


'''
mod = Module(stmt* body)
        | Interactive(stmt* body)
        | Expression(expr body)

        -- not really an actual node but useful in Jython's typesystem.
        | Suite(stmt* body)
'''
def visitModule(node, text, textStart, textEnd):
    myType = type(node).__name__
    myContent = []
    myStart = posFromText(text, textStart)
    end = textStart
    # get any symbols like new lines and spaces
    end, symbols = getCommentsAndSpace(text, end, textEnd)
    myContent += symbols
    if(debug): print("Start:", myContent)

    if(isinstance(node.body, list)):
        for stmt in node.body:
            end, stuff = captureStuff(text, end, stmt, "", True)
            myContent += stuff
            if(debug): print(myType+" AFTER ", stmt, myContent, text[end:end+3])
    else:
        end, expr = visit(node.body, text, end, textEnd, None)

    # get any symbols like commas and spaces
    end, symbols = getCommentsAndSpace(text, end, textEnd)
    myContent += symbols
    if(debug): print("END:", myContent)

    myEnd = posFromText(text, end)
    me = {'type': myType, 'start': myStart, 'end': myEnd, 'content': myContent}
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me


# In[77]:


'''
FunctionDef(identifier name, arguments args,
                       stmt* body, expr* decorator_list, expr? returns)
AsyncFunctionDef(identifier name, arguments args,
                       stmt* body, expr* decorator_list, expr? returns)
'''
def visitFunctionDef(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    #decorators
    for dec in node.decorator_list:
        end, decNode = visit(dec, text, end, textEnd, None)
        me['content'].append(decNode)
        end, spaces = getSpacing(text, end, textEnd, True)
        me['content'] += spaces
    #def and name
    me['content'].append({"syntok": "def"})
    end += len("def")
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    name = str(node.name)
    me['content'].append({"syntok": name})
    end += len(name)
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, symbols, opened = getParens(text, end, textEnd)
    me['content'] += symbols
    # arguments
    end, args = visit(node.args, text, end, textEnd, None)
    me['content'].append(args)
    end, symbols, opened = getParens(text, end, textEnd)
    me['content'] += symbols
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    # check for return annotation TODO FIX
    if(node.returns):
        end, ret = visitReturn(node.returns, text, end, textEnd)
        me['content'].append(ret)
    # end function header
    me['content'].append({"syntok": ":"})
    end += 1
    end, spaces = getSpacing(text, end, textEnd, True)
    me['content'] += spaces
    # finally, body of the function
    for stmt in node.body:
        end, stuff = captureStuff(text, end, stmt, "", True)
        me['content'] += stuff
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me


'''
Return(expr? value)
'''
def visitReturn(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    me['content'].append({"syntok": "return"})
    end += len("return")
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    if(node.value):
        end, args = captureStuff(text, end, node.value, "", False)
        me['content'] += args
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me


# In[78]:


'''
| Assign(expr* targets, expr value)
'''
def visitAssign(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    for target in node.targets:
        end, stuff = captureStuff(text, end, target, "=")
        me['content'] += stuff
    me['content'].append({"syntok": "="})
    end += 1
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, value = visit(node.value, text, end, textEnd, None)
    me['content'].append(value)
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me

'''
| AugAssign(expr target, operator op, expr value)
'''
def visitAugAssign(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    end, target = visit(node.target, text, end, textEnd, None)
    me['content'].append(target)
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, op = visit(node.op, text, end, textEnd, None)
    me['content'].append(op)
    me['content'].append({"syntok": "="})
    end += 1
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, value = visit(node.value, text, end, textEnd, None)
    me['content'].append(value)
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me


# In[79]:


'''
-- use 'orelse' because else is a keyword in target languages
'''

'''
| For(expr target, expr iter, stmt* body, stmt* orelse)
'''
def visitFor(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    me['content'].append({"syntok": "for"})
    end += len("for")
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, target = visit(node.target, text, end, textEnd, None)
    me['content'].append(target)
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    me['content'].append({"syntok": "in"})
    end += len("in")
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, itr = visit(node.iter, text, end, textEnd, None)
    me['content'].append(itr)
    # get spaces, : and any new line
    end, symbols = getPunctuationBetween(text, end, "", True)
    me['content'] += symbols
    for stmt in node.body:
        end, stuff = captureStuff(text, end, stmt, "", True)
        me['content'] += stuff
    for stmt in node.orelse:
        me['content'].append({"syntok": "else"})
        end += len("else")
        # get spaces, : and any new line
        end, symbols = getPunctuationBetween(text, end, "", True)
        me['content'] += symbols
        end, stuff = captureStuff(text, end, stmt, "", True)
        me['content'] += stuff
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me

'''
| While(expr test, stmt* body, stmt* orelse)
'''
def visitWhile(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    me['content'].append({"syntok": "while"})
    end += len("while")
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, symbols, opened = getParens(text, end, textEnd)
    me['content'] += symbols
    end, test = visit(node.test, text, end, textEnd, None)
    me['content'].append(test)
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, symbols, opened = getParens(text, end, textEnd)
    me['content'] += symbols
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    me['content'].append({"syntok": ":"})
    end += 1
    end, spaces = getSpacing(text, end, textEnd, True)
    me['content'] += spaces
    for stmt in node.body:
        end, stuff = captureStuff(text, end, stmt, "", True)
        me['content'] += stuff
    for stmt in node.orelse:
        me['content'].append({"syntok": "else"})
        end += len("else")
        end, spaces = getSpacing(text, end, textEnd, True)
        me['content'] += spaces
        me['content'].append({"syntok": ":"})
        end += 1
        end, spaces = getSpacing(text, end, textEnd, True)
        me['content'] += spaces
        end, clause = visit(stmt, text, end, textEnd, None)
        me['content'].append(clause)
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me


'''
| If(expr test, stmt* body, stmt* orelse)
'''
def visitIf(node, text, textStart, textEnd, nested = False):
    me = stmtOrExpr(node)
    end = textStart
    if nested:
        me['content'].append({"syntok": "elif"})
        end += len("elif")
    else:
        me['content'].append({"syntok": "if"})
        end += len("if")
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, symbols, opened = getParens(text, end, textEnd)
    me['content'] += symbols
    end, test = visit(node.test, text, end, textEnd, None)
    me['content'].append(test)
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, symbols, opened = getParens(text, end, textEnd)
    me['content'] += symbols
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    me['content'].append({"syntok": ":"})
    end += 1
    end, spaces = getSpacing(text, end, textEnd, True)
    me['content'] += spaces
    for stmt in node.body:
        end, stuff = captureStuff(text, end, stmt, "", True)
        me['content'] += stuff
    for stmt in node.orelse:
        sType = type(stmt).__name__
        if sType == "If":
            end, clause = visitIf(stmt, text, end, textEnd, True)
            me['content'].append(clause)
        else:
            me['content'].append({"syntok": "else"})
            end += len("else")
            end, spaces = getSpacing(text, end, textEnd, True)
            me['content'] += spaces
            me['content'].append({"syntok": ":"})
            end += 1
            end, spaces = getSpacing(text, end, textEnd, True)
            me['content'] += spaces
            end, clause = visit(stmt, text, end, textEnd, None)
            me['content'].append(clause)
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me


'''
| Try(stmt* body, excepthandler* handlers, stmt* orelse, stmt* finalbody)
'''
def visitTry(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    me['content'].append({"syntok": "try"})
    end += len("try")

    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, symbols = getPunctuationBetween(text,end, "", True)
    me["content"] += symbols
    for stmt in node.body:
        end, stuff = captureStuff(text, end, stmt, "", True)
        me['content'] += stuff
    for excepthandle in node.handlers:
        end, stuff = captureStuff(text, end, excepthandle, "", True)
        me['content'] += stuff
    for stmt in node.orelse:
        me['content'].append({"syntok": "else:"})
        end += len("else:")
        end, stuff = captureStuff(text, end, stmt, "", True)
        me['content'] += stuff
    for stmt in node.finalbody:
        me['content'].append({"syntok": "finally:"})
        end += len("finally:")
        end, stuff = captureStuff(text, end, stmt, "", True)
        me['content'] += stuff
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me



# In[80]:


'''
Import(alias* names)
'''
def visitImport(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    me['content'].append({"syntok": "import"})
    end += len("import")
    end, symbols = getPunctuationBetween(text,end)
    me["content"] += symbols
    for alias in node.names:
        end, stuff = captureStuff(text, end, alias)
        me['content'] += stuff
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me

'''
ImportFrom(identifier? module, alias* names, int? level)
'''
def visitImportFrom(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    if(node.module):
        me['content'].append({"syntok": "from"})
        end += len("from")
        end, spaces = getSpacing(text, end, textEnd)
        me['content'] += spaces
        module = str(node.module)
        me['content'].append({"syntok": module})
        end += len(module)
        end, spaces = getSpacing(text, end, textEnd)
        me['content'] += spaces
    me['content'].append({"syntok": "import"})
    end += len("import")
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    for alias in node.names:
        end, stuff = captureStuff(text, end, alias)
        me['content'] += stuff
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me


'''
-- import name with optional 'as' alias.
    alias = (identifier name, identifier? asname)
'''
def visitAlias(node, text, textStart, textEnd):
    myType = type(node).__name__
    myContent = []
    end = textStart
    myStart = posFromText(text, end)
    name = str(node.name)
    myContent.append({"syntok": name})
    end += len(name)
    if(node.asname):
        end, symbols = getPunctuationBetween(text,end)
        myContent += symbols
        myContent.append({"syntok": "as"})
        end += len("as")
        end, symbols = getPunctuationBetween(text,end)
        myContent += symbols
        asname = str(node.asname)
        myContent.append({"syntok": asname})
        end += len(asname)
    myEnd = posFromText(text, end)
    me = {'type': myType, 'start': myStart, 'end': myEnd, 'content': myContent}
    if(debug): print("MADE:", end, ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me


# In[81]:


'''
Expr(expr value)
'''
def visitExpr(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    end, value = visit(node.value, text, end, textEnd, None)
    me['content'].append(value)
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me


# In[82]:


'''
| BoolOp(boolop op, expr* values)
Consecutive operations with the same operator,
such as a or b or c, are collapsed into one node with several values.
BoolOp() can use left & right?
'''
def visitBoolOp(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    ops = 0
    for idx, val in enumerate(node.values):
        end, v = visit(val, text, end, textEnd, None)
        me['content'].append(v)
        if(idx < len(node.values) - 1):
            end, spaces = getSpacing(text, end, textEnd)
            me['content'] += spaces
            end, op = visit(node.op, text, end, textEnd, None)
            me['content'].append(op)
            ops += 1
            end, spaces = getSpacing(text, end, textEnd)
            me['content'] += spaces
        elif(ops < 1):
            end, spaces = getSpacing(text, end, textEnd)
            me['content'] += spaces
            end, op = visit(node.op, text, end, textEnd, None)
            me['content'].append(op)
            ops += 1
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me

'''
| BinOp(expr left, operator op, expr right)
'''
def visitBinOp(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    end, left = visit(node.left, text, end, textEnd, None)
    me['content'].append(left)
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, op = visit(node.op, text, end, textEnd, None)
    me['content'].append(op)
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, right = visit(node.right, text, end, textEnd, None)
    me['content'].append(right)
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me


'''
| UnaryOp(unaryop op, expr operand)
'''
def visitUnaryOp(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    end, op = visit(node.op, text, end, textEnd, None)
    me['content'].append(op)
    end, symbols = getPunctuationBetween(text, end+1)
    me['content'] += symbols
    end, operand = visit(node.operand, text, end, textEnd, None)
    me['content'].append(operand)
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me

'''
| ListComp(expr elt, comprehension* generators)
'''
def visitListComp(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    #TODO

'''
-- need sequences for compare to distinguish between
-- x < 4 < 3 and (x < 4) < 3
| Compare(expr left, cmpop* ops, expr* comparators)
'''
def visitCompare(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    opened = False
    # now use regex to get all ( and space tokens before the call args begin
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, parens, opened = getParens(text, end, textEnd)
    me['content'] += parens
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    # get left expr
    end, left = visit(node.left, text, end, textEnd, None)
    me['content'].append(left)
    if(node.ops):
        end, spaces = getSpacing(text, end, textEnd)
        me['content'] += spaces
        for cmpop in node.ops:
            end, parens, opened = getParens(text, end, textEnd)
            me['content'] += parens
            # get op
            end, op = visit(cmpop, text, end, textEnd, None)
            me['content'].append(op)
            # get only () and spaces
            end, spaces = getSpacing(text, end, textEnd)
            me['content'] += spaces
            if(opened):
                end, parens, opened = getParens(text, end, textEnd)
                me['content'] += parens
                end, spaces = getSpacing(text, end, textEnd)
                me['content'] += spaces

    if(node.comparators):
        end, spaces = getSpacing(text, end, textEnd)
        me['content'] += spaces
        for expr in node.comparators:
            end, parens, opened = getParens(text, end, textEnd)
            me['content'] += parens
            # get expr
            end, exp = visit(expr, text, end, textEnd, None)
            me['content'].append(exp)
            # get only () and spaces
            end, spaces = getSpacing(text, end, textEnd)
            me['content'] += spaces
            if(opened):
                end, parens, opened = getParens(text, end, textEnd)
                me['content'] += parens
                end, spaces = getSpacing(text, end, textEnd)
                me['content'] += spaces

    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me


'''
Call(expr func, expr* args, keyword* keywords)
'''
def visitCall(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    end, value = visit(node.func, text, end, textEnd, None)
    me['content'].append(value)

    # now use regex to get all punctuation then ( and space tokens before the call args begin
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, parens, opened = getParens(text,end, textEnd)
    me['content'] += parens
    end, spaces = getSpacing(text, end,textEnd)
    me['content'] += spaces

    for argument in node.args:
        end, stuff = captureStuff(text, end, argument, ")")
        me['content'] += stuff
    for keyword in node.keywords:
        end, stuff = captureStuff(text, end, keyword, ")")
        me['content'] += stuff
    end, parens, opened = getParens(text,end, textEnd)
    me['content'] += parens
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me

'''
| Num(object n) -- a number as a PyObject.
we need this one while we don't need one for Str because we need special regex for decimals
'''
def visitNum(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    value = str(node.n)
    me['literal'] = value
    end += len(value)
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me


# In[83]:


'''
-- the following expression can appear in assignment context
'''
'''
 | Attribute(expr value, identifier attr, expr_context ctx)
'''
def visitAttribute(node, text, textStart, textEnd):
    myType = type(node).__name__
    myContent = []
    end = textStart
    end, value = visit(node.value, text, textStart, textEnd, None)
    myContent.append(value)
    myContent.append({'syntok': '.'})
    attr = str(node.attr)
    myContent.append({'syntok': attr})
    myStart = value['start']
    myEnd = {'line': myStart['line'], 'ch': value['end']['ch'] + 1 + len(attr)}
    me = {'type': myType, 'start': myStart, 'end': myEnd, 'content': myContent}
    end += 1 + len(attr)
    if(debug): print("MADE:", end, ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me

'''
 | Subscript(expr value, slice slice, expr_context ctx)
'''
def visitSubscript(node, text, textStart, textEnd):
    myType = type(node).__name__
    myContent = []
    end = textStart
    myStart = posFromText(text, end)
    end, value = visit(node.value, text, textStart, textEnd, None)
    end, slicey = visit(node.slice, text, end, textEnd, None)
    myContent.append(value)
    myContent.append(slicey)
    myEnd = slicey['end']
    me = {'type': myType, 'start': myStart, 'end': myEnd, 'content': myContent}
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me

'''
 | Starred(expr value, expr_context ctx)
'''
def visitStarred(node, text, textStart, textEnd):
    myType = type(node).__name__
    myContent = []
    end = textStart
    myStart = posFromText(text, end)
    myContent.append({"syntok": "*"})
    end += 1
    end, value = visit(node.value, text, end, textEnd, None)
    myContent.append(value)
    myEnd = posFromText(text, end)
    me = {'type': myType, 'start': myStart, 'end': myEnd, 'content': myContent}
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me

'''
 | List(expr* elts, expr_context ctx)
'''
def visitList(node, text, textStart, textEnd):
    myType = type(node).__name__
    myContent = []
    end = textStart
    myStart = posFromText(text, end)
    myContent.append({"syntok": "["})
    end += 1
    end, spaces = getSpacing(text, end, textEnd)
    myContent += spaces
    for elem in node.elts:
        end, value = visit(elem, text, end, textEnd, None)
        myContent.append(value)
        #get spaces and commas only
        end, spaces = getSpacing(text, end, textEnd)
        myContent += spaces
        end, commas = getCommas(text, end, textEnd)
        myContent += commas
        end, spaces = getSpacing(text, end, textEnd)
        myContent += spaces

    myContent.append({"syntok": "]"})
    end += 1
    myEnd = posFromText(text, end)
    me = {'type': myType, 'start': myStart, 'end': myEnd, 'content': myContent}
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me

'''
 | Tuple(expr* elts, expr_context ctx)
'''
def visitTuple(node, text, textStart, textEnd):
    myType = type(node).__name__
    myContent = []
    end = textStart
    myStart = posFromText(text, end)
    if text[end] == "(":
        myContent.append({"syntok": "("})
        end += 1
    end, spaces = getSpacing(text, end, textEnd)
    myContent += spaces
    end, commas = getCommas(text, end, textEnd)
    myContent += commas
    for elem in node.elts:
        end, value = visit(elem, text, end, textEnd, None)
        myContent.append(value)
        #get spaces and commas only
        end, spaces = getSpacing(text, end, textEnd)
        myContent += spaces
        end, commas = getCommas(text, end, textEnd)
        myContent += commas
        end, spaces = getSpacing(text, end, textEnd)
        myContent += spaces

    if text[min(end, textEnd - 1)] == ")":
        myContent.append({"syntok": ")"})
        end += 1
    myEnd = posFromText(text, end)
    me = {'type': myType, 'start': myStart, 'end': myEnd, 'content': myContent}
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me


# In[84]:


'''
slice = Slice(expr? lower, expr? upper, expr? step)
          | ExtSlice(slice* dims)
          | Index(expr value)
'''
def visitIndex(node, text, textStart, textEnd):
    myType = type(node).__name__
    myContent = []
    myContent.append({'syntok': '['})
    end = textStart + 1
    end, spaces = getSpacing(text, end, textEnd)
    myContent += spaces
    end, value = visit(node.value, text, end, textEnd, None)
    myContent.append(value)
    end, spaces = getSpacing(text, end, textEnd)
    myContent += spaces
    myContent.append({'syntok': ']'})
    end += 1

    myStart = {'line': value['start']['line'], 'ch': value['start']['ch'] - 1}
    myEnd = {'line': myStart['line'], 'ch': myStart['ch'] + 1 }
    me = {'type': myType, 'start': myStart, 'end': myEnd, 'content': myContent}
    if(debug): print("MADE:", me,"\\n")
    return end, me


# In[85]:


'''
boolop = And | Or

operator = Add | Sub | Mult | MatMult | Div | Mod | Pow | LShift
             | RShift | BitOr | BitXor | BitAnd | FloorDiv

unaryop = Invert | Not | UAdd | USub

cmpop = Eq | NotEq | Lt | LtE | Gt | GtE | Is | IsNot | In | NotIn
'''
# really just need to visit the non single string tokens
def visitOp(node, text, textStart, textEnd):
    tokens = {"Invert": '~', "Not": '!', "UAdd": "+", "USub": "-",
              "Add": '+', "Sub": '-', 'Mult': '*', 'MatMult': '*', 'Div': '/', 'Mod': '%', 'Pow': '^', 'LShift': '<<',
              'RShift': '>>', 'BitOr': '|', 'BitXOr': '^', 'BitAnd': '&', 'FloorDiv': '//',
              'Eq': '==', 'NotEq': '!=', 'Lt': '<', 'LtE': '<=', 'Gt': '>', 'GtE': '>=',
              'IsNot': 'is not', 'NotIn': 'not in'}
    myType = type(node).__name__
    end = textStart
    myStart = posFromText(text, end)
    myContent = []
    myContent.append({"syntok": tokens[myType]})
    end += len(tokens[myType])
    myEnd = posFromText(text, end)
    me = {'type': myType, 'start': myStart, 'end': myEnd, 'content': myContent}
    if(debug): print("MADE:",me,"\\n")
    return end, me


# In[86]:


'''
Lambda(arguments args, expr body)
'''
def visitLambda(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    me["content"].append({"syntok": "lambda"})
    end += len("lambda")
    end, spaces = getSpacing(text, end, textEnd)
    me["content"] += spaces
    end, args = visit(node.args, text, end, textEnd, None)
    me['content'].append(args)
    end, spaces = getSpacing(text, end, textEnd)
    me["content"] += spaces
    # ready for body
    me["content"].append({"syntok": ":"})
    end += 1
    end, spaces = getSpacing(text, end, textEnd)
    me["content"] += spaces
    end, body = visit(node.body, text, end, textEnd, None)
    me['content'].append(body)
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me

'''
IfExp(expr test, expr body, expr orelse)
'''
def visitIfExp(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    # first body
    end, symbols, opened = getParens(text, end, textEnd)
    me['content'] += symbols
    end, body = visit(node.body, text, end, textEnd, None)
    me['content'].append(body)
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, symbols, opened = getParens(text, end, textEnd)
    me['content'] += symbols
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    # if
    me["content"].append({"syntok": "if"})
    end += len("if")
    end, spaces = getSpacing(text, end, textEnd)
    me["content"] += spaces
    end, symbols, opened = getParens(text, end, textEnd)
    me['content'] += symbols
    # test
    end, test = visit(node.test, text, end, textEnd, None)
    me['content'].append(test)
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    end, symbols, opened = getParens(text, end, textEnd)
    me['content'] += symbols
    end, spaces = getSpacing(text, end, textEnd)
    me['content'] += spaces
    # else clauses
    me['content'].append({"syntok": "else"})
    end += len("else")
    end, spaces = getSpacing(text, end, textEnd, False)
    me['content'] += spaces
    end, clause = visit(node.orelse, text, end, textEnd, None)
    me['content'].append(clause)
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me

'''
| Dict(expr* keys, expr* values)
 keys and values hold lists of nodes with matching order
 {'a': 1, **d}
'''
def visitDict(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    me["content"].append({"syntok": "{"})
    end += 1
    end, spaces = getSpacing(text, end, textEnd)
    me["content"] += spaces
    for idx, key in enumerate(node.keys):
        end, k = visit(key, text, end, textEnd, None)
        me['content'].append(k)
        end, spaces = getSpacing(text, end, textEnd)
        me['content'] += spaces
        me["content"].append({"syntok": ":"})
        end += 1
        end, spaces = getSpacing(text, end, textEnd)
        me['content'] += spaces
        end, v = visit(node.values[idx], text, end, textEnd, None)
        me['content'].append(v)
        if(idx < len(node.keys) - 1):
            end, commas = getCommas(text, end, textEnd)
            me['content'] += commas
        end, spaces = getSpacing(text, end, textEnd)
        me['content'] += spaces
    me["content"].append({"syntok": "}"})
    end += 1
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me




# In[87]:


'''
excepthandler = ExceptHandler(expr? type, identifier? name, stmt* body)
                    attributes (int lineno, int col_offset)
'''
def visitExceptHandler(node, text, textStart, textEnd):
    me = stmtOrExpr(node)
    end = textStart
    me["content"].append({"syntok": "except"})
    end += len("except")
    end, spaces = getSpacing(text, end, textEnd)
    me["content"] += spaces
    if node.type:
        end, stuff = captureStuff(text, end, node.type, "", True)
        me['content'] += stuff
    if node.name:
        me["content"].append({"syntok": "as"})
        end += len("as")
        end, spaces = getSpacing(text, end, textEnd)
        me["content"] += spaces
        name = str(node.name)
        me["content"].append({"syntok": name})
        end += len(name)
    end, spaces = getSpacing(text, end, textEnd)
    me["content"] += spaces
    me["content"].append({"syntok": ":"})
    end += 1
    #get any new line elements
    end, symbols = getPunctuationBetween(text, end, "", True)
    me["content"] += symbols
    for stmt in node.body:
        end, stuff = captureStuff(text, end, stmt, "", True)
        me['content'] += stuff
    me['end'] = posFromText(text, end)
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return end, me



# In[88]:


'''
arguments = (arg* args, arg? vararg, arg* kwonlyargs, expr* kw_defaults,
                 arg? kwarg, expr* defaults)
'''
def visitArguments(node, text, textStart, textEnd):
    myType = type(node).__name__
    myContent = []
    myStart = posFromText(text, textStart)
    end = textStart
    end = text.find(')', end, textEnd)
    if end == -1:
        end = text.find(':', textStart, textEnd) - 1
    arguments = text[textStart:end]
    myContent.append({'syntok': arguments})
    myEnd = posFromText(text, end)
    me = {'type': myType, 'start': myStart, 'end': myEnd, 'content': myContent}
    if(debug): print("MADE:", me,"\\n")
    return end, me

'''
arg = (identifier arg, expr? annotation)
           attributes (int lineno, int col_offset)
'''


# In[89]:


'''
 -- keyword arguments supplied to call (NULL identifier for **kwargs)
    keyword = (identifier? arg, expr value)
'''
def visitKeyword(node, text, textStart, textEnd):
    myType = type(node).__name__
    myContent = []
    myStart = posFromText(text, textStart)
    end = textStart
    if(node.arg):
        ar = str(node.arg)
        myContent.append({'syntok':ar})
        end += len(ar)
        end, spaces = getSpacing(text, end, textEnd)
        myContent += spaces
        myContent.append({'syntok':"="})
        end += 1
    end, spaces = getSpacing(text, end, textEnd)
    myContent += spaces
    end, value = visit(node.value, text, end, textEnd, None)
    myContent.append(value)
    myEnd = posFromText(text, end)
    me = {'type': myType, 'start': myStart, 'end': myEnd, 'content': myContent}
    if(debug): print("MADE:", me,"\\n")
    return end, me



# In[90]:


def visit(node, text, textStart, textEnd, nextNode):

    # 1. first, figure out if we're dealing with a literal or parent
    children = list(ast.iter_child_nodes(node))
    myType = type(node).__name__
    if(debug): print("\\n",type(node).__name__, children, textStart, text[textStart:textStart+3])

    visitors = {"Module": visitModule,
                "Interactive": visitModule,
                "Expression": visitModule,
                "Suite": visitModule,
                "FunctionDef": visitFunctionDef,
                "Return": visitReturn,
                "AugAssign": visitAugAssign,
                "Assign": visitAssign,
                "For": visitFor,
                "While": visitWhile,
                "If": visitIf,
                "Try": visitTry,
                "Import": visitImport,
                "ImportFrom": visitImportFrom,
                "Expr": visitExpr,
                "BoolOp": visitBoolOp,
                "BinOp": visitBinOp,
                "UnaryOp": visitUnaryOp,
                "Lambda": visitLambda,
                "IfExp": visitIfExp,
                "Dict": visitDict,
                "Compare": visitCompare,
                "Call": visitCall,
                "Num": visitNum,
                "Attribute": visitAttribute,
                "Subscript": visitSubscript,
                "Starred": visitStarred,
                "List": visitList,
                "Tuple": visitTuple,
                "Index": visitIndex,
                "ExceptHandler": visitExceptHandler,
                "arguments": visitArguments,
                "keyword": visitKeyword,
                "alias": visitAlias}

    if myType in visitors:
        return visitors[myType](node, text, textStart, textEnd)


    # necissary to filter children using findNextChild, since there's some
    # metalabels like store or load we don't care about here
    child, child_itr = findNextChild(children, -1)


    if not child: # LITERAL
        return visitLiteral(node, text, textStart)
    else:
        if(debug): print("NO VISITOR FOR "+myType, ast.dump(node, True, False))
        raise ValueError('Got no visitor for this type ' + myType)


def visitLiteral(node, text, start):
    myType = type(node).__name__
    if myType in opTokens:
        return visitOp(node, text, start, 1)
    myStart = None
    if hasattr(node, 'lineno'):
        myStart = {'line': node.lineno, 'ch': node.col_offset}
    else:
        myStart = posFromText(text, start)
    token = text[start]
    end = start
    if(token == '"'):
        pattern = re.compile('".*?"')
    elif(token == "'"):
        pattern = re.compile("'.*?'")
    else:
        pattern = re.compile('[a-zA-Z0-9_@]+')
    match = pattern.search(text[start:])
    if(debug): print("LITERAL FOUND", match, text[start:start+3])
    myLiteral = match[0]
    end += len(match[0])
    myEnd = posFromText(text, end)
    me = None
    if(isinstance(myLiteral, str)):
        me = {'type': myType, 'start': myStart, 'end': myEnd, 'literal': myLiteral}
    else: # actually a list of syntok
        me = {'type': myType, 'start': myStart, 'end': myEnd, 'content': myLiteral}
    if(debug): print("MADE:", ast.dump(node, True, False), "\\n",me,"\\n")
    return (end, me)


# In[91]:


def getPunctuationBetween(text, textStart, stopChar = "", allowNewline = False):
    textEnd = len(text)
    if(textStart >= textEnd): return textEnd, []
    i = textStart
    char = text[min(textStart, len(text) - 1)]
    content = []
    extra = []
    if(allowNewline): extra = newline
    while i < textEnd - 1 and (char in punctuation or char in extra) and char != stopChar:
        if char == "#":
            new_i, comment = captureComment(text, i, textEnd)
            content.append({'syntok': str(comment)})
            i = new_i - 1
        else:
            content.append({"syntok": str(char)})
        i += 1
        char = str(text[i])

    return i, content


# In[92]:


def getSpacing(text, textStart, textEnd, line=False):
    end = textStart
    content = []
    char = text[min(end, len(text) - 1)]
    # warning: great regex exist for this in py3 but they fail badly in py2!
    while end < len(text) - 1 and (char in spaces or (line and char in newline)):
        content.append({"syntok": str(char)})
        end += 1
        if(end <= len(text) - 1):
            char = str(text[end])
    return end, content

def getCommentsAndSpace(text, textStart, textEnd):
    end = textStart
    content = []
    char = text[min(end, len(text) - 1)]
    commentTokens = set(["#","'''"])
    # warning: great regex exist for this in py3 but they fail badly in py2!
    while end < len(text) - 1 and (char in spaces or char in newline or char in commentTokens):
        if(char in commentTokens):
            end, comment = captureComment(text, end, textEnd)
            content.append({'syntok': str(comment)})
        else:
            content.append({"syntok": str(char)})
            end += 1
        if(end < len(text)):
            char = str(text[end])
    return end, content


# In[93]:


def captureComment(text, textStart, textEnd):
    line = text[textStart:textEnd]
    line = line[:line.find("\\n")]
    return textStart + len(line), line


# In[94]:


def getParens(text, textStart, textEnd):
    end = textStart
    content = []
    char = text[min(end, len(text) - 1)]
    opened = False
    # warning: great regex exist for this in py3 but they fail badly in py2!
    while end < textEnd - 1 and char in parens:
        content.append({"syntok": str(char)})
        end += 1
        char = str(text[end])
        if(char == '('): opened = True
        else: opened = False

    return end, content, opened


# In[95]:


def getCommas(text, textStart, textEnd):
    end = textStart
    content = []
    char = text[min(end, len(text) - 1)]
    # warning: great regex exist for this in py3 but they fail badly in py2!
    while end < textEnd  and char == ',':
        content.append({"syntok": str(char)})
        end += 1
        char = str(text[end])
    return end, content


# In[96]:


def parse(text):
    if(text == ""): print("")
    else:
        node = ast.parse(text)
        if(debug): print(ast.dump(node, True, True))
        print( json.dumps(visit(node, text, 0, len(text), None)[1]))


# In[98]:


text = """
# compare MAE with differing values of max_leaf_nodes
for max_leaf_nodes in [5, 50, 500, 5000]:
    my_mae = get_mae(max_leaf_nodes, train_X, val_X, train_y, val_y)
    print("Max leaf nodes: \\%d  \\\\t\\\\t Mean Absolute Error:  \\%d" %(max_leaf_nodes, my_mae))
"""

debug = False
sqParens = set(["[","]"])
parens = set(["(",")"])
brackets = set(["{","}"])
spaces = set(["\\t", " "])
newline = set(["\\n"]) #todo may vary across platforms
punctuation = set(string.punctuation)
punctuation.add(" ")
punctuation.add("\\t")

opTokens = set(["Invert", "Not", "UAdd", "USub",
              "Add", "Sub", 'Mult', 'MatMult', 'Div', 'Mod', 'Pow', 'LShift',
              'RShift', 'BitOr', 'BitXOr', 'BitAnd', 'FloorDiv',
              'Eq', 'NotEq', 'Lt', 'LtE', 'Gt', 'GtE',
              'IsNot', 'NotIn'])

# to hurry up, reduce ast at this stage?
# match parens [] {} () otherwise those can end up in weird places

if(debug): parse(text)
#print(json.dumps(main(l, tree),  indent=2))

`;
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
    return this.runKernel(this.parserText, onReply, onIOPub);
  }

  async generateCodeNodey(
    code: string,
    position: number,
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
            accept(this.recieve_generateAST(jsn, position, options));
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
    code: string,
    position: number
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
              this.recieve_generateAST_tieMarkdown(
                jsn,
                position,
                markdown.name,
                {}
              )
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

  recieve_generateAST(
    jsn: string,
    position: number,
    options: { [key: string]: any }
  ): NodeyCode {
    //console.log("Recieved", jsn);
    var dict = options;
    if (jsn.length > 2) dict = Object.assign({}, dict, JSON.parse(jsn));
    else console.log("Recieved empty?", dict);
    var nodey = Nodey.dictToCodeCellNodey(dict, position, this.historyModel);
    console.log("Recieved code!", dict, nodey);
    return nodey;
  }

  recieve_generateAST_tieMarkdown(
    jsn: string,
    position: number,
    forceTie: string,
    options: { [key: string]: any }
  ): NodeyCode {
    //console.log("Recieved", jsn);
    var dict = options;
    if (jsn.length > 2) dict = Object.assign({}, dict, JSON.parse(jsn));
    else console.log("Recieved empty?", dict);
    var nodey = Nodey.dictToCodeCellNodey(
      dict,
      position,
      this.historyModel,
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

  async repairMarkdown(nodey: NodeyMarkdown, newText: string) {
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

  async repairFullAST(nodey: NodeyCodeCell, text: string) {
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
