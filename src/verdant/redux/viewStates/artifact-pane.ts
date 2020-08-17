import { ActiveTab } from "../state";
import { Nodey } from "../../../lilgit/nodey/";
import { verdantState } from "../state";
import { Wishbone } from "../../panel/details/wishbone";

const INSPECT_TARGET = "INSPECT_TARGET";
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

export type artifactPaneState = {
  activeView: ActiveTab.Artifact_Details | ActiveTab.Artifacts;
  inspectOn: boolean;
  inspectTarget: Nodey;
};

export const artifactPaneInitialState = (): artifactPaneState => {
  return {
    activeView: ActiveTab.Artifacts,
    inspectOn: false,
    inspectTarget: null,
  };
};

export const artifactReducer = (
  state: verdantState,
  action: any
): verdantState => {
  switch (action.type) {
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
    default:
      return state;
  }
};
