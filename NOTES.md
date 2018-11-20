DESIGN NOTES

--- get mixins working UI

- start on search, designing what that should look like
  - for now mvp, search should return samples of unique artifacts that match the search

* star nodes are moving to node history. they should never be added to the main data store since they should never be saved to file

- re-address relationship between history, NotebookListen, notebook Nodey. Ideally notebook nodey should be the only one with a link to the notebook listen

- re-address storage. now store is modularized out, which is good. how can we improve performance so that it's not all in memory all the time

- re-address file switching. does each file have its own history module? need to handle switching between 2 notebooks or more. this is going to make the storage thing trickier

- re-address output relationship

- fix ast generate so it's a server extension and not the hacky kernel thing it is now

- eventually the parent of all cell types should be the notebook
