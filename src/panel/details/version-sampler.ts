import { Widget } from "@phosphor/widgets";
import {
  Nodey,
  NodeyMarkdown,
  NodeyCode,
  NodeyOutput
} from "../../model/nodey";

import { Run } from "../../model/run";

import { Inspect } from "../../inspect";

const INSPECT_VERSION = "v-VerdantPanel-inspect-version";
const INSPECT_VERSION_LABEL = "v-VerdantPanel-inspect-version-label";
const INSPECT_ANNOTATION_BOX = "v-VerdantPanel-inspect-version-annotations";
const INSPECT_VERSION_ACTION = "v-VerdantPanel-search-filter";
const RUN_LINK = "v-VerdantPanel-inspect-run-link";
const INSPECT_VERSION_CONTENT = "v-VerdantPanel-inspect-version-content";

export abstract class VersionSampler extends Widget {
  protected node_id: string;
  protected version: string;
  readonly inspector: Inspect;

  constructor(inspector: Inspect, nodey: Nodey, text: string) {
    super();
    this.inspector = inspector;
    this.node_id = nodey.id;
    this.version = nodey.version;

    this.node.classList.add(INSPECT_VERSION);
    //this.node.appendChild(this.buildVerHeader(nodey));

    let content = document.createElement("div");
    content.classList.add(INSPECT_VERSION_CONTENT);
    this.node.appendChild(content);
    this.buildContent(nodey, text, content);
  }

  protected buildVerHeader(nodeyVer: Nodey): HTMLElement {
    let timestamp = null;

    //v2: created 5/4 8:15pm, used in 555 runs
    let label = document.createElement("div");
    label.classList.add(INSPECT_VERSION_LABEL);
    let l = document.createElement("span");
    if (timestamp) {
      l.textContent =
        "v" +
        (nodeyVer.version + 1) +
        ": created " +
        Run.formatTime(timestamp) +
        ", used in ";
      let r = document.createElement("span");
      r.classList.add(RUN_LINK);
      r.textContent = "these runs";
      label.appendChild(l);
      label.appendChild(r);
    } else {
      l.textContent = "v" + (nodeyVer.version + 1) + ": has never been run";
      label.appendChild(l);
    }

    let annotator = document.createElement("div");
    annotator.classList.add(INSPECT_ANNOTATION_BOX);
    let star = document.createElement("div");
    star.classList.add(INSPECT_VERSION_ACTION);
    star.classList.add("star");
    if (nodeyVer.star > -1) star.classList.add("active");

    annotator.appendChild(star);
    label.appendChild(annotator);

    return label;
  }

  protected abstract async buildContent(
    nodeyVer: Nodey,
    text: string,
    content: HTMLElement
  ): Promise<HTMLElement>;
}

export class CodeVersionSampler extends VersionSampler {
  protected async buildContent(
    nodeyVer: NodeyCode,
    text: string,
    content: HTMLElement
  ) {
    content.classList.add("code");
    await this.inspector.renderCodeVerisonDiv(
      nodeyVer,
      text,
      content,
      Inspect.CHANGE_DIFF,
      null
    );

    return content;
  }
}

export class OutputVersionSampler extends VersionSampler {
  protected async buildContent(
    nodeyVer: NodeyOutput,
    _: string,
    content: HTMLElement
  ) {
    await this.inspector.renderOutputVerisonDiv(nodeyVer, content, null);
    return content;
  }
}

export class MarkdownVersionSampler extends VersionSampler {
  protected async buildContent(
    nodeyVer: NodeyMarkdown,
    text: string,
    content: HTMLElement
  ) {
    content.classList.add("markdown");
    await this.inspector.renderMarkdownVersionDiv(
      nodeyVer,
      text,
      content,
      Inspect.CHANGE_DIFF,
      null
    );

    return content;
  }
}
