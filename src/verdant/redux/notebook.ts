import { verdantState } from "./state";

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
    default:
      return state;
  }
};
