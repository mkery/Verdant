import { Nodey } from "../../../lilgit/nodey/";
import { verdantState } from "../state";
import { Wishbone } from "../../panel/details/wishbone";

const INSPECT_ON = "INSPECT_ON";
const INSPECT_OFF = "INSPECT_OFF";

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
  showingDetail: boolean;
  inspectOn: boolean;
  inspectTarget: Nodey;
};

export const artifactPaneInitialState = (): artifactPaneState => {
  return {
    showingDetail: false,
    inspectOn: false,
    inspectTarget: null,
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
    default:
      return artifactState;
  }
};
