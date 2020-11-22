import { verdantState } from "../state";
import {
  ChangeType,
  Checkpoint,
  CheckpointType,
  CellRunData,
  GREATER_CHANGETYPE,
} from "../../../lilgit/checkpoint";
import { NodeyCode, NodeyNotebook } from "../../../lilgit/nodey";
import { History } from "../../../lilgit/history";
import { DIFF_TYPE } from "../../../lilgit/sampler";

const INIT_GHOSTBOOK = "INIT_GHOSTBOOK";
const SWITCH_GHOST_CELL = "SWITCH_GHOST_CELL";
const SCROLL_TO_CELL = "SCROLL_TO_CELL";
const CHANGE_DIFF_TYPE = "CHANGE_DIFF_TYPE";
const CLOSE_GHOSTBOOK = "CLOSE_GHOSTBOOK";

export const initGhostBook = (state: Partial<ghostState>) => {
  return {
    type: INIT_GHOSTBOOK,
    state,
  };
};

export const closeGhostBook = () => {
  return {
    type: CLOSE_GHOSTBOOK,
  };
};

export const focusGhostCell = (cell_name: string) => {
  return {
    type: SWITCH_GHOST_CELL,
    cell: cell_name,
  };
};

export const scrollToGhostCell = (cell_name: string) => {
  return {
    type: SCROLL_TO_CELL,
    cell: cell_name,
  };
};

export const changeDiffType = (diff: DIFF_TYPE) => {
  return {
    type: CHANGE_DIFF_TYPE,
    diff,
  };
};

export type ghostState = {
  notebook_ver: number;
  cells: { [name: string]: CellRunData };
  cellOutputs: { [name: string]: ghostCellOutputState };
  active_cell: string | undefined;
  scroll_focus: string | undefined;
  diff: DIFF_TYPE;
  link_artifact: ((n: string) => void) | undefined;
  changeGhostTitle: ((n: number) => void) | undefined;
};

export const ghostInitialState = (): ghostState => {
  return {
    notebook_ver: -1,
    cells: {},
    cellOutputs: {},
    active_cell: undefined,
    scroll_focus: undefined,
    diff: DIFF_TYPE.CHANGE_DIFF,
    link_artifact: undefined,
    changeGhostTitle: undefined,
  };
};

export type cellEffect =
  | "ADDED"
  | "DELETED"
  | "MOVED"
  | "NEW_OUTPUT"
  | "EDITED";

export type ghostCellOutputState = {
  name: string;
  events: Checkpoint[];
};

export const ghostReduce = (state: verdantState, action: any): ghostState => {
  const ghost = state.ghostBook;
  switch (action.type) {
    case INIT_GHOSTBOOK: {
      let present = { ...ghost, ...action.state };
      [present.cells, present.cellOutputs] = loadCells(
        state.getHistory(),
        present.notebook_ver,
        present.diff
      );
      return present;
    }
    case CLOSE_GHOSTBOOK:
      return { ...ghost, notebook_ver: -1 };
    case SWITCH_GHOST_CELL:
      return {
        ...ghost,
        active_cell: action.cell,
      };
    case SCROLL_TO_CELL:
      return { ...ghost, scroll_focus: action.cell, active_cell: action.cell };
    case CHANGE_DIFF_TYPE:
      return { ...ghost, diff: action.diff };
    default:
      return ghost;
  }
};

function loadCells(
  history: History,
  ver: number,
  diff: DIFF_TYPE
): [{ [name: string]: CellRunData }, { [name: string]: ghostCellOutputState }] {
  // TODO: Have method to display deleted cells when diffPresent
  // Load notebook and events
  let notebook: NodeyNotebook | undefined;
  let events: Checkpoint[] = [];
  if (diff === DIFF_TYPE.PRESENT_DIFF) {
    notebook = history.store.currentNotebook;
    events = [];
    if (!notebook) {
      console.error(
        "history.store.currentNotebook is missing. Unable to diff from current"
      );
      diff = DIFF_TYPE.NO_DIFF;
    }
  }

  if (diff !== DIFF_TYPE.PRESENT_DIFF) {
    notebook = history.store.getNotebook(ver);
    events = history.checkpoints.getByNotebook(ver);
  }

  if (notebook !== undefined) {
    let cells: CellRunData[] = notebook.cells.map((item) => ({
      cell: item,
      changeType: ChangeType.NONE,
    }));

    let deletedCells: CellRunData[] = [];

    // For each event, update list of events matching target cells
    events.forEach((ev) => {
      ev.targetCells.forEach((cell) => {
        let index = notebook.cells.indexOf(cell.cell);
        if (index < 0 && ev.checkpointType === CheckpointType.DELETE) {
          // Add new deleted cell with the event.
          // If a cell cannot be deleted multiple times per notebook version,
          // it should be fine to simply add a new deleted cell each time.
          deletedCells.push({
            cell: cell.cell,
            index: cell.index,
            changeType: cell.changeType,
          });
        } else {
          cells[index].changeType = GREATER_CHANGETYPE(
            cells[index].changeType,
            cell.changeType
          );
        }
      });
    });
    // Put deleted cells in the cells list with proper indexing
    deletedCells.forEach((item) => {
      if (item?.index) cells.splice(item.index, 0, item);
    });

    // Compute output cells
    let output: ghostCellOutputState[] = [];
    cells.forEach((cell) => {
      let nodey = history.store.get(cell.cell);
      if (nodey instanceof NodeyCode) {
        let outHist = history.store.getOutput(nodey);
        if (outHist) {
          let out_nodey = outHist.filter((n) => {
            let notebook = history.store.getNotebookOf(n);
            return notebook && notebook.version <= ver;
          });
          if (out_nodey.length > 0) {
            let out = out_nodey[out_nodey.length - 1].name;
            output.push({ name: out, events: [] });
            cell.output = [out];
          }
        }
      } else {
        cell.output = undefined;
      }
    });

    if (diff === DIFF_TYPE.PRESENT_DIFF) {
      // compute cell to diff against
      // set prior to matching cell in passed version

      // Get current version's cells
      const prior = history.store.getNotebook(ver).cells;
      // Add prior value to each cell
      cells = cells.map((cell) => {
        const cell_id = cell.cell.split(".").slice(0, 2).join(".");

        let priorCell = prior.find(
          (name) => name.split(".").slice(0, 2).join(".") === cell_id
        );

        // Default to first instance of cell
        if (priorCell === undefined) priorCell = `${cell_id}.0`;

        cell.prior = priorCell;
        return cell;
      });
    } else {
      // set prior to previous version of cell
      cells = cells.map((cell) => {
        const prevCell = history.store.getPriorVersion(cell.cell);
        if (!prevCell) {
          cell.prior = `${cell.cell.split(".").slice(0, 2).join(".")}.0`;
        } else {
          cell.prior = prevCell.name;
        }
        return cell;
      });
    }

    // Add cells to cell map
    let loadedCells: { [name: string]: CellRunData } = {};
    cells.forEach((cell, index) => {
      cell.index = index;
      loadedCells[cell.cell] = cell;
    });

    // Add output to output map
    let loadedOutput: { [name: string]: ghostCellOutputState } = {};
    output.forEach((cell) => (loadedOutput[cell.name] = cell));

    return [loadedCells, loadedOutput];
  }
  return [{}, {}]; // error case only
}
