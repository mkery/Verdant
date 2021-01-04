import { verdantState } from "../state";
import { Checkpoint } from "../../../verdant-model/checkpoint";
import { DIFF_TYPE } from "../../../verdant-model/sampler";

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
  active_cell: string | undefined;
  scroll_focus: string | undefined;
  diff: DIFF_TYPE;
  link_artifact: ((n: string) => void) | undefined;
  changeGhostTitle: ((n: number) => void) | undefined;
};

export const ghostInitialState = (): ghostState => {
  return {
    notebook_ver: -1,
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
      return { ...ghost, ...action.state };
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
