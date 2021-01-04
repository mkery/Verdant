import * as React from "react";
import * as ReactDOM from "react-dom";
import { Store } from "redux";
import {
  showDetailOfNode,
  ghostState,
  initGhostBook,
  verdantState,
  closeGhostBook,
} from "../redux/";
import { Widget } from "@lumino/widgets";
import { GhostBook } from "./ghost-book";
import { Namer } from "../../verdant-model/sampler";
import { Message } from "@lumino/messaging";

const GHOST_BOOK_ICON = "v-Verdant-GhostBook-icon";

export class Ghost extends Widget {
  readonly getFile: () => string;
  private store: Store;

  constructor(store: Store, ver: number) {
    super();
    this.getFile = () => store.getState().getHistory().notebook.name;
    this.id = "ghostbook-verdant";
    this.title.iconClass = GHOST_BOOK_ICON;
    this.title.closable = true;
    this.store = store;
    this.initStore(store, ver);
  }

  onCloseRequest(msg: Message) {
    super.onCloseRequest(msg);
    this.store.dispatch(closeGhostBook());
  }

  public initStore(store: Store, ver: number) {
    //update store to that of a different notebook if needed
    this.store = store;

    // first, make sure ver is in range of available notebook versions
    ver = Math.max(0, ver);
    let max =
      (store.getState() as verdantState)?.notebookArtifact?.ver ||
      Number.MAX_SAFE_INTEGER;
    ver = Math.min(max, ver);

    let changeTitle = (ver: number) => {
      this.title.label =
        "v" + Namer.getVersionNumberLabel(ver) + " of " + this.getFile();
    };

    const initialState: Partial<ghostState> = {
      notebook_ver: ver,
      active_cell: undefined,
      changeGhostTitle: changeTitle.bind(this),
      link_artifact: (name: string) => {
        let history = store.getState().getHistory();
        let nodey = history.store.get(name);
        store.dispatch(showDetailOfNode(nodey));
      },
    };

    store.dispatch(initGhostBook(initialState));
    changeTitle(ver);

    ReactDOM.render(
      React.createElement(
        GhostBook,
        {
          store: store,
        },
        null
      ),
      this.node
    );
  }
}
