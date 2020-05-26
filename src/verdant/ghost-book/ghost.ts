import * as React from "react";
import * as ReactDOM from "react-dom";
import { Store } from "redux";
import { switchTab, inspectNode, ActiveTab } from "../redux/index";
import { ghostState, initGhostBook } from "../redux/ghost";
import { Widget } from "@lumino/widgets";
import { History } from "../../lilgit/model/history";
import { GhostBook } from "./ghost-book";

const GHOST_BOOK_ICON = "v-Verdant-GhostBook-icon";

export class Ghost extends Widget {
  readonly history: History;

  constructor(store: Store, ver: number) {
    super();
    this.history = store.getState().history;
    let file = this.history.notebook.name;
    this.id = "ghostbook-verdant";
    this.title.label = "#" + (ver + 1) + " of " + file;
    this.title.iconClass = GHOST_BOOK_ICON;
    this.title.closable = true;
    this.initStore(store, ver);
  }

  public getFile() {
    return this.history.notebook.name;
  }

  public initStore(store: Store, ver: number) {
    let changeTitle = (history: History, ver: number) => {
      let file = history.notebook.name;
      this.title.label = "#" + (ver + 1) + " of " + file;
    };

    const initialState: Partial<ghostState> = {
      notebook_ver: ver,
      active_cell: null,
      show_all_cells: true,
      changeGhostTitle: changeTitle.bind(this),
      link_artifact: (name: string) => {
        let nodey = this.history.store.get(name);
        store.dispatch(inspectNode(nodey));
        store.dispatch(switchTab(ActiveTab.Artifact_Details));
      },
    };

    store.dispatch(initGhostBook(initialState));

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

  close() {
    super.close();
    super.dispose();
  }
}
