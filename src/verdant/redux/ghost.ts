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

export const focusCell = (cell_index: number) => {
  return {
    type: SWITCH_CELL,
    cell_index,
  };
};

export const ghostInitialState = (): ghostState => {
  return {
    openGhostBook: null,
    notebook_ver: -1,
    ghostCells: [],
    active_cell: null,
    show_all_cells: true,
    link_artifact: null,
    changeGhostTitle: null,
  };
};

export type ghostState = {
  openGhostBook: (notebook: number) => Ghost;
  notebook_ver: number;
  ghostCells: ghostCellState[];
  active_cell: string;
  show_all_cells: boolean;
  link_artifact: (n: string) => void;
  changeGhostTitle: (n: number) => void;
};

export type cellEffect =
  | "ADDED"
  | "DELETED"
  | "MOVED"
  | "NEW_OUTPUT"
  | "EDITED";

export type ghostCellState = {
  name: string;
  output: number;
  events: Checkpoint[];
  effects: cellEffect[];
};

export const ghostReduce = (state: verdantState, action: any): ghostState => {
  switch (action.type) {
    case SET_GHOST_OPENER:
      return { ...state, openGhostBook: action.fun };
    case INIT_GHOSTBOOK:
      let present = { ...state };
      for (let key in action.state) present[key] = action.state[key];
      present.ghostCells = loadCells(state.getHistory(), present.notebook_ver);
      return present;
    case TOGGLE_SHOW_CELLS:
      return {
        ...state,
        show_all_cells: !state.show_all_cells,
      };
    case SWITCH_CELL:
      let cell = state.ghostCells[action.cell_index].name;
      if (state.active_cell != cell)
        return {
          ...state,
          active_cell: cell,
        };
      else return state;
    default:
      return state;
  }
};

function loadCells(history: History, ver: number): ghostCellState[] {
  let notebook = history.store.getNotebook(ver);
  let events = history.checkpoints.getByNotebook(ver);

  type cellDat = {
    cell: string;
    index?: number;
    events?: Checkpoint[];
    output?: number;
  };

  let cells: cellDat[] = notebook.cells.map((item) => ({
    cell: item,
    events: [],
  }));

  let deletedCells: cellDat[] = [];
  events.forEach((ev) => {
    ev.targetCells.forEach((cell) => {
      let index = notebook.cells.indexOf(cell.node);
      if (index < 0 && ev.checkpointType === CheckpointType.DELETE) {
        deletedCells.push({
          cell: cell.node,
          index: cell.index,
          events: [ev],
        });
      } else cells[index].events.push(ev);
    });
  });

  // to not mess up the other indices
  deletedCells.forEach((item) => {
    cells.splice(item.index, 0, item);
  });

  let output: cellDat[] = [];
  cells.forEach((cell) => {
    let nodey = history.store.get(cell.cell);
    if (nodey instanceof NodeyCode && nodey.output) {
      let out = { cell: nodey.output };
      let index = output.length;
      output.push(out);
      cell.output = index + cells.length;
    }
  });
  cells = cells.concat(output);

  return cells.map((cell) => {
    return {
      name: cell.cell,
      events: cell.events,
      effects: [],
      sample: "",
      output: cell.output,
    };
  });
}
