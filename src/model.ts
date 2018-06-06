import{
  Nodey, NodeyCode, serialized_Nodey
} from './nodey'

import {
  PathExt
} from '@jupyterlab/coreutils';

import {
   NotebookListen
} from './notebook-listen';

import {
  Contents, ContentsManager
} from '@jupyterlab/services'

export
class Model
{

  constructor(startCount: number = 0)
  {
    this._nodeyCounter = startCount
  }

  private _notebook : NotebookListen
  private _nodeyCounter = 0
  private _nodeyStore : NodeyVersionList[] = []


  set notebook(notebook : NotebookListen)
  {
    this._notebook = notebook
  }


  dispenseNodeyID(): number{
    var id = this._nodeyCounter
    this._nodeyCounter ++
    return id
  }


  getCodeNodey(name: string) : NodeyCode { //TODO seperate list for markdown and output
    var [id, ver] = name.split('.')
    return <NodeyCode> this._nodeyStore[parseInt(id)].getNodey(ver)
  }


  starNodey(changes : ((x:Nodey)=>void)[], nodey : Nodey) // if a Node is in star state, it's got changes that have not been commited
  {
    this._nodeyStore[nodey.id].starNodey(changes, nodey)
  }

  registerNodey(nodey : Nodey) : number
  {
    this._nodeyStore[nodey.id] = new NodeyVersionList(this, nodey.id)
    var version = this._nodeyStore[nodey.id].addNodey(nodey)
    return version
  }


  toJSON() : serialized_NodeyList[]
  {
    return this._nodeyStore.map( (item : NodeyVersionList) => {
      if(item)
        return item.toJSON()
    })
  }


  dump() : void //for debugging only
  {
    console.log(this._nodeyStore)
  }


  writeToFile() : Promise<void>
  {
    return new Promise((accept, reject) => {
      var notebookPath = this._notebook.path
      //console.log("notebook path is", notebookPath)
      var name = PathExt.basename(notebookPath)
      name = name.substring(0, name.indexOf('.')) + ".ipyhistory"
      //console.log("name is", name)
      var path = "/" + notebookPath.substring(0, notebookPath.lastIndexOf('/') + 1) + name
      //console.log("goal path is ", path)

      var saveModel = new HistorySaveModel(name, path, "today", "today", JSON.stringify(this.toJSON()))
      //console.log("Model to save is", saveModel)

      let contents = new ContentsManager()
      contents.save(path, saveModel)
      .then((res) => {
        console.log("Model written to file", saveModel)
        accept()
      })
      .catch((rej) => {
        //here when you reject the promise if the filesave fails
        console.error(rej)
        reject()
      })
    })
  }


  loadFromFile() : Promise<void>
  {
    return new Promise((accept, reject) => {
      var notebookPath = this._notebook.path
      //console.log("notebook path is", notebookPath)
      var name = PathExt.basename(notebookPath)
      name = name.substring(0, name.indexOf('.')) + ".ipyhistory"
      //console.log("name is", name)
      var path = "/" + notebookPath.substring(0, notebookPath.lastIndexOf('/') + 1) + name
      let contents = new ContentsManager()
      contents.get(path)
      .then((res) => {
        console.log("Found a model ", res)
        accept()
      })
      .catch((rej) => {
        //here when you reject the promise if the filesave fails
        console.error(rej)
        reject()
      })
    })
  }

}


export
class NodeyVersionList
{
  historyModel :Model

  private _verList : Nodey[]
  private _number : number
  private _starState : Nodey

  constructor(historyModel : Model, index : number)
  {
    this.historyModel = historyModel
    this._verList = []
    this._number = index
  }


  addNodey(nodey : Nodey) : number
  {
    this._verList.push(nodey)
    return this._verList.length - 1
  }


  get history() : Nodey[]
  {
    return this._verList
  }


  getNodey(index : any) : Nodey
  {
    if(index === '*')
      return this._starState

    return this._verList[parseInt(index)]
  }


  starNodey(changes: ((x: Nodey) => void)[] , nodey : Nodey = this._verList[this._verList.length - 1])
  {
    if(!this._starState) //newly entering star state!
    {
      this._starState = nodey.clone()
      this._starState.version = '*'
      if(this._starState.parent) // star all the way up the chain
      {
        var formerName = nodey.id+"."+nodey.version
        var starName = nodey.id+".*"
        var transforms = [(x : NodeyCode) => x.content[x.content.indexOf(formerName)] = starName]
        var parent = this.historyModel.getCodeNodey(this._starState.parent)
        this.historyModel.starNodey(transforms, parent)
      }
    }
    changes.forEach( (fun: (x: Nodey) => void) => fun(this._starState))
  }


  toJSON() : serialized_NodeyList
  {
    var versions = this._verList.map(item => item.toJSON())
    var jsn : serialized_NodeyList = {'nodey': this._number, 'versions': versions}
    return jsn
  }
}


export
interface serialized_NodeyList {
    nodey: number,
    versions: serialized_Nodey[]
}


export
class HistorySaveModel implements Contents.IModel
{
  readonly type: Contents.ContentType = 'file'
  readonly writable: boolean = true
  readonly mimetype: string = 'application/json'
  readonly format: Contents.FileFormat = 'text'

  readonly name: string
  readonly path: string
  readonly created: string
  readonly last_modified: string
  readonly content: any

  constructor(name: string, path: string, createDate: string, modDate: string, content: any)
  {
    this.name = name
    this.path = path
    this.created = createDate
    this.last_modified = modDate
    this.content = content
  }
}
