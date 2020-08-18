import { History } from "../../lilgit/history/";
import { Checkpoint } from "../../lilgit/checkpoint";
import { verdantState } from "./state";
import { artifactState } from "./notebook";
import { VerCell } from "../../lilgit/cell";

const ADD_EVENT = "ADD_EVENT";
const INIT_EVENT_MAP = "INIT_EVENT_MAP";
const UPDATE_CHECKPOINT = "UPDATE_CHECKPOINT";
const DATE_EXPAND = "DATE_EXPAND";
const SAVE_BUNDLES = "SAVE_BUNDLES";
const BUNDLE_EXPAND = "BUNDLE_EXPAND";

export const initEventMap = () => ({
  type: INIT_EVENT_MAP,
});

export const addEvent = (ev: Checkpoint) => ({
  type: ADD_EVENT,
  event: ev,
});

export const updateCheckpoint = (event: Checkpoint) => {
  return {
    type: UPDATE_CHECKPOINT,
    currentEvent: event,
  };
};

export const dateOpen = (date: number) => {
  return {
    type: DATE_EXPAND,
    date: date,
    status: true,
  };
};

export const dateClose = (date: number) => {
  return {
    type: DATE_EXPAND,
    date: date,
    status: false,
  };
};

export const saveBundles = (bundles: number[], date: number) => {
  return {
    type: SAVE_BUNDLES,
    date: date,
    bundles: bundles,
  };
};

export const bundleOpen = (date: number, bundle: number) => {
  return {
    type: BUNDLE_EXPAND,
    date: date,
    bundle_id: bundle,
    status: true,
  };
};

export const bundleClose = (date: number, bundle: number) => {
  return {
    type: BUNDLE_EXPAND,
    date: date,
    bundle_id: bundle,
    status: false,
  };
};

export type eventState = {
  notebook: number;
  events: Checkpoint[];
};

export type bundleState = {
  isOpen: boolean;
};

export type dateState = {
  isOpen: boolean;
  date: number;
  events: eventState[];
  bundles: number[][] | null;
  bundleStates: bundleState[];
};

/* main state */
export type eventMapState = {
  dates: dateState[];
  currentEvent: Checkpoint;
};

export const eventsInitialState = (): eventMapState => {
  return { dates: [] as dateState[], currentEvent: null };
};

export const eventReducer = (
  state: verdantState,
  action: any
): verdantState => {
  switch (action.type) {
    case INIT_EVENT_MAP:
      if (state.dates.length < 2)
        return {
          ...state,
          dates: reducer_initEventMap(state),
          currentEvent: getInitialEvent(state.getHistory()),
          cellArtifacts: cellReducer(state.getHistory()),
          notebookArtifact: notebookReducer(state.getHistory()),
        };
      else return state;
    case UPDATE_CHECKPOINT:
      if (action.currentEvent != state.currentEvent) {
        return {
          // update both event map and current event with new event
          ...state,
          currentEvent: action.currentEvent,
          cellArtifacts: cellReducer(state.getHistory()),
          notebookArtifact: notebookReducer(state.getHistory()),
          dates: reducer_addEvent(action.currentEvent, state.dates),
        };
      } else return state;
    case ADD_EVENT:
      return {
        ...state,
        dates: reducer_addEvent(action.ev, [...state.dates]),
      };
    case DATE_EXPAND:
      const updatedElement = {
        ...state.dates[action.date],
        isOpen: action.status,
      };
      return {
        ...state,
        dates: [
          ...state.dates.slice(0, action.date),
          updatedElement,
          ...state.dates.slice(action.date + 1),
        ],
      };
    case SAVE_BUNDLES:
      const updatedBundles = {
        ...state.dates[action.date],
        bundles: action.bundles,
      };
      return {
        ...state,
        dates: [
          ...state.dates.slice(0, action.date),
          updatedBundles,
          ...state.dates.slice(action.date + 1),
        ],
      };
    case BUNDLE_EXPAND:
      const bundleStates = state.dates[action.date].bundleStates;
      bundleStates[action.bundle_id].isOpen = action.status;
      const updatedBundleDate = {
        ...state.dates[action.date],
        bundleStates: bundleStates,
      };
      return {
        ...state,
        dates: [
          ...state.dates.slice(0, action.date),
          updatedBundleDate,
          ...state.dates.slice(action.date + 1),
        ],
      };
    default:
      return state;
  }
};

export function reducer_addEvent(
  event: Checkpoint,
  dates: dateState[]
): dateState[] {
  let time = event.timestamp;
  let date = dates[dates.length - 1];
  if (!date || !Checkpoint.sameDay(time, date.date)) {
    // new date
    let newEvent: eventState = { notebook: event.notebook, events: [event] };
    let newDate: dateState = {
      isOpen: true,
      date: time,
      events: [newEvent],
      bundles: null,
      bundleStates: [{ isOpen: false }],
    };
    dates.push(newDate);
  } else {
    // existing date
    let lastEvent: eventState = date.events[date.events.length - 1];
    // existing notebook for this date
    if (lastEvent && lastEvent.notebook === event.notebook) {
      lastEvent.events.push(event);
    } else {
      // new notebook for this date
      let newEvent: eventState = {
        notebook: event.notebook,
        events: [event],
      };
      date.events.push(newEvent);
      // keep bundleStates as long as event list
      date.bundleStates.push({ isOpen: false });
    }
  }
  return dates;
}

function reducer_initEventMap(state: verdantState) {
  let dates = [] as dateState[];
  state
    .getHistory()
    .checkpoints.all()
    .forEach((event) => reducer_addEvent(event, dates));
  // Set all dates to closed except the most recent
  return dates.map((x, i) => {
    x.bundleStates.map((b) => (b.isOpen = false));
    return { ...x, isOpen: i == dates.length - 1 };
  });
}

function cellReducer(history: History): artifactState[] {
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

function notebookReducer(history: History): artifactState {
  let i = history.notebook.model.version;
  let version = parseInt(i);
  return { name: "", ver: version, file: history.notebook.name };
}

function getInitialEvent(history: History): Checkpoint {
  let checkpoints = history.checkpoints.all();
  return checkpoints[checkpoints.length - 1];
}
