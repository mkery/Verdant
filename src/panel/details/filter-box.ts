import { Widget } from "@phosphor/widgets";
import { VersionSampler } from "./version-sampler";

const FILTER_BUTTON = "v-VerdantPanel-filter-box-icon";
const FILTER_LABEL = "v-VerdantPanel-filter-box-label";
const FILTER_TAG_BIN = "v-VerdantPanel-filter-tag-bin";
const FILTER_TAG = "v-VerdantPanel-filter-tag";
const FILTER_ICON = "v-VerdantPanel-filterButton";

export class FilterBox extends Widget {
  readonly filterTagBin: HTMLElement;

  constructor(filters: { [name: string]: () => void }) {
    super();
    this.node.classList.add(FILTER_BUTTON);
    let icon = document.createElement("div");
    icon.classList.add(FILTER_ICON);
    this.node.appendChild(icon);

    this.filterTagBin = document.createElement("div");
    this.filterTagBin.classList.add(FILTER_TAG_BIN);

    for (var name in filters) {
      let filterName = document.createElement("div");
      filterName.classList.add(FILTER_LABEL);
      filterName.textContent = name;
      filterName.addEventListener("click", filters[name]);

      let filterTag = document.createElement("div");
      filterTag.classList.add(FILTER_TAG);
      filterTag.classList.add("disabled");
      filterTag.textContent = name;
      filterTag.addEventListener("click", () => {
        if (filterTag.classList.contains("disabled"))
          filterTag.classList.remove("disabled");
        else filterTag.classList.add("disabled");
      });
      this.filterTagBin.appendChild(filterTag);
    }

    VersionSampler.addCaret(this.node, this.filterTagBin, true);
  }
}
