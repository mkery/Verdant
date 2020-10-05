import * as React from "react";
import * as ReactDOM from "react-dom";
import { Store } from "redux";
import {
  showDetailOfNode,
  ghostState,
  initGhostBook,
  verdantState,
} from "../redux/";
import { Widget } from "@lumino/widgets";
import { GhostBook } from "./ghost-book";
import { Namer } from "../../lilgit/sampler/";

const GHOST_BOOK_ICON = "v-Verdant-GhostBook-icon";

export class Ghost extends Widget {
  readonly getFile: () => string;

  constructor(store: Store, ver: number) {
    super();
    this.getFile = () => store.getState().getHistory().notebook.name;
    this.id = "ghostbook-verdant";
    this.title.iconClass = GHOST_BOOK_ICON;
    this.title.closable = true;
    this.initStore(store, ver);
  }

  public initStore(store: Store, ver: number) {
    // first, make sure ver is in range of available notebook versions
    ver = Math.max(0, ver);
    let max = (store.getState() as verdantState).notebookArtifact.ver;
    ver = Math.min(max, ver);

    let changeTitle = (ver: number) => {
      this.title.label =
        "v" + Namer.getVersionNumberLabel(ver) + " of " + this.getFile();
    };

    const initialState: Partial<ghostState> = {
      notebook_ver: ver,
      active_cell: null,
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
