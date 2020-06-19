import { verdantState } from "./index";
import { Ghost } from "../ghost-book/ghost";
import { CheckpointType, Checkpoint } from "../../lilgit/model/checkpoint";
import { NodeyCode } from "../../lilgit/model/nodey";
import { History } from "../../lilgit/model/history";

const SET_GHOST_OPENER = "SET_GHOST_OPENER";
const INIT_GHOSTBOOK = "INIT_GHOSTBOOK";
const SWITCH_NOTEBOOK = "SWITCH_NOTEBOOK";
const TOGGLE_SHOW_CELLS = "TOGGLE_SHOW_CELLS";
const SWITCH_CELL = "SWITCH_CELL";

export enum CELL_TYPE {
  /* types of cells in ghost notebook main cell list */
  CODE,
  MARKDOWN,
  NONE
}

export const setGhostOpener = (fun: (notebook: number) => Ghost) => {
  return {
    type: SET_GHOST_OPENER,
    fun,
  };
};

export const initGhostBook = (state: Partial<ghostState>) => {
  return {
    type: INIT_GHOSTBOOK,
    state,
  };
};

export const closeGhostBook = () => {
  return {
    type: SWITCH_NOTEBOOK,
    ver: null as string,
  };
};

export const toggleShowAllCells = () => {
  return {
    type: TOGGLE_SHOW_CELLS,
  };
};

export const focusCell = (cell_name: string) => {
  return {
    type: SWITCH_CELL,
    cell: cell_name,
  };
};

export type ghostState = {
  openGhostBook: (notebook: number) => Ghost;
  notebook_ver: number;
  ghostCells: Map<string, ghostCellState>;
  ghostCellOutputs: Map<string, ghostCellOutputState>;
  active_cell: string;
  show_all_cells: boolean;
  link_artifact: (n: string) => void;
  changeGhostTitle: (n: number) => void;
};

export const ghostInitialState = (): ghostState => {
  return {
    openGhostBook: null,
    notebook_ver: -1,
    ghostCells: new Map(),
    ghostCellOutputs: new Map(),
    active_cell: null,
    show_all_cells: true,
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

export type ghostCellState = {
  name: string;
  type: CELL_TYPE;
  index: number;
  events: Checkpoint[];
  output: string;
  sample: string;
};

export type ghostCellOutputState = {
  name: string;
  events: Checkpoint[];
  sample: string;
};

export const ghostReduce = (state: verdantState, action: any): ghostState => {
  switch (action.type) {
    case SET_GHOST_OPENER:
      return { ...state, openGhostBook: action.fun };
    case INIT_GHOSTBOOK:
      let present = { ...state };
      for (let key in action.state) present[key] = action.state[key];
      [present.ghostCells, present.ghostCellOutputs] = loadCells(state.getHistory(), present.notebook_ver);
      return present;
    case TOGGLE_SHOW_CELLS:
      return {
        ...state,
        show_all_cells: !state.show_all_cells,
      };
    case SWITCH_CELL:
      if (state.active_cell != action.cell)
        return {
          ...state,
          active_cell: action.cell,
        };
      else return state;
    default:
      return state;
  }
};



function loadCells(history: History, ver: number) {
  // Load notebook and events
  let notebook = history.store.getNotebook(ver);
  let events = history.checkpoints.getByNotebook(ver);

  // Type of cells after loading from notebook.cells
  type cellDat = {
    cell: string;
    index?: number;
    events?: Checkpoint[];
    output?: string;
  };

  let cells: cellDat[] = notebook.cells.map((item) => ({
    cell: item,
    events: [],
  }));

  let deletedCells: cellDat[] = [];

  // For each event, update list of events matching target cells
  events.forEach((ev) => {
    ev.targetCells.forEach((cell) => {
      let index = notebook.cells.indexOf(cell.node);
      if (index < 0 && ev.checkpointType === CheckpointType.DELETE) {
        // Add new deleted cell with the event.
        // If a cell cannot be deleted multiple times per notebook version,
        // it should be fine to simply add a new deleted cell each time.
        deletedCells.push({
          cell: cell.node,
          index: cell.index,
          events: [ev],
        });
      } else cells[index].events.push(ev);
    });
  });

  // Put deleted cells in the cells list with proper indexing
  deletedCells.forEach((item) => {
    cells.splice(item.index, 0, item);
  });

  // Compute output cells
  let output: cellDat[] = [];
  cells.forEach((cell) => {
    let nodey = history.store.get(cell.cell);
    if (nodey instanceof NodeyCode && nodey.output) {
      let out = { cell: nodey.output };
      output.push(out);
      cell.output = nodey.output;
    } else {
      cell.output = null;
    }
  });

  // Add cells to cell map
  const loadedCells = new Map();
  cells.forEach((cell, index) => {
    loadedCells.set(cell.cell, {
      name: cell.cell,
      type: getCellType(cell.cell),
      index: index,
      events: cell.events,
      sample: "",
      output: cell.output
    })
  });

  // Add output to output map
  const loadedOutput = new Map();
  output.forEach((cell, index) => {
    loadedOutput.set(cell.cell, {
      name: cell.cell,
      events: cell.events,
      sample: ""
    })
  });

  return [loadedCells, loadedOutput];
}

function getCellType(name: string): CELL_TYPE {
  /* Computes cell type from a cell name */
  if (name.includes("c")) return CELL_TYPE.CODE;
  if (name.includes("m")) return CELL_TYPE.MARKDOWN;

  // Default for error handling
  return CELL_TYPE.NONE;
}