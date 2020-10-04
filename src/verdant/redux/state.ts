import { History } from "../../lilgit/history";
import { Nodey } from "../../lilgit/nodey/";
import { Ghost } from "../ghost-book/ghost";
import { ghostState, ghostReduce, ghostInitialState } from "./ghost";
import {
  eventMapState,
  eventReducer,
  eventsInitialState,
  INIT_EVENT_MAP,
  UPDATE_CHECKPOINT,
} from "./events";
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

const SET_GHOST_OPENER = "SET_GHOST_OPENER";
const SWITCH_TAB = "SWITCH_TAB";
const INSPECT_TARGET = "INSPECT_TARGET";

export const setGhostOpener = (fun: (notebook: number) => Ghost) => {
  return {
    type: SET_GHOST_OPENER,
    fun,
  };
};

export const switchTab = (name: ActiveTab) => {
  return {
    type: SWITCH_TAB,
    tab: name,
  };
};

export const showDetailOfNode = (target: Nodey) => {
  return {
    type: INSPECT_TARGET,
    target,
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
  openGhostBook: (notebook: number) => Ghost;
  eventView: eventMapState;
  activeTab: ActiveTab;
  artifactView: artifactPaneState;
  search: searchState;
  ghostBook: ghostState;
} & notebookState;

export const createInitialState = (getHistory: () => History): verdantState => {
  return {
    getHistory: getHistory,
    openGhostBook: null,
    eventView: eventsInitialState(),
    activeTab: ActiveTab.Events,
    artifactView: artifactPaneInitialState(),
    search: searchInitialState(),
    ghostBook: ghostInitialState(),
    ...notebookStateInitialState(),
  };
};

export const verdantReducer = (state: verdantState, action: any) => {
  switch (action.type) {
    case SET_GHOST_OPENER:
      return { ...state, openGhostBook: action.fun };
    case SWITCH_TAB:
      let artifact_state = { ...state.artifactView };

      // ensure inspect interaction is turned off when switching tab
      if (state.artifactView.inspectOn) {
        Wishbone.endWishbone(state.getHistory().notebook);
        artifact_state.inspectOn = false;
      }

      // if transitioning from detail to summary, cancel the current inspect target
      if (
        state.activeTab === ActiveTab.Artifact_Details &&
        action.tab === ActiveTab.Artifacts
      ) {
        artifact_state = artifactPaneInitialState();
      }

      // if transitioning to detail view, double-check there's a valid target
      if (
        action.tab === ActiveTab.Artifact_Details &&
        !artifact_state.inspectTarget
      ) {
        action.tab = state.activeTab;
        if (state.activeTab === ActiveTab.Artifact_Details)
          action.tab = ActiveTab.Artifacts;
      }

      return {
        ...state,
        activeTab: action.tab,
        artifactView: artifact_state,
      };
    case INSPECT_TARGET:
      // showing details of a target will open the artifact detail view
      if (action.target)
        return {
          ...state,
          activeTab: ActiveTab.Artifact_Details,
          artifactView: {
            ...state.artifactView,
            inspectTarget: action.target,
            showingDetail: true,
          },
        };
      // otherwise, if there is no target, don't show detail view
      else {
        let tab = state.activeTab;
        if (tab === ActiveTab.Artifact_Details) tab = ActiveTab.Artifacts;
        return {
          ...state,
          activeTab: tab,
          artifactView: {
            ...state.artifactView,
            inspectTarget: null,
            showingDetail: false,
          },
        };
      }
    case INIT_EVENT_MAP:
      return {
        ...notebookReducer(state, action),
        eventView: eventReducer(state, action),
      };
    case UPDATE_CHECKPOINT:
      // both of these cases require an update of notebook as well as event view
      let state_1 = notebookReducer(state, action);
      return {
        ...state_1,
        eventView: eventReducer(state_1, action),
      };
    default:
      let state_ev = notebookReducer(state, action);
      return {
        ...state_ev,
        eventView: eventReducer(state_ev, action),
        search: searchReducer(state_ev, action),
        artifactView: artifactReducer(state_ev, action),
        ghostState: ghostReduce(state_ev, action),
      };
  }
};
