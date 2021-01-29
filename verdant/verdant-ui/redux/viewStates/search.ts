import { verdantState } from "../state";
import { History, searchResult } from "../../../verdant-model/history";

const SEARCH_FOR = "SEARCH_FOR";
const OPEN_RESULTS = "OPEN_RESULTS";
const CLOSE_RESULTS = "CLOSE_RESULTS";

export const searchForText = (query: string) => {
  return {
    type: SEARCH_FOR,
    query,
  };
};

export const openResults = (label: string) => {
  return { type: OPEN_RESULTS, label };
};

export const closeResults = (label: string) => {
  return { type: CLOSE_RESULTS, label };
};

export type searchState = {
  searchQuery: string | null;
  searchResults: searchResult[];
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
      return {
        ...search_state,
        searchQuery: action.query,
        openResults: [],
        searchResults: search(action.query, state.getHistory()),
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
    default:
      return state.search;
  }
};

function search(query: string, history: History) {
  query = query?.trim();
  if (query && query.length > 0) return history?.store?.search(query);
  return [];
}
