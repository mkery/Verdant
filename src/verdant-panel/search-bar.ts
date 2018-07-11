import { Widget } from "@phosphor/widgets";

import "../../style/index.css";

/*
 * History search bar
 */

const SEARCH_BAR_CLASS = "p-CommandPalette-search";
const SEARCH_WRAPPER_CLASS = "p-CommandPalette-wrapper";
const SEARCH_INPUT_CLASS = "v-VerdantPanel-input";

export class SearchBar extends Widget {
  constructor() {
    super();
    this.addClass(SEARCH_BAR_CLASS);

    let wrapper = document.createElement("div");
    let input = document.createElement("input");
    wrapper.className = SEARCH_WRAPPER_CLASS;
    input.className = SEARCH_INPUT_CLASS;
    input.spellcheck = false;
    wrapper.appendChild(input);
    this.node.appendChild(wrapper);
  }
}
