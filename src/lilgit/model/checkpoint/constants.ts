// made verbose for log readability
export enum ChangeType {
  CHANGED = "edited",
  REMOVED = "removed",
  ADDED = "added",
  SAME = "no change",
  MOVED = "moved",
  NONE = "n/a",
  TYPE_CHANGED = "type changed",
}

// old log format for conversion
export const CONVERT_ChangeType = (num) => {
  const convert = {
    2: ChangeType.CHANGED,
    1.5: ChangeType.REMOVED,
    1: ChangeType.ADDED,
    0: ChangeType.SAME,
    3: ChangeType.MOVED,
    4: ChangeType.NONE,
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
  node: string;
  changeType: ChangeType;
  newOutput?: string[];
  index?: number;
};
