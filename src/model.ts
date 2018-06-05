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
  private _nodeyStore : Nodey[] = []


  set notebook(notebook : NotebookListen)
  {
    this._notebook = notebook
  }


  dispenseNodeyID(): number{
    var id = this._nodeyCounter
    this._nodeyCounter ++
    return id
  }


  getCodeNodey(id: number) : NodeyCode { //TODO seperate list for markdown and output
    return <NodeyCode> this._nodeyStore[id]
  }


  registerNodey(nodey : Nodey) :void{
    this._nodeyStore[nodey.id] = nodey
  }


  toJSON() : serialized_Nodey[]
  {
    return this._nodeyStore.map( (item : Nodey) => {
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
