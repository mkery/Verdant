import { History } from "../../lilgit/history";
import { Nodey } from "../../lilgit/nodey/";
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
const INSPECT_TARGET = "INSPECT_TARGET";

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
  activeTab: ActiveTab;
  artifactView: artifactPaneState;
} & notebookState &
  ghostState &
  eventMapState &
  searchState;

export const createInitialState = (getHistory: () => History): verdantState => {
  return {
    getHistory: getHistory,
    activeTab: ActiveTab.Events,
    artifactView: artifactPaneInitialState(),
    ...notebookStateInitialState(),
    ...eventsInitialState(),
    ...ghostInitialState(),
    ...searchInitialState(),
  };
};

export const verdantReducer = (state: verdantState, action: any) => {
  switch (action.type) {
    case SWITCH_TAB:
      // ensure inspect interaction is turned off when switching tab
      if (state.artifactView.inspectOn)
        Wishbone.endWishbone(state.getHistory().notebook);

      // if transitioning from detail to summary, cancel the current inspect target
      let showingDetail = state.artifactView.showingDetail;
      let inspectTarget = state.artifactView.inspectTarget;
      if (
        state.activeTab === ActiveTab.Artifact_Details &&
        action.tab === ActiveTab.Artifacts
      ) {
        showingDetail = false;
        inspectTarget = null;
      }

      // if transitioning to detail view, double-check there's a valid target
      if (action.tab === ActiveTab.Artifact_Details && !inspectTarget) {
        action.tab = state.activeTab;
        if (state.activeTab === ActiveTab.Artifact_Details)
          action.tab = ActiveTab.Artifacts;
      }

      return {
        ...state,
        activeTab: action.tab,
        artifactView: {
          ...state.artifactView,
          inspectOn: false,
          showingDetail,
          inspectTarget,
        },
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
    default:
      let state_ev = notebookReducer(state, action);
      let state_ev2 = eventReducer(state_ev, action);
      let state_ev3 = searchReducer(state_ev2, action);
      let state_ev4 = ghostReduce(state_ev3, action);
      return { ...state_ev4, artifactView: artifactReducer(state_ev4, action) };
  }
};
