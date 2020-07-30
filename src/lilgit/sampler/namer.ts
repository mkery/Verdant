import {
  Nodey,
  NodeyCell,
  NodeyMarkdown,
  NodeyCodeCell,
  NodeyCode,
  NodeyNotebook,
  NodeyOutput,
  NodeyRawCell,
} from "../nodey";
import { History } from "../history";

/*
 * Remember that versions and ids are 1 indexed for display, but 0 indexed in storage
 */

export namespace Namer {
  export function getVersionTitle(n: Nodey) {
    let kind = n.typeChar.toUpperCase();
    return `${kind}${n.id + 1}.r${n.version + 1}`;
  }

  export function getCellTitle(n: NodeyCell) {
    let kind;
    if (n instanceof NodeyMarkdown) kind = "Markdown";
    else if (n instanceof NodeyCodeCell) kind = "Code Cell";
    else if (n instanceof NodeyRawCell) kind = "Raw Cell";
    return `${kind} ${n.id + 1}`;
  }

  export function getCellShortTitle(n: NodeyCell) {
    return `${n.typeChar.toUpperCase()}${n.id + 1}`;
  }

  export function getCellVersionTitle(n: NodeyCell) {
    return `${n.typeChar.toUpperCase()}${n.id + 1}.r${n.version + 1}`;
  }

  export function getOutputTitle(n: NodeyOutput, history: History) {
    let cell = history.store.get(n.parent);
    return `${Namer.getCellTitle(cell)} Output`;
  }

  export function getOutputVersionTitle(n: NodeyOutput, history: History) {
    let cell = history.store.get(n.parent);
    return `${Namer.getCellVersionTitle(cell)}.o${n.version + 1}`;
  }

  export function getCodeSnippetTitle(n: NodeyCode) {
    return `${n.type.toUpperCase} ${n.version + 1}`;
  }

  export function getNotebookTitle(n: NodeyNotebook) {
    return `Notebook v${n.version + 1}`;
  }

  export function getNotebookVersionLabel(n: NodeyNotebook) {
    return `v${n.version + 1}`;
  }

  export function getVersionNumberLabel(n: number) {
    return `${n + 1}`;
  }
}
