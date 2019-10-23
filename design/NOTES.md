DESIGN NOTES

--- get mixins working UI

- re-address storage. now store is modularized out, which is good. how can we improve performance so that it's not all in memory all the time

* re-address output relationship

- address nodes moving between different cells
  - copy / past of code:
    - this is going to be harder, because we need to update our resolve code to take in account the snippets we know came from somewhere else in order to make sure those ties get recorded
  - split cells : need to detect, and then split histories
    - splitting cells should probably be a notebook event class unless it fires as an add new cell or something
  - undo : need to detect when a cell event is undid, such as a deleted cell coming back or a cell rewinding to a prior state
    - undo cell events would be a lot easier to start with
  - copy cell: need to account for entire cells being copy/pasted with Jupyter's build in commands
    - copy/paste cell may be a lot easier to start with, if we have some access to Jupyter's clipboard API
- we need to detect when a node is pasted
- we need to be able to keep track of... does the pasted node actually make it to a new version, or is it deleted or changed to much along the way that the origin tie isn't valid? since we're not saving the instant it's pasted a lot could happen before the next save
- one way to do this is to make some new construct, and use code mirror's markers to keep track of the pasted node. Hate to rely on code mirror, but that may allow us to keep track of whether the code is deleted?
- reasonably, we should keep the origin information if the node is mostly the same as when it was pasted in
