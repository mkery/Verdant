// made verbose for log readability
export enum ChangeType {
  CHANGED = "edited",
  REMOVED = "removed",
  ADDED = "added",
  MOVED = "moved",
  NONE = "none",
  OUTPUT_CHANGED = "output changed",
  TYPE_CHANGED = "type changed",
}

const changeVal = {
  none: 0,
  "type changed": 1,
  moved: 1,
  edited: 2,
  "output changed": 2,
  added: 3,
  removed: 4,
};
export const GREATER_CHANGETYPE = (a: ChangeType, b: ChangeType) =>
  changeVal[a] > changeVal[b] ? a : b;

// old log format for conversion
export const CONVERT_ChangeType = (num) => {
  const convert = {
    2: ChangeType.CHANGED,
    1.5: ChangeType.REMOVED,
    1: ChangeType.ADDED,
    3: ChangeType.MOVED,
    4: ChangeType.OUTPUT_CHANGED,
  };
  return convert[num];
};

// made verbose for log readability
export enum CheckpointType {
  RUN = "run",
  SAVE = "notebook saved",
  LOAD = "notebook loaded",
  ADD = "cell added",
  DELETE = "cell deleted",
  MOVED = "cell moved",
  SWITCH_CELL_TYPE = "cell type changed",
}

export type CellRunData = {
  cell: string;
  changeType: ChangeType;
  output?: string[];
  index?: number;
};
