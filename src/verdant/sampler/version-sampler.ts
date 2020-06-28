import {
  Nodey,
  NodeyCode,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyOutput
} from "../../lilgit/model/nodey";
import {History} from "../../lilgit/model/history";
import {CELL_TYPE} from "../redux/ghost";

const INSPECT_VERSION = "v-VerdantPanel-sampler-version";
const INSPECT_VERSION_CONTENT = "v-VerdantPanel-sampler-version-content";
const RESULT_HEADER_BUTTON = "VerdantPanel-search-results-header-button";

export namespace VersionSampler {
  export enum SAMPLE_TYPE {
    DIFF,
    ARTIFACT,
    SEARCH
  }

  export async function sample(
    sampleType: SAMPLE_TYPE,
    history: History,
    nodey: Nodey,
    query?: string,
    diff?: number,
    prior?: string
  ) {
    let inspector = history.inspector;
    let text = inspector.renderNode(nodey);

    let sample = document.createElement("div");
    sample.classList.add(INSPECT_VERSION);

    let content = document.createElement("div");
    content.classList.add(INSPECT_VERSION_CONTENT);
    sample.appendChild(content);

    let cellType = CELL_TYPE.NONE;
    if (nodey instanceof NodeyCode) {
      cellType = CELL_TYPE.CODE;
      content.classList.add("code");
    } else if (nodey instanceof NodeyMarkdown) {
      cellType = CELL_TYPE.MARKDOWN;
      content.classList.add("markdown");
      content.classList.add("jp-RenderedHTMLCommon");
    }
    else if (nodey instanceof NodeyOutput) {
      cellType = CELL_TYPE.OUTPUT;
    }

    await inspector.renderCell(
      sampleType,
      nodey,
      content,
      cellType,
      diff,
      query,
      text,
      prior
    );
    return sample;
  }

  export function nameNodey(history: History, nodey: Nodey): string {
    let nodeyName: string;
    if (nodey instanceof NodeyMarkdown) nodeyName = "markdown " + nodey.id;
    else if (nodey instanceof NodeyCodeCell)
      nodeyName = "code cell " + nodey.id;
    else if (nodey instanceof NodeyOutput) nodeyName = "output " + nodey.id;
    else if (nodey instanceof NodeyCode) {
      let cell = history.store.getCellParent(nodey);
      nodeyName =
        nodey.type + " " + nodey.id + " from " + nameNodey(history, cell);
    }
    return nodeyName;
  }

  /*
   * animated button, thus the extra divs
   */
  export function addCaret(
    label: HTMLElement,
    content: HTMLElement,
    opened?: boolean,
    onOpen?: () => void,
    onClose?: () => void
  ) {
    let button = document.createElement("div");
    button.classList.add(RESULT_HEADER_BUTTON);
    if (opened) button.classList.add("opened");
    else button.classList.add("closed");
    label.appendChild(button);
    let circle = document.createElement("div");
    circle.classList.add("circle");
    button.appendChild(circle);
    let horizontal = document.createElement("div");
    horizontal.classList.add("horizontal");
    circle.appendChild(horizontal);
    let vertical = document.createElement("div");
    vertical.classList.add("vertical");
    circle.appendChild(vertical);
    label.addEventListener("mousedown", () => {
      if (button.classList.contains("opened")) {
        button.classList.remove("opened");
        button.classList.add("closed");
        setTimeout(() => {
          if (onClose) onClose();
          if (content) content.style.display = "none";
        }, 100);
      } else if (button.classList.contains("closed")) {
        button.classList.remove("closed");
        button.classList.add("opened");
        setTimeout(() => {
          if (onOpen) onOpen();
          if (content) content.style.display = "block";
        }, 300);
      }
    });
  }
}
