import { NodeyNotebook } from "../nodey";
import { History } from "../history";
import { CellRunData, CONVERT_ChangeType, ChangeType } from "../checkpoint";
import { Checkpoint } from "../checkpoint";

export namespace CellMap {
  export type map = mapCell[];
  type mapCell = { name: string; changes: ChangeType[] };

  function addChange(cell: mapCell, change: ChangeType) {
    if (cell.changes.indexOf(change) < 0) cell.changes.push(change);
    return cell;
  }

  export function build(
    checkpointList: Checkpoint | Checkpoint[],
    history: History
  ): map {
    let cellMap: map = [];
    if (!Array.isArray(checkpointList)) checkpointList = [checkpointList];

    checkpointList.forEach((checkpoint) => {
      let notebook = history.store.getNotebook(
        checkpoint.notebook
      ) as NodeyNotebook;
      let targets = checkpoint.targetCells;
      if (notebook) {
        notebook.cells.forEach((name, index) => {
          // initialize a cell with no changes
          if (!cellMap[index]) cellMap[index] = { name, changes: [] };

          // see if anything happened to this cell at this checkpoint
          let match: CellRunData | undefined = targets.find(
            (item) => item.cell === name
          );
          if (match) {
            let change = match.changeType;

            // convert for older log format
            if (typeof change === "number") change = CONVERT_ChangeType(change);

            // add change to cell's list of changes
            cellMap[index] = addChange(cellMap[index], change);
          }
        });

        // for deleted cells
        targets.forEach((t) => {
          if (t.changeType === ChangeType.REMOVED && t.index)
            cellMap.splice(t.index, 0, {
              name: t.cell,
              changes: [ChangeType.REMOVED],
            });
        });
      }
    });

    return cellMap;
  }
}
