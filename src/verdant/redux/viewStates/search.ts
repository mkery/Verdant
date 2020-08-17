import { verdantState } from "../state";

const SEARCH_FOR = "SEARCH_FOR";

export const searchForText = (query: string) => {
  return {
    type: SEARCH_FOR,
    query,
  };
};

export type searchState = {
  searchQuery: string;
};

export const searchInitialState = (): searchState => {
  return {
    searchQuery: null,
  };
};

export const searchReducer = (
  state: verdantState,
  action: any
): verdantState => {
  switch (action.type) {
    case SEARCH_FOR:
      return { ...state, searchQuery: action.query };
    default:
      return state;
  }
};
