import {
  Nodey,
  NodeyMarkdown,
  NodeyCode,
  NodeyOutput
} from "../../model/nodey";
import { History } from "../../model/history";
import { Inspect } from "../../inspect";

const INSPECT_VERSION = "v-VerdantPanel-inspect-version";
const INSPECT_VERSION_CONTENT = "v-VerdantPanel-inspect-version-content";
const VERSION_HEADER = "v-VerdantPanel-inspect-version-header";

export namespace VersionSampler {
  export function sample(history: History, nodey: Nodey) {
    let inspector = history.inspector;
    let text = inspector.renderNode(nodey).text;

    let sample = document.createElement("div");
    sample.classList.add(INSPECT_VERSION);

    let content = document.createElement("div");
    content.classList.add(INSPECT_VERSION_CONTENT);
    sample.appendChild(content);

    if (nodey instanceof NodeyCode) buildCode(inspector, nodey, text, content);
    else if (nodey instanceof NodeyMarkdown)
      buildMarkdown(inspector, nodey, text, content);
    else if (nodey instanceof NodeyOutput)
      buildOutput(inspector, nodey, text, content);

    return sample;
  }

  export function verHeader(history: History, nodey: Nodey) {
    let ver = nodey.version;
    let notebookVer = history.checkpoints.get(nodey.created).notebook;

    let header = document.createElement("div");
    header.classList.add(VERSION_HEADER);
    header.textContent = "#" + ver + ", NOTEBOOK #" + notebookVer;
    return header;
  }

  async function buildCode(
    inspector: Inspect,
    nodeyVer: NodeyCode,
    text: string,
    content: HTMLElement
  ): Promise<HTMLElement> {
    content.classList.add("code");
    await inspector.renderCodeVerisonDiv(
      nodeyVer,
      text,
      content,
      Inspect.CHANGE_DIFF,
      null
    );

    return content;
  }

  async function buildOutput(
    inspector: Inspect,
    nodeyVer: NodeyOutput,
    _: string,
    content: HTMLElement
  ): Promise<HTMLElement> {
    await inspector.renderOutputVerisonDiv(nodeyVer, content, null);
    return content;
  }

  async function buildMarkdown(
    inspector: Inspect,
    nodeyVer: NodeyMarkdown,
    text: string,
    content: HTMLElement
  ): Promise<HTMLElement> {
    content.classList.add("markdown");
    await inspector.renderMarkdownVersionDiv(
      nodeyVer,
      text,
      content,
      Inspect.CHANGE_DIFF,
      null
    );

    return content;
  }
}
