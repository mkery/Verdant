import { verdantState } from "./state";
import { History } from "../../lilgit/history/";
import { VerCell } from "../../lilgit/cell";
import { INIT_EVENT_MAP, UPDATE_CHECKPOINT } from "./viewStates/events";

const FOCUS_CELL = "FOCUS_CELL";

export const focusCell = (cell_index: number) => {
  return {
    type: FOCUS_CELL,
    cell_index,
  };
};

export type artifactState = {
  name: string;
  ver: number;
  outputVer?: number;
  file?: string;
};

export type notebookState = {
  focusedCell: number;
  cellArtifacts: artifactState[];
  notebookArtifact: artifactState;
};

export const notebookStateInitialState = (): notebookState => {
  return {
    focusedCell: null,
    cellArtifacts: [],
    notebookArtifact: null,
  };
};

export const notebookReducer = (
  state: verdantState,
  action: any
): verdantState => {
  switch (action.type) {
    case FOCUS_CELL:
      return { ...state, focusedCell: action.cell_index };
    case INIT_EVENT_MAP:
    case UPDATE_CHECKPOINT:
      // both of these cases require an update of notebook as well as event view
      return {
        ...state,
        cellArtifacts: _cellReducer(state.getHistory()),
        notebookArtifact: _notebookReducer(state.getHistory()),
      };
    default:
      return state;
  }
};

function _cellReducer(history: History): artifactState[] {
  return history.notebook.cells.map((cell: VerCell) => {
    let name = cell.model.name;
    let outputVer = 0;
    if (cell.output) {
      let latestOut = history.store.getLatestOf(cell.output);
      outputVer = parseInt(latestOut.version);
    }
    let ver = cell.model.version;

    return { name, ver, outputVer };
  });
}

function _notebookReducer(history: History): artifactState {
  let i = history.notebook.model.version;
  let version = parseInt(i);
  return { name: "", ver: version, file: history.notebook.name };
}
