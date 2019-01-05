import {
  Nodey,
  NodeyMarkdown,
  NodeyCode,
  NodeyOutput,
  NodeyCodeCell
} from "../../model/nodey";
import { History } from "../../model/history";
import { Inspect } from "../../inspect";

const INSPECT_VERSION = "v-VerdantPanel-inspect-version";
const SEARCH_SAMPLE = "v-VerdantPanel-search-version";
const INSPECT_VERSION_CONTENT = "v-VerdantPanel-inspect-version-content";
const VERSION_HEADER = "v-VerdantPanel-inspect-version-header";
const SEARCH_VERSION_LABEL = "v-VerdantPanel-search-version-header";
const VERSION_LINK = "v-VerdantPanel-inspect-version-header-link";
const RESULT_HEADER_BUTTON = "VerdantPanel-search-results-header-button";

export namespace VersionSampler {
  export function sample(history: History, nodey: Nodey, query?: string) {
    let inspector = history.inspector;
    let text = inspector.renderNode(nodey).text;

    let sample = document.createElement("div");
    sample.classList.add(INSPECT_VERSION);

    let content = document.createElement("div");
    content.classList.add(INSPECT_VERSION_CONTENT);
    sample.appendChild(content);

    if (nodey instanceof NodeyCode)
      buildCode(inspector, nodey, text, content, query);
    else if (nodey instanceof NodeyMarkdown)
      buildMarkdown(inspector, nodey, text, content, query);
    else if (nodey instanceof NodeyOutput)
      buildOutput(inspector, nodey, content, query);

    return sample;
  }

  export function sampleSearch(
    history: History,
    nodey: Nodey[],
    query: string,
    callback: () => void
  ): HTMLElement {
    let container = document.createElement("div");
    let versions = document.createElement("div");
    let header = document.createElement("div");
    container.appendChild(header);
    container.appendChild(versions);
    header.appendChild(searchHeader(history, nodey, versions, callback));

    nodey.forEach(item => {
      let wrapper = document.createElement("div");
      let div = sample(history, item, query);
      div.classList.add(SEARCH_SAMPLE);
      let header = searchVerHeader(history, item);
      wrapper.appendChild(header);
      wrapper.appendChild(div);
      versions.appendChild(wrapper);
    });
    return container;
  }

  function searchHeader(
    history: History,
    nodey: Nodey[],
    content: HTMLElement,
    callback: () => void
  ) {
    let label = document.createElement("div");
    label.classList.add(VERSION_HEADER);
    label.classList.add("search");
    let spanA = document.createElement("span");
    spanA.textContent = nodey.length + " versions of ";
    let spanB = document.createElement("span");
    spanB.textContent = nameNodey(history, nodey[0]);
    spanB.classList.add(VERSION_LINK);
    spanB.addEventListener("mousedown", callback);
    let textLabel = document.createElement("div");
    textLabel.classList.add(SEARCH_VERSION_LABEL);
    textLabel.appendChild(spanA);
    textLabel.appendChild(spanB);

    addCaret(label, content, true);
    label.appendChild(textLabel);
    return label;
  }

  function nameNodey(history: History, nodey: Nodey): string {
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

  export function verHeader(history: History, nodey: Nodey) {
    // 1 index instead of 0 index just for display
    let ver = nodey.version + 1;
    let created = history.checkpoints.get(nodey.created);
    let notebookVer;
    if (created) notebookVer = created.notebook + 1 + "";
    else notebookVer = "???";

    let header = document.createElement("div");
    header.classList.add(VERSION_HEADER);
    header.textContent =
      "v" +
      ver +
      " " +
      nameNodey(history, nodey) +
      ", NOTEBOOK #" +
      notebookVer;
    return header;
  }

  function searchVerHeader(history: History, nodey: Nodey) {
    // 1 index instead of 0 index just for display
    let ver = nodey.version + 1;

    let header = document.createElement("div");
    header.classList.add(VERSION_HEADER);
    header.classList.add("searchVerLabel");
    header.textContent = "v" + ver + " " + nameNodey(history, nodey);
    return header;
  }

  async function buildCode(
    inspector: Inspect,
    nodeyVer: NodeyCode,
    text: string,
    content: HTMLElement,
    query?: string
  ): Promise<HTMLElement> {
    content.classList.add("code");
    await inspector.renderCodeVerisonDiv(
      nodeyVer,
      text,
      content,
      Inspect.CHANGE_DIFF,
      query
    );

    return content;
  }

  async function buildOutput(
    inspector: Inspect,
    nodeyVer: NodeyOutput,
    content: HTMLElement,
    query?: string
  ): Promise<HTMLElement> {
    await inspector.renderOutputVerisonDiv(nodeyVer, content, query);
    return content;
  }

  async function buildMarkdown(
    inspector: Inspect,
    nodeyVer: NodeyMarkdown,
    text: string,
    content: HTMLElement,
    query?: string
  ): Promise<HTMLElement> {
    content.classList.add("markdown");
    await inspector.renderMarkdownVersionDiv(
      nodeyVer,
      text,
      content,
      Inspect.CHANGE_DIFF,
      query
    );

    return content;
  }

  /*
  * animated button, thus the extra divs
  */
  export function addCaret(
    label: HTMLElement,
    content: HTMLElement,
    opened?: boolean
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
          content.style.display = "none";
        }, 100);
      } else if (button.classList.contains("closed")) {
        button.classList.remove("closed");
        button.classList.add("opened");
        setTimeout(() => {
          content.style.display = "block";
        }, 300);
      }
    });
  }
}
