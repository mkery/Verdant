import * as React from "react";
import * as ReactDOM from "react-dom";
import { Store } from "redux";
import { switchTab, inspectNode, ActiveTab } from "../redux/index";
import { ghostState, initGhostBook } from "../redux/ghost";
import { Widget } from "@lumino/widgets";
import { GhostBook } from "./ghost-book";

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
    let changeTitle = (ver: number) => {
      this.title.label = "v" + (ver + 1) + " of " + this.getFile();
    };

    const initialState: Partial<ghostState> = {
      notebook_ver: ver,
      active_cell: null,
      changeGhostTitle: changeTitle.bind(this),
      link_artifact: (name: string) => {
        let history = store.getState().getHistory();
        let nodey = history.store.get(name);
        store.dispatch(inspectNode(nodey));
        store.dispatch(switchTab(ActiveTab.Artifact_Details));
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
