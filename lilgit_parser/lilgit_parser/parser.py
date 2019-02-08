
# coding: utf-8

# In[6]:


import ast
from ast import AST
import sys
import json


# In[7]:


def getPos(text, textPos):
        snippet = text[:textPos+1]
        lines = snippet.split("\n")
        ln = len(lines)
        ch = len(lines[-1])
        return {'line': ln - 1, 'ch': ch - 1} # codemirror is 0 indexed ln/col


# In[8]:


class Visitor:
    
    def __init__(self):
        self.type = None
        self.content = []
        self.literal = None
        self.start = None
        self.end = None
        self.itr = None
        self.textEnd = None
        
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        
    def startVisit(self, node, text, textStart, textEnd):
        self.type = type(node).__name__
        self.itr = textStart
        self.textEnd = textEnd
        self.start = getPos(text, self.itr)
            
    def endVisit(self, text):
        self.end = getPos(text, self.itr)
        if(debug): print("MADE:",self.__dict__,"\n")
        
    def visitChild(self, childNode, text, forceKind = None):
        if(childNode is None): return
        
        childKind = ""
        if isinstance(childNode, AST):
            childKind = type(childNode).__name__
        else: 
            childKind = 'NotNode'
        if forceKind:
            childKind = forceKind
        child = getattr(sys.modules[__name__], childKind+"Visitor")()
        child.visit(childNode, text, self.itr, self.textEnd)
        self.content.append(child.toJSON())
        self.itr = child.itr
            
        
    def readTokens(self, text, symbols, comments = False, limit = sys.maxsize):
        char = text[min(self.itr, len(text) - 1)]
        count = 0
        while self.itr < self.textEnd and char in symbols and count < limit:
            self.content.append({"syntok": str(char)})
            self.itr += 1
            count += 1
            if(self.itr >= self.textEnd): char = None
            else: char = str(text[self.itr])
        if(comments and char in commentTokens):
            wasComment = self.captureComment(text)
            if(wasComment):
                self.readTokens(text, symbols, comments)
        return count
            
    def captureComment(self, text):
        line = text[self.itr:self.textEnd]
        index = line.find("\n")
        if(index > -1):
            line = line[:index]
            self.itr += len(line)
            self.content.append({'syntok': line})
            return True
        return False
        
    def write(self, text):
        self.content.append({"syntok": text})
        self.itr += len(text)
    
    def toJSON(self):
        return {'type': self.type, 'content': self.content, 'literal': self.literal, 'start': self.start, 'end': self.end}


# In[9]:


class NotNodeVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write(str(node))
        self.endVisit(text)


# In[23]:


class StmtExprVisitor(Visitor):
    def startVisit(self, node, text, textStart, textEnd):
        self.type = type(node).__name__
        self.itr = textStart
        self.textEnd = textEnd
        self.start = {'line': node.lineno - 1, 'ch': node.col_offset} # codemirror is 0 indexed ln


# In[24]:


'''
mod = Module(stmt* body)
        | Interactive(stmt* body)
        | Expression(expr body)

        -- not really an actual node but useful in Jython's typesystem.
        | Suite(stmt* body)
'''
class ModuleVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.readTokens(text, space|newLine, comments = True)
        
        # body
        if(isinstance(node.body, list)):
            for stmt in node.body:
                self.visitChild(stmt, text)
                self.readTokens(text, space|newLine, comments = True)
        else:
            self.visitChild(stmt, text)
    
        self.readTokens(text, space|newLine, comments = True)
        self.endVisit(text)

class InteractiveVisitor(ModuleVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.endVisit(text)

class ExpressionVisitor(ModuleVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.endVisit(text)

class SuiteVisitor(ModuleVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.endVisit(text)


# In[25]:


'''
FunctionDef(identifier name, arguments args,
                       stmt* body, expr* decorator_list, expr? returns)
'''
class FunctionDefVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        #decorators
        for dec in node.decorator_list:
            self.visitChild(dec, text)
            self.readTokens(text, space|newLine, comments = True)
        self.visitFunction(node, text)   
        
    
    def visitFunction(self, node, text):
        #def and name
        self.write("def")
        self.readTokens(text, space)
        name = str(node.name)
        self.write(name)
        self.readTokens(text, space)
        openCount = self.readTokens(text, {"("})

        # arguments
        self.visitChild(node.args, text)
        self.readTokens(text, space)
        self.readTokens(text, {")"}, limit = openCount)
        self.readTokens(text, space)
  
        # end function header
        self.write(":")
        self.readTokens(text, space)
        
        # check for return annotation
        if(node.returns):
            self.write("->")
            self.readTokens(text, space)
            end, ret = visitChild(node.returns, text, end, textEnd)
            
        # finally, body of the function
        for stmt in node.body:
            self.readTokens(text, space|newLine, comments = True)
            self.visitChild(stmt, text)
            self.readTokens(text, space, comments = True)
        self.endVisit(text)

'''
AsyncFunctionDef(identifier name, arguments args,
                       stmt* body, expr* decorator_list, expr? returns)
'''
class AsyncFunctionDefVisitor(FunctionDefVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        #decorators
        for dec in node.decorator_list:
            self.visitChild(dec, text)
            self.readTokens(text, space|newLine, comments = True)
        # add the async token
        self.write("async")
        self.readTokens(text, space)
        self.visitFunction(node, text)   

'''
ClassDef(identifier name, expr* bases, keyword* keywords, stmt* body, expr* decorator_list)
'''
class ClassDefVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        #decorators
        for dec in node.decorator_list:
            self.visitChild(dec, text)
            self.readTokens(text, space|newLine, comments = True)
            
        #class and name
        self.write("class")
        self.readTokens(text, space)
        self.write(str(node.name))
        self.readTokens(text, space)
        openCount = self.readTokens(text, {"("})
        self.readTokens(text, space)
        
        # bases
        for base in node.bases:
            self.visitChild(base, text)
            #get spaces and commas only
            self.readTokens(text, space|commas)

        # keywords
        for key in node.keywords:
            self.visitChild(key, text)
            #get spaces and commas only
            self.readTokens(text, space|commas)

        # end class header
        self.readTokens(text, {")"}, limit = openCount)
        self.readTokens(text, space)
        self.write(":")
        
        # finally, body of the class
        for stmt in node.body:
            self.readTokens(text, space|newLine, comments = True)
            self.visitChild(stmt, text)
            self.readTokens(text, space, comments = True)
        self.endVisit(text)
    
    
'''
Return(expr? value)
'''
class ReturnVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write("return")
        self.readTokens(text, space)
        if(node.value):
            self.visitChild(node.value, text)
            self.readTokens(text, space, comments = True)
        self.endVisit(text)
        
'''
| Delete(expr* targets)
'''
class DeleteVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write("del")
        self.readTokens(text, space)
        openCount = self.readTokens(text, {"("})
        for target in node.targets:
            self.readTokens(text, space|commas)
            openCount = self.readTokens(text, {"("})
            self.readTokens(text, space| commas)
            self.visitChild(target, text)
            if(openCount > 0):
                self.readTokens(text, space)
                self.readTokens(text, {")"}, limit = openCount)
        self.endVisit(text)  
        
'''
| Assign(expr* targets, expr value)
'''
class AssignVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        for target in node.targets:
            self.visitChild(target, text)
            self.readTokens(text, space|commas)
        self.write("=")   
        self.readTokens(text, space)
        self.visitChild(node.value, text)
        self.endVisit(text)  


'''
| AugAssign(expr target, operator op, expr value)
'''
class AugAssignVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.visitChild(node.target, text)
        self.readTokens(text, space|commas)
        self.visitChild(node.op, text)
        self.write("=")   
        self.readTokens(text, space)
        self.visitChild(node.value, text)
        self.endVisit(text) 

'''
-- 'simple' indicates that we annotate simple name without parens
          | AnnAssign(expr target, expr annotation, expr? value, int simple)
'''
class AnnAssignVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        openCount = 0
        
        # target
        targetType = type(node.target).__name__
        if(node.simple == 0 and targetType == "Name"):
            openCount = self.readTokens(text, {"("})
            self.readTokens(text, space)

        self.visitChild(node.target, text)
        self.readTokens(text, space)
        
        if(node.simple == 0 and targetType == "Name"):
            self.readTokens(text, {")"}, limit = openCount)
            self.readTokens(text, space)
            
        # annotation
        self.write(":")
        self.readTokens(text, space)
        openCount = self.readTokens(text, {"("})
        self.readTokens(text, space)
        self.visitChild(node.annotation, text)
        self.readTokens(text, space)
        self.readTokens(text, {")"}, limit = openCount)
        
        # value
        if(node.value):
            self.readTokens(text, space)
            self.write("=")  
            self.readTokens(text, space)
            self.visitChild(node.value, text)

        self.endVisit(text) 

        
'''
| For(expr target, expr iter, stmt* body, stmt* orelse)
'''
class ForVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.visitFor(node, text, textStart, textEnd)
    
    def visitFor(self, node, text, textStart, textEnd):
        self.write("for")
        self.readTokens(text, space)
        openCount = self.readTokens(text, {"("})
        self.readTokens(text, space)
        self.visitChild(node.target, text)
        self.readTokens(text, space)
        self.write("in")
        self.readTokens(text, space)
        self.visitChild(node.iter, text)
        # get spaces, : and any new line
        self.readTokens(text, space|newLine|{':'}, comments = True)
        for stmt in node.body:
            self.readTokens(text, space|newLine)
            self.visitChild(stmt, text)
        for stmt in node.orelse:
            self.write("else")
            # get spaces, : and any new line
            self.readTokens(text, space|newLine|{':'}, comments = True)
            self.visitChild(stmt, text)
        self.endVisit(text) 
'''
| AsyncFor(expr target, expr iter, stmt* body, stmt* orelse)
'''
class AsyncForVisitor(ForVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("async")
        self.readTokens(text, space)
        self.visitFor(node, text, textStart, textEnd)


'''
| While(expr test, stmt* body, stmt* orelse)
'''
class WhileVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("while")
        self.readTokens(text, space)
        openCount = self.readTokens(text, {"("})
        self.readTokens(text, space)
        self.visitChild(node.test, text)
        self.readTokens(text, space)
        self.readTokens(text, {")"}, limit = openCount)
        self.readTokens(text, space|newLine|{':'})
        for stmt in node.body:
            self.readTokens(text, space|newLine)
            self.visitChild(stmt, text)

        for stmt in node.orelse:
            self.write("else")
            self.readTokens(text, space)
            self.readTokens(text, space|newLine|{':'})
            self.visitChild(stmt, text)
        self.endVisit(text) 

'''
| If(expr test, stmt* body, stmt* orelse)
'''
class IfVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("if")
        self.visitIf(node, text, textStart, textEnd)
        
    def visitIf(self, node, text, textStart, textEnd, nested = False):
        self.readTokens(text, space)
        openCount = self.readTokens(text, {"("})
        self.visitChild(node.test, text)
        self.readTokens(text, space)
        self.readTokens(text, {")"}, limit = openCount)
        self.readTokens(text, space|newLine|{':'}, comments = True)
        for stmt in node.body:
            self.readTokens(text, space|newLine, comments = True)
            self.visitChild(stmt, text)
        for stmt in node.orelse:
            self.readTokens(text, space|newLine, comments = True)
            sType = type(stmt).__name__
            if sType == "If":
                self.visitChild(stmt, text, forceKind = 'NestedIf')
            else:
                self.write("else")
                self.readTokens(text, space|newLine|{':'}, comments = True)
                self.visitChild(stmt, text)
        self.endVisit(text) 

class NestedIfVisitor(IfVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("elif")
        self.visitIf(node, text, textStart, textEnd)
        
'''
| With(withitem* items, stmt* body)
'''
class WithVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("with")
        self.visitWith(node, text, textStart, textEnd)

    def visitWith(self, node, text, textStart, textEnd):
        self.readTokens(text, space)
        for withitem in node.items:
            self.visitChild(withitem, text)
            self.readTokens(text, space|commas)
        self.readTokens(text, space|newLine|{':'}, comments = True)
        for stmt in node.body:
            self.visitChild(stmt, text)
            self.readTokens(text, space|newLine, comments = True)
        self.endVisit(text)

'''
| AsyncWith(withitem* items, stmt* body)
'''
class AsyncWithVisitor(WithVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("async")
        self.readTokens(text, space)
        self.write("with")
        self.visitWith(node, text, textStart, textEnd)


# In[26]:


'''
| Raise(expr? exc, expr? cause)
'''
class RaiseVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("raise")
        if(node.exc):
            self.readTokens(text, space)
            openCount = self.readTokens(text, {"("})
            self.readTokens(text, space)
            self.visitChild(node.exc, text)
            if(openCount):
                self.readTokens(text, space)
                self.readTokens(text, {")"}, limit = openCount)
        if(node.cause):
            self.readTokens(text, space)
            self.write("from")
            self.readTokens(text, space)
            self.visitChild(node.cause, text)
        self.endVisit(text)
        
'''
| Try(stmt* body, excepthandler* handlers, stmt* orelse, stmt* finalbody)
'''
class TryVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("try")
        self.readTokens(text, space|newLine|{':'}, comments = True)
        for stmt in node.body:
            self.readTokens(text, space|newLine, comments = True)
            self.visitChild(stmt, text)
        for excepthandle in node.handlers:
            self.readTokens(text, space|newLine, comments = True)
            self.visitChild(excepthandle, text)
        for stmt in node.orelse:
            self.write("else")
            self.readTokens(text, space|newLine|{':'}, comments = True)
            self.visitChild(stmt, text)
        for stmt in node.finalbody:
            self.readTokens(text, space|newLine, comments = True)
            self.write("finally")
            self.readTokens(text, space|newLine|{':'}, comments = True)
            self.visitChild(stmt, text)
        self.endVisit(text)

'''
| Assert(expr test, expr? msg)
'''
class AssertVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("assert")
        self.readTokens(text, space)
        openCount = self.readTokens(text, {"("})
        self.readTokens(text, space)
        self.visitChild(node.test, text)
        if(openCount):
            self.readTokens(text, space)
            self.readTokens(text, {")"}, limit = openCount)
        if(node.msg):
            self.readTokens(text, space)
            self.write(",")
            self.readTokens(text, space)
            openCount = self.readTokens(text, {"("})
            self.readTokens(text, space)
            self.visitChild(node.msg, text)
            if(openCount):
                self.readTokens(text, space)
                self.readTokens(text, {")"}, limit = openCount)
        self.endVisit(text) 
        
'''
Import(alias* names)
'''
class ImportVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.visitImport(node, text, textStart, textEnd)
    
    def visitImport(self, node, text, textStart, textEnd):
        self.write("import")
        self.readTokens(text, space)
        openCount = self.readTokens(text, {"("})
        for alias in node.names:
            self.readTokens(text, space|commas)
            self.visitChild(alias, text)
        if(openCount):
            self.readTokens(text, space)
            self.readTokens(text, {")"}, limit = openCount)
        self.endVisit(text) 

'''
ImportFrom(identifier? module, alias* names, int? level)
'''
class ImportFromVisitor(ImportVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("from")
        self.readTokens(text, space)
        self.write(str(node.module))
        self.readTokens(text, space)
        self.visitImport(node, text, textStart, textEnd)
        
'''
| Global(identifier* names)
'''
class GlobalVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("global")
        for name in node.names:
            self.readTokens(text, space|commas)
            self.write(str(name))
        self.endVisit(text)  

'''
| Nonlocal(identifier* names)
'''
class NonlocalVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("nonlocal")
        for name in node.names:
            self.readTokens(text, space|commas)
            self.write(str(name))
        self.endVisit(text) 
        
'''
| Pass
'''
class PassVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("pass")
        self.endVisit(text) 

'''
| Continue
'''
class ContinueVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("continue")
        self.endVisit(text) 

'''
| Break
'''
class BreakVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("break")
        self.endVisit(text) 
  
'''
BoolOp(boolop op, expr* values)
'''
class BoolOpVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        for i, value in enumerate(node.values):
            self.visitChild(value, text)
            if(i < len(node.values) - 1):
                self.readTokens(text, space)
                self.visitChild(node.op, text)
                self.readTokens(text, space)
        self.endVisit(text)


'''
| BinOp(expr left, operator op, expr right)
'''
class BinOpVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.visitChild(node.left, text)
        self.readTokens(text, space)
        self.visitChild(node.op, text)
        self.readTokens(text, space)
        self.visitChild(node.right, text)
        self.endVisit(text) 

'''
| UnaryOp(unaryop op, expr operand)
'''
class UnaryOpVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.visitChild(node.op, text)
        self.readTokens(text, space)
        self.visitChild(node.operand, text)
        self.endVisit(text) 

'''
| Lambda(arguments args, expr body)
'''
class LambdaVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("lambda")
        self.readTokens(text, space)
        self.visitChild(node.args, text)
        self.readTokens(text, space|{":"})
        self.readTokens(text, space)
        openCount = self.readTokens(text, {"("})
        self.readTokens(text, space)
        self.visitChild(node.body, text)
        if(openCount):
            self.readTokens(text, space)
            self.readTokens(text, {")"}, limit = openCount)
        self.endVisit(text) 
        

'''
| IfExp(expr test, expr body, expr orelse)
'''
class IfExpVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.readTokens(text, {"("})
        self.visitChild(node.body, text)
        self.readTokens(text, space|{")"})
        self.write("if")
        self.readTokens(text, space|{"("})
        self.visitChild(node.test, text)
        self.readTokens(text, space|{"(", ")"})
        self.write("else")
        self.readTokens(text, space)
        openCount = self.readTokens(text, {"("})
        self.readTokens(text, space)
        self.visitChild(node.orelse, text)
        if(openCount):
            self.readTokens(text, space)
            self.readTokens(text, {")"}, limit = openCount)
        self.endVisit(text) 

'''
| Dict(expr* keys, expr* values)
'''
class DictVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("{")
        for i, key in enumerate(node.keys):
            self.readTokens(text, space|{"("}|commas)
            self.visitChild(key, text)
            self.readTokens(text, space|{")"})
            self.write(":")
            self.readTokens(text, space|{"("})
            self.visitChild(node.values[i], text)
            self.readTokens(text, space|{")"})
        self.write("}")    
        self.endVisit(text) 
        
'''
| Set(expr* elts)
'''
class SetVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("{")
        for i, key in enumerate(node.elts):
            self.readTokens(text, space|{"("}|commas)
            self.visitChild(key, text)
            self.readTokens(text, space|{")"})
        self.write("}")    
        self.endVisit(text) 
        
'''
| ListComp(expr elt, comprehension* generators)
'''
class ListCompVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write("[")
        self.readTokens(text, space)
        self.visitChild(node.elt, text)
        self.readTokens(text, space)
        self.endVisit(text) 
        for gen in node.generators :
            self.readTokens(text, space)
            self.visitChild(gen, text)
        self.write("]")    
        self.endVisit(text) 


'''
| SetComp(expr elt, comprehension* generators)
'''
class SetCompVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write("{")
        self.readTokens(text, space)
        self.visitChild(node.elt, text)
        self.readTokens(text, space)
        self.endVisit(text) 
        for gen in node.generators :
            self.readTokens(text, space)
            self.visitChild(gen, text)
        self.write("}")    
        self.endVisit(text) 


'''
| DictComp(expr key, expr value, comprehension* generators)
'''
class DictCompVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write("{")
        self.readTokens(text, space)
        self.visitChild(node.key, text)
        self.write(":")
        self.readTokens(text, space)
        self.visitChild(node.value, text)
        self.readTokens(text, space)
        self.endVisit(text) 
        for gen in node.generators :
            self.readTokens(text, space)
            self.visitChild(gen, text)
        self.write("}")    
        self.endVisit(text) 

'''
| GeneratorExp(expr elt, comprehension* generators)
'''
class GeneratorExpVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write("(")
        self.readTokens(text, space)
        self.visitChild(node.elt, text)
        self.readTokens(text, space)
        self.endVisit(text) 
        for gen in node.generators :
            self.readTokens(text, space)
            self.visitChild(gen, text)
        self.write(")")    
        self.endVisit(text) 
        

'''
| Yield(expr? value)
'''
class YieldVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write("yield")
        if(node.value):
            self.readTokens(text, space)
            self.visitChild(node.value, text)
        self.endVisit(text) 

'''
| YieldFrom(expr value)
'''
class YieldFromVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write("yield")
        self.readTokens(text, space)
        self.write("from")
        self.readTokens(text, space)
        self.visitChild(node.value, text)
        self.endVisit(text) 


# In[27]:


class OpVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write(self.getOp())
        self.endVisit(text)
        
    def getOp(self):
        return None
    
'''
boolop = And | Or
'''
class AndVisitor(OpVisitor):
    def getOp(self):
        return "and"
    
class OrVisitor(OpVisitor):
    def getOp(self):
        return "or"

'''
operator = Add | Sub | Mult | MatMult | Div | Mod | Pow | LShift
             | RShift | BitOr | BitXor | BitAnd | FloorDiv
'''
class AddVisitor(OpVisitor):
    def getOp(self):
        return "+"
class SubVisitor(OpVisitor):
    def getOp(self):
        return "-"
class MultVisitor(OpVisitor):
    def getOp(self):
        return "*"
class MatMultVisitor(OpVisitor):
    def getOp(self):
        return "*"
class DivVisitor(OpVisitor):
    def getOp(self):
        return "/"
class ModVisitor(OpVisitor):
    def getOp(self):
        return "%"
class PowVisitor(OpVisitor):
    def getOp(self):
        return "**"
class LShiftVisitor(OpVisitor):
    def getOp(self):
        return "<<"
class RShiftVisitor(OpVisitor):
    def getOp(self):
        return ">>"
class BitOrVisitor(OpVisitor):
    def getOp(self):
        return "|"
class BitXorVisitor(OpVisitor):
    def getOp(self):
        return "^"
class BitAndVisitor(OpVisitor):
    def getOp(self):
        return "&"
class FloorDiv(OpVisitor):
    def getOp(self):
        return "//"
    
'''
unaryop = Invert | Not | UAdd | USub
'''
class InvertVisitor(OpVisitor):
    def getOp(self):
        return "~"
class NotVisitor(OpVisitor):
    def getOp(self):
        return "not"
class UAddVisitor(OpVisitor):
    def getOp(self):
        return "+"
class USubVisitor(OpVisitor):
    def getOp(self):
        return "-"
    
'''
cmpop = Eq | NotEq | Lt | LtE | Gt | GtE | Is | IsNot | In | NotIn
'''
class EqVisitor(OpVisitor):
    def getOp(self):
        return "=="
class NotEqVisitor(OpVisitor):
    def getOp(self):
        return "!="
class LtVisitor(OpVisitor):
    def getOp(self):
        return "<"
class LtEVisitor(OpVisitor):
    def getOp(self):
        return "<="
class GtVisitor(OpVisitor):
    def getOp(self):
        return ">"
class GtEVisitor(OpVisitor):
    def getOp(self):
        return ">="
class IsVisitor(OpVisitor):
    def getOp(self):
        return "is"
class IsNotVisitor(OpVisitor):
    def getOp(self):
        return "is not"
class InVisitor(OpVisitor):
    def getOp(self):
        return "in"
class NotInVisitor(OpVisitor):
    def getOp(self):
        return "not in"


# In[28]:


'''
 comprehension = (expr target, expr iter, expr* ifs, int is_async)
'''
class comprehensionVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        if(node.is_async):
            self.write("async")
            self.readTokens(text, space)
        self.write("for")
        self.readTokens(text, space)
        self.visitChild(node.target, text)
        self.readTokens(text, space)
        self.write("in")
        self.visitChild(node.iter, text)
        # ifs
        for iff in node.ifs:
            self.readTokens(text, space)
            self.write("if")
            self.readTokens(text, space)
            self.visitChild(iff, text)
        self.endVisit(text) 


'''
excepthandler = ExceptHandler(expr? type, identifier? name, stmt* body)
                    attributes (int lineno, int col_offset)
'''
class ExceptHandlerVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("except")
        self.readTokens(text, space)
        openCount = self.readTokens(text, {"("})
        if node.type:
            self.readTokens(text, space)
            self.visitChild(node.type, text)
        if node.name:
            self.readTokens(text, space)
            self.write("as")
            self.readTokens(text, space)
            self.write(str(node.name))
        self.readTokens(text, space)
        self.readTokens(text, {")"}, limit = openCount)
        self.readTokens(text, space|newLine|{':'}, comments = True)
        for stmt in node.body:
            self.readTokens(text, space|newLine, comments = True)
            self.visitChild(stmt, text)
        self.endVisit(text)


'''
arguments = (arg* args, arg? vararg, arg* kwonlyargs, expr* kw_defaults,
                 arg? kwarg, expr* defaults)
'''
class argumentsVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        # args
        for ind, arg in enumerate(node.args):
            self.readTokens(text, space|commas)
            self.visitChild(arg, text)
            if(node.defaults and (ind - len(node.defaults) + 1 > -1)):
                dind = ind - len(node.defaults) + 1
                if(dind < len(node.defaults) - 1 and node.defaults[dind]):
                    self.readTokens(text, space)
                    self.write("=")
                    self.readTokens(text, space)
                    self.visitChild(node.defaults[dind], text)
        # vararg   
        if(node.vararg):
            self.readTokens(text, space|commas)
            self.write("*")
            self.visitChild(node.vararg, text)
        # kwonlyargs
        for ind, kwo in enumerate(node.kwonlyargs):
            self.readTokens(text, space|commas)
            self.visitChild(kwo, text)
            if(node.kw_defaults and node.kw_defaults[ind]):
                self.readTokens(text, space)
                self.write("=")
                self.readTokens(text, space)
                self.visitChild(node.kw_defaults[ind], text)
        # kwarg
        if(node.kwarg):
            self.readTokens(text, space|commas)
            self.write("**")
            self.visitChild(node.kwarg, text)
        self.endVisit(text)


'''
arg = (identifier arg, expr? annotation)
           attributes (int lineno, int col_offset)
'''
class argVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write(str(node.arg))
        if(node.annotation):
            self.readTokens(text, space)
            self.write(":")
            self.readTokens(text, space)
            self.visitChild(node.annotation, text)
        self.endVisit(text)
        

'''
-- import name with optional 'as' alias.
    alias = (identifier name, identifier? asname)
'''
class aliasVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.readTokens(text, space)
        self.write(str(node.name))
        if(node.asname):
            self.readTokens(text, space)
            self.write("as")
            self.readTokens(text, space)
            self.write(str(node.asname))
        self.endVisit(text)
        

'''
keyword = (identifier? arg, expr value)
'''
class keywordVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.visitChild(node.arg, text)
        self.readTokens(text, space|{'='})
        self.visitChild(node.value, text)
        self.endVisit(text)
        
'''
withitem = (expr context_expr, expr? optional_vars)
'''
class withitemVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        openCount = self.readTokens(text, {"("})
        self.visitChild(node.context_expr, text)
        self.readTokens(text, {")"}, limit = openCount)
        if(node.optional_vars):
            self.readTokens(text, space)
            self.write("as")
            self.readTokens(text, space)
            openCount = self.readTokens(text, {"("})
            self.readTokens(text, space)
            self.visitChild(node.optional_vars, text)
            if openCount > 0:
                self.readTokens(text, space)
                self.readTokens(text, {")"}, limit = openCount)
        self.endVisit(text)
        


# In[29]:


'''
Expr(expr value)
'''
class ExprVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.visitChild(node.value, text)
        self.endVisit(text)


# In[30]:


'''
| Await(expr value)
'''
class AwaitVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write("await")
        self.readTokens(text, space)
        openCount = self.readTokens(text, {"("})
        self.readTokens(text, space)
        self.visitChild(node.value, text)
        if(openCount > 0):
            self.readTokens(text, space)
            self.readTokens(text, {")"}, limit = openCount)
        self.endVisit(text)
        


'''
-- need sequences for compare to distinguish between
-- x < 4 < 3 and (x < 4) < 3
| Compare(expr left, cmpop* ops, expr* comparators)
'''
class CompareVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        openCount = self.readTokens(text, {"("})
        self.readTokens(text, space)

        # get left expr
        self.visitChild(node.left, text)

        if(node.ops):
            self.readTokens(text, space)
            for cmpop in node.ops:
                openCount2 = self.readTokens(text, {"("})
                self.readTokens(text, space)
                self.visitChild(cmpop, text)
                self.readTokens(text, space)
                self.readTokens(text, {")"}, limit = openCount2)

        if(node.comparators):
            self.readTokens(text, space)
            for expr in node.comparators:
                openCount3 = self.readTokens(text, {"("})
                self.readTokens(text, space)
                self.visitChild(expr, text)
                self.readTokens(text, space)
                self.readTokens(text, {")"}, limit = openCount3)
                
        self.readTokens(text, {")"}, limit = openCount)
        self.endVisit(text)
    
        
'''
Call(expr func, expr* args, keyword* keywords)
'''
class CallVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.visitChild(node.func, text)
        openCount = self.readTokens(text, {"("})
        
        self.readTokens(text, space)
        for argument in node.args:
            self.readTokens(text, space|commas)
            self.visitChild(argument, text)
        for keyword in node.keywords:
            self.readTokens(text, space|commas)
            self.visitChild(keyword, text)
            
        self.readTokens(text, space|commas)
        self.readTokens(text, {")"}, limit = openCount)
        self.endVisit(text)



'''
| Num(object n) -- a number as a PyObject.
we need this one while we don't need one for Str because we need special regex for decimals
'''
class NumVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        value = str(node.n)
        self.literal = value
        self.itr += len(value)
        self.endVisit(text)

'''
| Str(string s) -- need to specify raw, unicode, etc?
'''
class StrVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        openQuotes = self.readTokens(text, quotes)
        self.write(str(node.s))
        self.readTokens(text, quotes, limit = openQuotes)
        self.endVisit(text)
        

'''
 | Name(identifier id, expr_context ctx)
'''
class NameVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        openCount = self.readTokens(text, {"("})
        self.readTokens(text, space)
        self.write(str(node.id))
        if(openCount):
            self.readTokens(text, space)
            self.readTokens(text, {")"}, limit = openCount)
        self.endVisit(text)
    

'''
| FormattedValue(expr value, int? conversion, expr? format_spec)
'''
class FormattedValueVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        openCount = self.readTokens(text, {"{"})
        self.readTokens(text, space)
        self.visitChild(node.value, text)
        if(node.format_spec):
            self.readTokens(text, space)
            self.write(":")
            self.visitChild(node.format_spec, text, forceKind = 'NestedJoinedStr')
            self.readTokens(text, space)
        self.readTokens(text, {"}"}, limit = openCount)
        self.endVisit(text)
    
'''
| JoinedStr(expr* values)
'''
class JoinedStrVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write("f\"")
        for val in node.values:
            self.visitChild(val, text)
        self.write("\"")
        self.endVisit(text)
class NestedJoinedStrVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        for val in node.values:
            self.visitChild(val, text)
        self.endVisit(text)

'''
| Bytes(bytes s)
'''
class BytesVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write(str(node.s))
        self.endVisit(text)

'''
| NameConstant(singleton value)
'''
class NameConstantVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write(str(node.value))
        self.endVisit(text)

'''
| Ellipsis
'''
class EllipsisVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write("...")
        self.endVisit(text)

'''
| Constant(constant value)
'''
class ConstantVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write(str(node.value))
        self.endVisit(text)


'''
| Attribute(expr value, identifier attr, expr_context ctx)
'''
class AttributeVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.visitChild(node.value, text)
        self.write(".")
        self.visitChild(node.attr, text)
        self.endVisit(text)

'''
| Subscript(expr value, slice slice, expr_context ctx)
'''
class SubscriptVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.visitChild(node.value, text)
        openCount = self.readTokens(text, {"["})
        self.readTokens(text, space)
        self.visitChild(node.slice, text)
        self.readTokens(text, space)
        self.readTokens(text, {"]"}, limit = openCount)
        self.endVisit(text)


'''
| Starred(expr value, expr_context ctx)
'''
class StarredVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.write("*")
        self.visitChild(node.value, text)
        self.endVisit(text)
    
    
'''
| List(expr* elts, expr_context ctx)
'''
class ListVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("[")
        for i, key in enumerate(node.elts):
            self.readTokens(text, space|{"("}|commas)
            self.visitChild(key, text)
            self.readTokens(text, space|{")"})
        self.write("]")    
        self.endVisit(text) 

'''
| List(expr* elts, expr_context ctx)
'''
class TupleVisitor(StmtExprVisitor):
    def visit(self, node, text, textStart, textEnd):
        self.startVisit(node, text, textStart, textEnd)
        self.write("(")
        for i, key in enumerate(node.elts):
            self.readTokens(text, space|commas)
            self.visitChild(key, text)
            self.readTokens(text, space)
        self.write(")")    
        self.endVisit(text) 
        
'''
Slice(expr? lower, expr? upper, expr? step)
'''
class SliceVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.visitChild(node.lower, text)
        self.readTokens(text, space|{":"})
        self.visitChild(node.upper, text)
        if(node.step):
            self.readTokens(text, space|{":"})
            self.visitChild(node.step, text)
        self.endVisit(text)  

'''
| ExtSlice(slice* dims)
'''
class ExtSliceVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        for dim in node.dims:
            self.readTokens(text, space|{","})
            self.visitChild(dim, text)
        self.endVisit(text)  
        

'''
| Index(expr value)
'''
class IndexVisitor(Visitor):
    def visit(self, node, text, textStart, textEnd):
        super().visit(node, text, textStart, textEnd)
        self.visitChild(node.value, text)
        self.endVisit(text)  


# In[31]:


space = {"\t", " "}
newLine = {"\n", "\r"} #todo may vary across platforms
commentTokens = {"#","'''"}
commas = {","}
quotes = {"'", '"'}


# In[33]:


debug = False
test = """ollie = 'OK!'"""
if(debug):
    visitor = parse(test)
    print(visitor)


# In[34]:


def parse(code):
    if(code == ""):
        return {'type': 'Module', 'content': [], 'literal': None, 'start': {'line': 0, 'ch': 0}, 'end': {'line': 0, 'ch': 0}}
    node = ast.parse(code)
    visitor = ModuleVisitor()
    visitor.visit(node, code, 0, len(code))
    return visitor.toJSON()


# In[35]:


# TESTS

'''
A function that takes a formatted nodey and translates it to sourcode.
If our parser is correct, we should expect the translated sourcecode and the input text to be the same.
'''
def translateBack(nodey):
    code = []
    if nodey['literal']:
        code = nodey['literal']
    else:
        for item in nodey['content']:
            if 'syntok' in item:
                code.append(item['syntok'])
            else:
                code.append(translateBack(item))
    return "".join(code)

if(debug): print(translateBack(visitor))

