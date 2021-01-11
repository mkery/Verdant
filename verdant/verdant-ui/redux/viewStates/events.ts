import { History } from "../../../verdant-model/history";
import { ChangeType, Checkpoint } from "../../../verdant-model/checkpoint";
import { verdantState } from "../state";
import { NodeyNotebook } from "verdant/verdant-model/nodey";

export const INIT_EVENT_MAP = "INIT_EVENT_MAP";
export const UPDATE_CHECKPOINT = "UPDATE_CHECKPOINT";
const ADD_EVENT = "ADD_EVENT";
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
    open: true,
  };
};

export const dateClose = (date: number) => {
  return {
    type: DATE_EXPAND,
    date: date,
    open: false,
  };
};

export const bundleOpen = (date: number, bundle: number) => {
  return {
    type: BUNDLE_EXPAND,
    date: date,
    bundle_id: bundle,
    open: true,
  };
};

export const bundleClose = (date: number, bundle: number) => {
  return {
    type: BUNDLE_EXPAND,
    date: date,
    bundle_id: bundle,
    open: false,
  };
};

export type bundleState = {
  isOpen: boolean;
};

export type dateState = {
  isOpen: boolean;
  date: number;
  events: Checkpoint[];
  bundles: number[][];
  bundleStates: bundleState[];
};

/* main state */
export type eventMapState = {
  ready: boolean;
  dates: dateState[];
  currentEvent: Checkpoint | null;
};

export const eventsInitialState = (): eventMapState => {
  return { ready: false, dates: [] as dateState[], currentEvent: null };
};

export const eventReducer = (
  state: verdantState,
  action: any
): eventMapState => {
  const eventView = state.eventView;
  switch (action.type) {
    case INIT_EVENT_MAP:
      if (eventView.dates.length < 2)
        return {
          dates: reducer_initEventMap(state),
          currentEvent: getInitialEvent(state.getHistory()),
          ready: true,
        };
      else return eventView;
    case UPDATE_CHECKPOINT:
      // TODO check if we need to update the mini map
      if (action.currentEvent != eventView.currentEvent) {
        return {
          // update both event map and current event with new event
          ...eventView,
          currentEvent: action.currentEvent,
          dates: reducer_addEvent(
            action.currentEvent,
            eventView.dates,
            state.getHistory()
          ),
        };
      } else return eventView;
    case ADD_EVENT:
      return {
        ...eventView,
        dates: reducer_addEvent(
          action.ev,
          [...eventView.dates],
          state.getHistory()
        ),
      };
    case DATE_EXPAND:
      const updatedElement = {
        ...eventView.dates[action.date],
        isOpen: action.open,
      };
      if (action.open === true && updatedElement.bundles.length < 1)
        updatedElement.bundles = computeBundles(
          updatedElement.events,
          state.getHistory()
        );
      return {
        ...eventView,
        dates: [
          ...eventView.dates.slice(0, action.date),
          updatedElement,
          ...eventView.dates.slice(action.date + 1),
        ],
      };
    case SAVE_BUNDLES:
      const updatedBundles = {
        ...eventView.dates[action.date],
        bundles: action.bundles,
      };
      return {
        ...eventView,
        dates: [
          ...eventView.dates.slice(0, action.date),
          updatedBundles,
          ...eventView.dates.slice(action.date + 1),
        ],
      };
    case BUNDLE_EXPAND:
      const bundleStates = eventView.dates[action.date].bundleStates;
      bundleStates[action.bundle_id].isOpen = action.open;
      const updatedBundleDate = {
        ...eventView.dates[action.date],
        bundleStates: bundleStates,
      };
      return {
        ...eventView,
        dates: [
          ...eventView.dates.slice(0, action.date),
          updatedBundleDate,
          ...eventView.dates.slice(action.date + 1),
        ],
      };
    default:
      return eventView;
  }
};

export function reducer_addEvent(
  newEvent: Checkpoint,
  dates: dateState[],
  history: History
): dateState[] {
  let time = newEvent.timestamp;
  let currentDate = dates[dates.length - 1];
  if (!currentDate || !Checkpoint.sameDay(time, currentDate.date)) {
    // new date
    let today = Date.now();
    let newDate: dateState = {
      isOpen: Checkpoint.sameDay(today, time), // only open by default if today's date
      date: time,
      events: [newEvent],
      bundles: [[0]], // initial bundle contains just the 1 existing event
      bundleStates: [{ isOpen: false }],
    };
    dates.push(newDate);
  } else {
    currentDate.events.push(newEvent);
    // keep bundleStates as long as event list
    currentDate.bundleStates.push({ isOpen: false });

    // update bundles
    if (currentDate.isOpen) {
      currentDate.bundles = computeBundles(currentDate.events, history); // TODO massively inefficient :(
    }
  }

  return dates;
}

function reducer_initEventMap(state: verdantState) {
  let dates = [] as dateState[];
  state
    .getHistory()
    .checkpoints.all()
    .forEach((event) => reducer_addEvent(event, dates, state.getHistory()));

  // Set all dates to closed except the most recent
  dates.forEach((d) => (d.isOpen = false));

  // initialize the most recent event
  dates[dates.length - 1].isOpen = true;
  dates[dates.length - 1].bundles = computeBundles(
    dates[dates.length - 1].events,
    state.getHistory()
  );

  return dates;
}

function getInitialEvent(history: History): Checkpoint {
  let checkpoints = history.checkpoints.all();
  return checkpoints[checkpoints.length - 1];
}

type accumulatorObject = {
  bundles: number[][]; // Holds partially constructed bundle output
  timeBound: number; // Lower limit on time for inclusion in latest bundle
  changeByCell: { [cell: string]: ChangeType } | null; // Type of current bundle or null if no prev bundle
  cellOrder: string[];
};
const INTERVAL_WIDTH = 300000; // Max bundle time interval in milliseconds

function computeBundles(events: Checkpoint[], history: History): number[][] {
  /* Helper method for makeBundles.
     Computes list of bundled indices based on timestamp, ordered such that
     flattening the outer list leads to a reversed list of the indices of
     this.props.events */

  let initial: accumulatorObject = {
    bundles: [],
    timeBound: Infinity,
    changeByCell: {},
    cellOrder: [],
  };

  let result: accumulatorObject = events.reduceRight(
    (accObj, event, index) => bundle(accObj, event, index, history),
    initial
  );
  return result.bundles;
}

function bundle(
  accObj: accumulatorObject,
  e: Checkpoint,
  idx: number,
  history: History
): accumulatorObject {
  /* Helper method for computeBundles.
     Function to use in reducing over bundles in computeBundles. */
  // Compute properties of current element
  let timeStamp = e.timestamp;
  let newEventTypes = getEventTypes(e);
  let newNotebook = history?.store?.getNotebook(e.notebook);
  let newCellOrder = getCellOrder(newNotebook, e);

  /*
   * CONDITIONS TO BUNDLE EVENTS
   * 1. occur within the same time bound
   * 2. notebooks A and B don't have conflicting cells at the same index
   * 3. no events have conflicting events for the same cell
   */

  // 1. occur within the same time bound
  if (timeStamp > accObj.timeBound) {
    //2. notebooks A and B don't have conflicting cells at the same index
    let zippedCells = zipCellOrder(newCellOrder, accObj.cellOrder);
    if (zippedCells) {
      // 3. no events have conflicting events for the same cell
      let zippedEvents = zipEventTypes(newEventTypes, accObj.changeByCell);
      if (zippedEvents) {
        // add event to current bundle
        accObj.bundles[accObj.bundles.length - 1].push(idx);
        return {
          bundles: accObj.bundles,
          timeBound: accObj.timeBound,
          changeByCell: zippedEvents,
          cellOrder: zippedCells,
        };
      }
    }
  }

  // create new bundle if one or more conditions fail
  return {
    bundles: accObj.bundles.concat([[idx]]),
    timeBound: timeStamp - INTERVAL_WIDTH,
    changeByCell: newEventTypes,
    cellOrder: newCellOrder,
  };
}

function getEventTypes(e: Checkpoint): { [key: string]: ChangeType } {
  let newEventTypes: { [key: string]: ChangeType } = {};
  e.targetCells.forEach((cell) => (newEventTypes[cell.cell] = cell.changeType));
  return newEventTypes;
}

function zipEventTypes(
  A: { [key: string]: ChangeType },
  B: { [key: string]: ChangeType }
): { [key: string]: ChangeType } | null {
  let keys_A = Object.keys(A);
  let keys_B = Object.keys(B);

  // get the simplified artifact name of each cell version
  let art_A = keys_A.map((cell) =>
    cell?.substr(0, cell.lastIndexOf(".") || cell.length)
  );
  let art_B = keys_B.map((cell) =>
    cell?.substr(0, cell.lastIndexOf(".") || cell.length)
  );

  // first check if any conflicting changes on the same
  // artifact
  let zipped = {};
  let compatible = art_A.every((art, index) => {
    let index_b = art_B.indexOf(art);

    if (index_b > -1) {
      if (B[keys_B[index_b]] === A[keys_A[index]]) {
        return true;
      }
      return false;
    } else {
      zipped[keys_A[index]] = A[keys_A[index]];
      return true;
    }
  });

  if (compatible) {
    keys_B.forEach((cell) => (zipped[cell] = B[cell]));
  } else {
    zipped = null;
  }

  return zipped;
}

function zipCellOrder(A: string[], B: string[]) {
  let smaller = B;
  let larger = A;
  if (A.length < B.length) {
    smaller = A;
    larger = B;
  }

  let zipped = A;
  let compatible = smaller.every((cell, index) => cell === larger[index]);
  if (compatible && larger.length > smaller.length) {
    zipped = zipped.concat(larger.slice(smaller.length));
  }

  return compatible ? zipped : null;
}

function getCellOrder(notebook: NodeyNotebook, e: Checkpoint) {
  if (!notebook) return []; // error state
  let order = notebook?.cells?.map((cell) => {
    let name = cell.substr(0, cell.lastIndexOf(".") || cell.length);
    return name;
  });

  // add in removed cells too
  e.targetCells.forEach((cell) => {
    if (cell.index !== undefined) {
      let name = cell.cell;
      name = name?.substr(0, name.lastIndexOf(".") || name.length);
      if (order.length > cell.index) {
        order.splice(cell.index, 0, name);
      } else order[cell.index] = name;
    }
  });

  return order;
}
