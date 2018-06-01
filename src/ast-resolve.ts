import{
  NodeyCode
} from './nodey'

import * as CodeMirror
  from 'codemirror';

import{
  CodeMirrorEditor
} from '@jupyterlab/codemirror';

import {
  Model
} from './model'

import * as crypto from 'crypto';
import * as levenshtein from 'fast-levenshtein';


export
class ASTResolve{

  historyModel : Model

  constructor(historyModel : Model)
  {
    this.historyModel = historyModel
  }


  repairAST(nodey : NodeyCode, change : CodeMirror.EditorChange, editor : CodeMirrorEditor)
  {
    var range = this.solveRange(change, editor) // first convert code mirror coordinates to our coordinates
    console.log("updated range is", range)
    var affected = this.findAffectedChild(nodey.content, 0, Math.max(0, nodey.content.length - 1), range)
    affected = affected || nodey // if there's no specific node broken, the whole cell node is broken

    // shift all nodey positions after affected
    var newEnd = this.repairPositions(affected, change)

    // return the text from this node's new range
    var text = editor.doc.getRange(affected.start, newEnd)
    var updateID = crypto.randomBytes(20).toString('hex');
    affected.pendingUpdate = updateID
    console.log("The exact affected nodey is", affected, text)

    var kernel_reply = this.recieve_newVersion.bind(this, affected, updateID)
    return [kernel_reply, text]
  }


  /*
  * Convert into full line ranges, to increase the likelihood that we get a nodey that the python
  * parser can parse (it fails on random little snippets)
  */
  solveRange(change : CodeMirror.EditorChange, editor : CodeMirrorEditor)
  {
    var lineRange = {'start': {'line': change.from.line, 'ch': change.from.ch}, 'end': {'line': change.to.line, 'ch': change.to.ch}}
    lineRange.start.ch = 0
    //lineRange.end.ch = editor.doc.getLine(change.to.line).length
    return lineRange
  }


  findAffectedChild(content: number[], min: number, max: number, change: {'start': any, 'end': any}) :  NodeyCode
  {
    var mid = Math.round((max - min)/2) + min
    var midNodey = <NodeyCode> this.historyModel.getCodeNodey(content[mid])
    var direction = this.inRange(midNodey, change)

    if((min >= max || max <= min) && direction !== 0) //end condition no more to explore
      return null

    if(direction === 0) // it's in this node, check for children to be more specific
    {
      if(midNodey.content.length < 1)
        return midNodey // found!
      else
        return this.findAffectedChild(midNodey.content, 0, Math.max(0, midNodey.content.length - 1), change) || midNodey // found!
    }
    else if(direction === 2)
      return null // there is no match at this level
    else if(direction === -1) // check the left
      return this.findAffectedChild(content, min, mid - 1, change)
    else if(direction === 1) // check the right
      return this.findAffectedChild(content, mid + 1, max, change)
      return null
  }


  repairPositions(affected : NodeyCode, change : CodeMirror.EditorChange) : {'line': number, 'ch': number}
  {
    // shift all nodes after this changed node
    var [nodeEnd , deltaLine, deltaCh] = this.calcShift(affected, change)
    if(affected.right)
    {
      if(affected.right.start.line !== nodeEnd.line)
        deltaCh = 0
      this.shiftAllAfter(affected.right, deltaLine, deltaCh)
    }
    return nodeEnd
  }


  calcShift(affected : NodeyCode, change : CodeMirror.EditorChange): [{'line': number, 'ch': number}, number, number]
  {
    var nodeEnd = affected.end

    // calculate deltas
    var deltaLine = 0
    var deltaCh = 0

    var added_line = change.text.length
    var removed_line = change.removed.length
    deltaLine = added_line - removed_line

    var added_ch = (change.text[Math.max(change.text.length - 1, 0)] || "").length
    var removed_ch = (change.removed[Math.max(change.removed.length - 1, 0)] || "").length
    deltaCh = added_ch - removed_ch

    // need to calculate: change 'to' line is not dependable because it is before coordinates only
    var endLine = change.from.line + deltaLine

    // update this node's coordinates
    if(endLine === nodeEnd.line)
      nodeEnd.ch = nodeEnd.ch + deltaCh
    else
      nodeEnd.line  = nodeEnd.line + deltaLine

    return [nodeEnd, deltaLine, deltaCh]
  }


  shiftAllAfter(nodey: NodeyCode, deltaLine: number, deltaCh: number) : void
  {
    if(deltaLine === 0 && deltaCh === 0)//no more shifting, stop
      return

    console.log("Shifting ", nodey, "by", deltaLine, " ", deltaCh, " before:"+nodey.start.line+" "+nodey.start.ch)
    nodey.start.line += deltaLine
    nodey.end.line += deltaLine
    nodey.start.ch += deltaCh

    //Now be sure to shift all children
    this.shiftAllChildren(nodey, deltaLine, deltaCh)

    var rightSibling = nodey.right
    if(rightSibling)
    {
      if(rightSibling.start.line !== nodey.start.line)
        deltaCh = 0
      this.shiftAllAfter(rightSibling, deltaLine, deltaCh)
    }
  }


  shiftAllChildren(nodey: NodeyCode, deltaLine: number, deltaCh: number) : void
  {
    for(var i in nodey.content)
    {
      var child = this.historyModel.getCodeNodey(nodey.content[i])
      child.start.line += deltaLine
      child.end.line += deltaLine
      child.start.ch += deltaCh
      this.shiftAllChildren(child, deltaLine, deltaCh)
    }
  }


  //return 0 for match, 1 for to the right, -1 for to the left, 2 for both
  inRange(nodey : NodeyCode, change: {'start': any, 'end': any}) : number
  {
    var val = 0
    if(change.start.line < nodey.start.line)
      val = -1
    else if(change.start.line === nodey.start.line && change.start.ch < nodey.start.ch)
      val = -1

    if(change.end.line > nodey.end.line)
    {
      if(val === -1)
        val = 2
      else
        val = 1
    }
    else if(change.end.line === nodey.end.line && change.end.ch > nodey.end.ch)
    {
      if(val === -1)
        val = 2
      else
        val = 1
    }
    return val
  }


  recieve_newVersion(nodey: NodeyCode, updateID: string, jsn: string) : NodeyCode
  {
    if(nodey.pendingUpdate && nodey.pendingUpdate === updateID)
    {
      console.log("Time to resolve", jsn, "with", nodey)
      var dict = JSON.parse(jsn)
      if(dict.literal && nodey.literal)//leaf node
        console.log("MATCH?", this.matchLiterals(dict.literal, nodey.literal))
      else
      {
        var candidateList = nodey.content
        var matches: any[]= []
        console.log("Match?", this.match(dict.content, candidateList, matches))
      }
    }
    return nodey
  }


  match(nodeList : {[key:string]: any}[], candidateList : number[], updates : any[]) : [number, any[]]
  {
    var totalScore = 0
    var canIndex = 0
    var retry = null
    for(var i = 0; i < nodeList.length; i++)
    {
      var matchDone = false
      var node = nodeList[i]

      //first, try to beat a retry match. If new score is worse, concede win to former node
      if(retry)
      {
        var [rematchScore, updatesB] = this.matchNode(node, retry.potentialMatch, updates)
        if(rematchScore < retry.score)
        {
          updates.push("add a new nodey "+JSON.stringify(retry.contenter))
          if(rematchScore === 0)//be greedy and call it a match for this new node
          {
            retry = null
            matchDone = true
            updates = updatesB
          }
          else
            retry = {'contenter': node, 'potentialMatch': retry.potentialMatch, 'score': rematchScore, 'updates': updatesB}
        }
        else
        {
          updates = retry.updates
          updates.push("update the node "+retry.potentialMatch.id+" with "+JSON.stringify(retry.contenter))
          retry = null
        }
      }

      //we haven't yet found a match, so don't move on yet
      if(!matchDone)
      {
        var potentialMatch = this.historyModel.getCodeNodey(candidateList[canIndex])
        var [matchScore, updatesC] = this.matchNode(node, potentialMatch, updates)

        if(retry) //if the current node has 2 possibilities
        {
          if(matchScore < retry.score) // it's a better match
            updates.push("remove a nodey "+retry.potentialMatch.id)

          else // former retry node is a better match
          {
            matchDone = true
            updates = retry.updates
            updates.push("update the node "+retry.potentialMatch.id+" with "+JSON.stringify(node))
          }
          retry = null
        }

        if(!matchDone)
        {
          if(matchScore === 0)//be greedy and call it a match
          {
            canIndex ++ //okay good, go to the next candidate we need to match
            updates = updatesC
          }

          else // match is not perfect
          {
            retry = {'contenter': node, 'potentialMatch': potentialMatch, 'score': matchScore, 'updates': updatesC}
            canIndex ++
          }
        }
      }
    }

    return [totalScore, updates]
  }


  matchNode(node : {[key:string]: any}, potentialMatch : NodeyCode, updates : any[]) : [number, any[]]
  {
    if(node.literal && potentialMatch.literal) //leaf nodes
      return [this.matchLiterals(node.literal+"", potentialMatch.literal+""), updates]
    else
      return this.match(node.content, potentialMatch.content, updates)
  }


  matchLiterals(val1 : string, val2 : string) : number
  {
    return levenshtein.get(val1, val2)
  }

}
