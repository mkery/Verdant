import { History } from "../../lilgit/model/history";
import { Nodey } from "../../lilgit/model/nodey";
import { Checkpoint } from "../../lilgit/model/checkpoint";
import { ghostState, ghostReduce, ghostInitialState } from "./ghost";
import { eventMapState, eventReducer, eventsInitialState } from "./events";
import { Wishbone } from "../panel/details/wishbone";

const SWITCH_TAB = "SWITCH_TAB";
const INSPECT_TARGET = "INSPECT_TARGET";
const SEARCH_FOR = "SEARCH_FOR";
const INSPECT_ON = "INSPECT_ON";
const INSPECT_OFF = "INSPECT_OFF";

export const inspectNode = (target: Nodey) => {
  return {
    type: INSPECT_TARGET,
    target,
  };
};

export const inspectOn = () => {
  return {
    type: INSPECT_ON,
  };
};

export const inspectOff = () => {
  return {
    type: INSPECT_OFF,
  };
};

export const switchTab = (name: ActiveTab) => {
  return {
    type: SWITCH_TAB,
    tab: name,
  };
};

export const searchForText = (query: string) => {
  return {
    type: SEARCH_FOR,
    query,
  };
};

export enum ActiveTab {
  Events,
  Artifacts,
  Artifact_Details,
  Search,
}

export type artifactState = {
  name: string;
  ver: number;
  outputVer?: number;
  file?: string;
};

export type verdantState = {
  getHistory: () => History;
  currentEvent: Checkpoint;
  activeTab: ActiveTab;
  inspectOn: boolean;
  searchQuery: string;
  inspectTarget: Nodey;
  cellArtifacts: artifactState[];
  notebookArtifact: artifactState;
} & ghostState &
  eventMapState;

export const createInitialState = (getHistory: () => History): verdantState => {
  return {
    getHistory: getHistory,
    currentEvent: null,
    activeTab: ActiveTab.Events,
    inspectOn: false,
    searchQuery: null,
    inspectTarget: null,
    cellArtifacts: [],
    notebookArtifact: null,
    ...eventsInitialState(),
    ...ghostInitialState(),
  };
};

export const verdantReducer = (state: verdantState, action: any) => {
  switch (action.type) {
    case SWITCH_TAB:
      if (state.inspectOn) Wishbone.endWishbone(state.getHistory().notebook);
      return { ...state, activeTab: action.tab, inspectOn: false };
    case INSPECT_TARGET:
      return { ...state, inspectTarget: action.target };
    case INSPECT_ON:
      if (!state.inspectOn) {
        Wishbone.startWishbone(state.getHistory());
      }
      return { ...state, inspectOn: true };
    case INSPECT_OFF:
      if (state.inspectOn) Wishbone.endWishbone(state.getHistory().notebook);
      return { ...state, inspectOn: false };
    case SEARCH_FOR:
      return { ...state, searchQuery: action.query };
    default:
      let state_ev = eventReducer(state, action);
      return ghostReduce(state_ev, action);
  }
};
