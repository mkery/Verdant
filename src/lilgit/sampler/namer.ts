import {
  Nodey,
  NodeyCell,
  NodeyMarkdown,
  NodeyCodeCell,
  NodeyNotebook,
  NodeyOutput,
  NodeyRawCell,
} from "../nodey";
import { History } from "../history";

export namespace Namer {
  export function getVersionTitle(n: Nodey) {
    let kind = n.typeChar.toUpperCase();
    return `${kind}${n.id}.r${n.version}`;
  }

  export function getCellTitle(n: NodeyCell) {
    let kind;
    if (n instanceof NodeyMarkdown) kind = "Markdown";
    else if (n instanceof NodeyCodeCell) kind = "Code Cell";
    else if (n instanceof NodeyRawCell) kind = "Raw Cell";
    return `${kind} ${n.id}`;
  }

  export function getOutputTitle(n: NodeyOutput, history: History) {
    let cell = history.store.get(n.parent);
    return `${Namer.getCellTitle(cell)} Output`;
  }

  export function getNotebookTitle(n: NodeyNotebook) {
    return `Notebook v${n.version}`;
  }
}
