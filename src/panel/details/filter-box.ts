import { Widget } from "@phosphor/widgets";
import { VersionSampler } from "./version-sampler";

const FILTER_BUTTON = "v-VerdantPanel-filter-box-icon";
const FILTER_BOX = "v-VerdantPanel-filter-box";
const FILTER_LABEL = "v-VerdantPanel-filter-box-label";
const FILTER_TAG_BIN = "v-VerdantPanel-filter-tag-bin";
const FILTER_TAG = "v-VerdantPanel-filter-tag";

export class FilterBox extends Widget {
  readonly filterBoxNode: HTMLElement;
  readonly filterTagBin: HTMLElement;

  constructor(filters: { [name: string]: () => void }) {
    super();
    this.node.classList.add(FILTER_BUTTON);

    this.filterBoxNode = document.createElement("div");
    this.filterBoxNode.classList.add(FILTER_BOX);

    this.filterTagBin = document.createElement("div");
    this.filterTagBin.classList.add(FILTER_TAG_BIN);

    for (var name in filters) {
      let filterName = document.createElement("div");
      filterName.classList.add(FILTER_LABEL);
      filterName.textContent = name;
      filterName.addEventListener("click", filters[name]);
      this.filterBoxNode.appendChild(filterName);

      let filterTag = document.createElement("div");
      filterTag.classList.add(FILTER_TAG);
      filterTag.textContent = name;
      filterName.addEventListener("click", () => {
        filterTag.style.display = "inline-block";
        this.filterTagBin.style.display = "block";
      });
      this.filterTagBin.appendChild(filterTag);
    }

    VersionSampler.addCaret(this.node, this.filterBoxNode);
  }
}
