import { verdantState } from "../state";
import { Nodey } from "../../../verdant-model/nodey";

const SEARCH_FOR = "SEARCH_FOR";
const SET_RESULTS = "SET_RESULTS";
const OPEN_RESULTS = "OPEN_RESULTS";
const CLOSE_RESULTS = "CLOSE_RESULTS";
const CLOSE_ALL_RESULTS = "CLOSE_ALL_RESULTS";

export type searchResults = {
  label: string;
  count: number;
  results: Nodey[][];
}[];

export const searchForText = (query: string) => {
  return {
    type: SEARCH_FOR,
    query,
  };
};

export const setResults = (search_results: searchResults) => {
  return { type: SET_RESULTS, searchResults: search_results };
};

export const openResults = (label: string) => {
  return { type: OPEN_RESULTS, label };
};

export const closeResults = (label: string) => {
  return { type: CLOSE_RESULTS, label };
};

export const closeAll = () => {
  return { type: CLOSE_ALL_RESULTS };
};

export type searchState = {
  searchQuery: string | null;
  searchResults: searchResults;
  openResults: string[];
};

export const searchInitialState = (): searchState => {
  return {
    searchQuery: null,
    searchResults: [],
    openResults: [],
  };
};

export const searchReducer = (
  state: verdantState,
  action: any
): searchState => {
  let search_state = state.search;
  switch (action.type) {
    case SEARCH_FOR:
      return { ...search_state, searchQuery: action.query };
    case SET_RESULTS:
      return {
        ...search_state,
        searchResults: action.searchResults,
      };
    case OPEN_RESULTS:
      let openLabels = search_state.openResults;

      const mainLabels = ["code cell", "output", "markdown cell"];
      if (mainLabels.includes(action.label))
        openLabels = openLabels.filter((l) => !mainLabels.includes(l));
      openLabels.push(action.label);
      return { ...search_state, openResults: openLabels };
    case CLOSE_RESULTS:
      let closeLabels = search_state.openResults;
      closeLabels = closeLabels.filter((l) => l != action.label);
      return { ...search_state, openResults: closeLabels };
    case CLOSE_ALL_RESULTS:
      return { ...search_state, openResults: [] };
    default:
      return state.search;
  }
};
