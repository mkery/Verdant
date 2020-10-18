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
  cells: Map<string, CellRunData>;
  cellOutputs: Map<string, ghostCellOutputState>;
  active_cell: string;
  scroll_focus: string;
  diff: DIFF_TYPE;
  link_artifact: (n: string) => void;
  changeGhostTitle: (n: number) => void;
};

export const ghostInitialState = (): ghostState => {
  return {
    notebook_ver: -1,
    cells: new Map(),
    cellOutputs: new Map(),
    active_cell: null,
    scroll_focus: null,
    diff: DIFF_TYPE.CHANGE_DIFF,
    link_artifact: null,
    changeGhostTitle: null,
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

function loadCells(history: History, ver: number, diff: DIFF_TYPE) {
  // TODO: Have method to display deleted cells when diffPresent
  // Load notebook and events
  let notebook: NodeyNotebook, events: Checkpoint[];
  if (diff === DIFF_TYPE.PRESENT_DIFF) {
    notebook = history.store.currentNotebook;
    events = [];
  } else {
    notebook = history.store.getNotebook(ver);
    events = history.checkpoints.getByNotebook(ver);
  }

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
    cells.splice(item.index, 0, item);
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
      cell.output = null;
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
  const loadedCells = new Map<string, CellRunData>();
  cells.forEach((cell, index) => {
    loadedCells.set(cell.cell, {
      index: index,
      ...cell,
    });
  });

  // Add output to output map
  const loadedOutput = new Map<string, ghostCellOutputState>();
  output.forEach((cell) => loadedOutput.set(cell.name, cell));

  return [loadedCells, loadedOutput];
}
