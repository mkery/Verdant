DESIGN NOTES

--- reconsider model. maybe cells, output, and snippets should be their own category, also current getNodey is very error prone, so maybe put the type of nodey in the lookup name.

--- get mixins working UI

- start on search, designing what that should look like
  - for now mvp, search should return samples of unique artifacts that match the search

* star nodes are moving to node history. they should never be added to the main data store since they should never be saved to file

- re-address relationship between history, NotebookListen, notebook Nodey. Ideally notebook nodey should be the only one with a link to the notebook listen

- re-address storage. now store is modularized out, which is good. how can we improve performance so that it's not all in memory all the time

- re-address file switching. does each file have its own history module? need to handle switching between 2 notebooks or more. this is going to make the storage thing trickier

- re-address output relationship

* star state

- once a node is identified as edited, its new version is in star state
- Star<T extends Nodey> where Star is a wrapper for error prevention purposes
- the history store's NodeHistory is responsible for telling if it's content is in star state or not. This should be sure to keep the star'd nodes separate from the node store so it does not get contaminated.
- a nodey itself should never know if it's in star state or not. so to un-star a nodey just involves unboxing it from the Star wrapper
