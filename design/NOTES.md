DESIGN NOTES

--- get mixins working UI

- re-address storage. now store is modularized out, which is good. how can we improve performance so that it's not all in memory all the time

* re-address output relationship

- address nodes moving between different cells
  - copy : a node is duplicated meaning it has a common history with another node, meaning we need some way of forming pointers between separate histories
  - paste : same needs as copy
  - split cells : need to detect, and then split histories
  - undo : need to detect when a cell event is undid, such as a deleted cell coming back or a cell rewinding to a prior state
  - copy cell: need to account for entire cells being copy/pasted with Jupyter's build in commands
