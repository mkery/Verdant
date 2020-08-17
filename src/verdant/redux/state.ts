import { History } from "../../lilgit/history";
import { ghostState, ghostReduce, ghostInitialState } from "./ghost";
import { eventMapState, eventReducer, eventsInitialState } from "./events";
import {
  notebookState,
  notebookReducer,
  notebookStateInitialState,
} from "./notebook";
import {
  artifactPaneState,
  artifactPaneInitialState,
  artifactReducer,
} from "./viewStates/artifact-pane";
import {
  searchState,
  searchInitialState,
  searchReducer,
} from "./viewStates/search";
import { Wishbone } from "../panel/details/wishbone";

const SWITCH_TAB = "SWITCH_TAB";

export const switchTab = (name: ActiveTab) => {
  return {
    type: SWITCH_TAB,
    tab: name,
  };
};

export enum ActiveTab {
  Events,
  Artifacts,
  Artifact_Details,
  Search,
}

export type verdantState = {
  getHistory: () => History;
  activeTab: ActiveTab;
} & notebookState &
  ghostState &
  eventMapState &
  artifactPaneState &
  searchState;

export const createInitialState = (getHistory: () => History): verdantState => {
  return {
    getHistory: getHistory,
    activeTab: ActiveTab.Events,
    ...notebookStateInitialState(),
    ...eventsInitialState(),
    ...ghostInitialState(),
    ...artifactPaneInitialState(),
    ...searchInitialState(),
  };
};

export const verdantReducer = (state: verdantState, action: any) => {
  switch (action.type) {
    case SWITCH_TAB:
      if (state.inspectOn) Wishbone.endWishbone(state.getHistory().notebook);
      return { ...state, activeTab: action.tab, inspectOn: false };
    default:
      let state_ev = notebookReducer(state, action);
      let state_ev2 = eventReducer(state_ev, action);
      let state_ev3 = artifactReducer(state_ev2, action);
      let state_ev4 = ghostReduce(state_ev3, action);
      return searchReducer(state_ev4, action);
  }
};
