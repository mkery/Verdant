import { History } from "../../../verdant-model/history";
import { Checkpoint } from "../../../verdant-model/checkpoint";
import { verdantState } from "../state";
import { Bundles } from "./event-bundles";

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

export type dateState = {
  isOpen: boolean;
  date: number;
  events: Checkpoint[];
  bundles: Bundles.bundleState[];
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
      } else {
        // check if we need to update the mini map/bundle for currentEvent
        let latestDate = eventView.dates[eventView.dates.length - 1];
        if (latestDate) {
          let latest = latestDate.events.length - 1;
          let bundles = Bundles.updateBundleForEvent(
            latest,
            latestDate.events,
            latestDate.bundles,
            state.getHistory()
          );
          eventView.dates[eventView.dates.length - 1].bundles = bundles;
        }

        return eventView;
      }
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
        updatedElement.bundles = Bundles.computeBundles(
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
      const bundleStates = eventView.dates[action.date].bundles;
      bundleStates[action.bundle_id].isOpen = action.open;
      const updatedDate = {
        ...eventView.dates[action.date],
        bundleStates: bundleStates,
      };
      return {
        ...eventView,
        dates: [
          ...eventView.dates.slice(0, action.date),
          updatedDate,
          ...eventView.dates.slice(action.date + 1),
        ],
      };
    default:
      return eventView;
  }
};

export function reducer_addEvent(
  newEvent: Checkpoint,
  date_list: dateState[],
  history: History
): dateState[] {
  /*
   * first if event is obviously corrupt, ignore it!
   */
  if (
    newEvent.notebook === undefined ||
    newEvent.id === undefined ||
    newEvent.targetCells?.length < 1
  )
    return;

  let time = newEvent.timestamp;
  let currentDate = date_list[date_list.length - 1];
  let date: dateState;
  let idx: number;
  if (!currentDate || !Checkpoint.sameDay(time, currentDate.date)) {
    // new date
    let today = Date.now();
    let newDate: dateState = {
      isOpen: Checkpoint.sameDay(today, time), // only open by default if today's date
      date: time,
      events: [newEvent],
      bundles: [],
    };
    date_list.push(newDate);
    date = newDate;
    idx = 0;
  } else {
    // to avoid duplicates, first verify that this event has not already been added
    let latest = currentDate.events[currentDate.events.length - 1];
    if (latest.id !== newEvent.id) {
      idx = currentDate.events.push(newEvent) - 1;
      date = currentDate;
    }
  }

  // now add newEvent to bundles of the chosen date
  if (date?.isOpen)
    date.bundles = Bundles.bundleEvent(idx, date.events, date.bundles, history);

  return date_list;
}

function reducer_initEventMap(state: verdantState) {
  let dates = [] as dateState[];
  state
    .getHistory()
    .checkpoints.all()
    .forEach((event) => reducer_addEvent(event, dates, state.getHistory()));
  return dates;
}

function getInitialEvent(history: History): Checkpoint {
  let checkpoints = history.checkpoints.all();
  return checkpoints[checkpoints.length - 1];
}
