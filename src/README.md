# What's what: 

- ## index.ts 
  main of the JupyterLabPlugin where the extension starts
  - (TODO) listens to switches between notebooks and non-notebooks in Jupyterlab. 
  When the user opens up a notebook, Verdant has a model specific to that notebook. 
  Verdant will be inactive when the user is not looking at a ipython notebook, and will respond by opening up its correct notebook model
  when they open up a ipython notebook.

## The history data model:
- ### nodey.ts
  - object representing content at a single point in history. Python's own libraries has a ASTNode, so Verdant nodes are called `nodey` to disambiguiate. Plus it's cuter.
- ### model.ts
  - central list of all `Nodey` in a user's notebook. Since `Nodey` can move around cells and be copy/pasted over history, 
  it is simpler to avoid putting them in a cell-based hierchy and just put all `Nodey` in a central list
  - responsible for writing data to file and (TODO) opening data file

## A bunch of hooks into the Jupyterlab environement:
- ### notebook-listen.ts
  - (TODO) listens for cells being added, removed, or focused in the user's notebook, updates model accordingly
  - (TODO) does not yet work for any cells that aren't code cells. Must also work for markdown
  - contains a list of `CellListen`, one per each cell present in the notebook

- ### cell-listen.ts
  - Listens such that whenever the user does a text edit on their code cells, the model knows to update
  
- ### kernel-listen.ts
  - Holds the kernel and session instance for the active notebook and updates the kernel variable if it changes or restarts
  - executes arbitrary code on behalf of Verdant
  
## The front end:
Everything in the `widgets` folder (TODO still designing, not building just yet) 

## Abstract Syntaxt Tree (AST) fun:
  - ### ast-generate.ts
    - uses Python to parse user's code into an abstract syntax tree and then convert that abstract syntax tree into `Nodey` data of the form Verdant needs
  - ### ast-resolve.ts
    - given a before and after (eg. user makes a text edit or loads in the file) tries to figure out what exact changes to update in the central `Nodey` model
    - (TODO lots of TODO)
