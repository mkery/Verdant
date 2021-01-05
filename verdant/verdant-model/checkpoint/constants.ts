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

export type CellRunData = {
  cell: string;
  changeType: ChangeType;
  output?: string[];
  index?: number;
};
