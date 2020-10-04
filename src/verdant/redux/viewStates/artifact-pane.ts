import { Nodey } from "../../../lilgit/nodey/";
import { verdantState } from "../state";
import { Wishbone } from "../../panel/details/wishbone";

const INSPECT_ON = "INSPECT_ON";
const INSPECT_OFF = "INSPECT_OFF";
const OPEN_PAIR = "OPEN_PAIR";
const CLOSE_PAIR = "CLOSE_PAIR";

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

export const openPair = (primaryNode) => {
  return {
    type: OPEN_PAIR,
    primaryNode,
  };
};

export const closePair = (primaryNode) => {
  return {
    type: CLOSE_PAIR,
    primaryNode,
  };
};

export type artifactPaneState = {
  showingDetail: boolean;
  inspectOn: boolean;
  inspectTarget: Nodey;
  openDetailPairs: string[];
};

export const artifactPaneInitialState = (): artifactPaneState => {
  return {
    showingDetail: false,
    inspectOn: false,
    inspectTarget: null,
    openDetailPairs: [],
  };
};

export const artifactReducer = (
  state: verdantState,
  action: any
): artifactPaneState => {
  const artifactState = state.artifactView;
  switch (action.type) {
    case INSPECT_ON:
      if (!artifactState.inspectOn) {
        Wishbone.startWishbone(state.getHistory());
      }
      return { ...artifactState, inspectOn: true };
    case INSPECT_OFF:
      if (artifactState.inspectOn)
        Wishbone.endWishbone(state.getHistory().notebook);
      return { ...artifactState, inspectOn: false };
    case OPEN_PAIR:
      let openDetailPairs = state.artifactView.openDetailPairs;
      openDetailPairs.push(action.primaryNode);
      return { ...artifactState, openDetailPairs };
    case CLOSE_PAIR:
      let closeDetailPairs = state.artifactView.openDetailPairs;
      closeDetailPairs = closeDetailPairs.filter(
        (item) => item !== action.primaryNode
      );
      return { ...artifactState, openDetailPairs: closeDetailPairs };
    default:
      return artifactState;
  }
};
