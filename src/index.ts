import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  LabShell,
} from "@jupyterlab/application";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { createStore, applyMiddleware, Store } from "redux";
import { VerdantLog } from "./verdant/logger";
import { verdantReducer, createInitialState } from "./verdant/redux/index";
import { setGhostOpener } from "./verdant/redux/ghost";
import { log, VerNotebook } from "./lilgit/components/notebook";

import { Ghost } from "./verdant/ghost-book/ghost";

import { IRenderMimeRegistry } from "@jupyterlab/rendermime";

import { IDocumentManager } from "@jupyterlab/docmanager";

import { NotebookPanel } from "@jupyterlab/notebook";

import { FileManager } from "./lilgit/jupyter-hooks/file-manager";

import { StackedPanel, Widget } from "@lumino/widgets";

import * as renderers from "@jupyterlab/rendermime";

import "../style/index.css";
import "../style/ghost.css";
import "../style/sampler.css";
import "../style/activity.css";
import "../style/verdant-panel.css";

import { AST } from "./lilgit/analysis/ast";

import { VerdantNotebook } from "./verdant/verdant-notebook";

import { History } from "./lilgit/model/history";

import { VerdantPanel } from "./verdant/verdant-panel";

import { RenderBaby } from "./lilgit/jupyter-hooks/render-baby";

/**
 * Initialization data for the Verdant extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: "Verdant",
  activate: (
    app: JupyterFrontEnd,
    restorer: ILayoutRestorer,
    docManager: IDocumentManager,
    rendermime: IRenderMimeRegistry,
    latexTypesetter: renderers.ILatexTypesetter
  ) => {
    /*
     * Set up private singletons
     */
    const linkHandler = {
      handleLink: (node: HTMLElement, path: string) => {
        app.commandLinker.connectNode(node, "docmanager:open", { path: path });
      },
    };

    /*
     * Set up singletons acessed by all instances
     */
    fileManager = new FileManager(docManager);
    renderBaby = new RenderBaby(rendermime, latexTypesetter, linkHandler);
    sidePanel = new StackedPanel();

    // set up ghost book as a singleton
    openGhostBook = (store: Store, notebook: VerNotebook, ver: number) => {
      // initial ghost book
      if (!ghostWidget) {
        ghostWidget = new Ghost(store, ver);
      }
      // changing notebook
      else ghostWidget.initStore(store, ver);

      if (!ghostWidget.isAttached) {
        // Attach the widget to the main work area if it's not there
        app.shell.add(ghostWidget, "main");
      }
      // Activate the widget
      app.shell.activateById(ghostWidget.id);
      return ghostWidget;
    };

    restorer.add(sidePanel, "v-VerdantPanel");
    sidePanel.id = "v-VerdantPanel";
    sidePanel.title.iconClass = "verdant-log-icon jp-SideBar-tabIcon";
    sidePanel.title.caption = "Verdant Log";
    app.shell.add(sidePanel, "left", { rank: 600 });

    /*
     * this is how we'll keep track of which notebook
     * we're looking at
     */
    let activeInstance: VerdantInstance = null;
    const populate = () => {
      let widg = app.shell.currentWidget;
      if (widg instanceof NotebookPanel) {
        // normal notebook
        let verInst = getInstance(widg);
        verInst.logger.log(
          "Jupyter Lab switching Notebook to " + verInst.notebook.name
        );
        if (!activeInstance || activeInstance !== verInst) {
          if (activeInstance) activeInstance.ui.hide();
          activeInstance = verInst;
          activeInstance.ui.show();
        }
      }

      // Log: what is showing?
      instances.map((ver) => {
        // start logging once there is an active instance
        let showing = {
          ghost: ghostWidget
            ? ghostWidget.isVisible &&
              ghostWidget.getFile() === ver.notebook.path
            : false,
          sideBar: sidePanel
            ? sidePanel.isVisible && ver === activeInstance
            : false,
          notebook: ver.panel ? ver.panel.isVisible : false,
        };
        ver.logger.log("Jupyter Lab layout change:", JSON.stringify(showing));
      });
    };

    // Connect signal handlers.
    (app.shell as LabShell).layoutModified.connect(() => {
      populate();
    });

    // Populate the tab manager.
    populate();
  },
  autoStart: true,
  requires: [
    ILayoutRestorer,
    IDocumentManager,
    IRenderMimeRegistry,
    renderers.ILatexTypesetter,
  ],
};

const instances: VerdantInstance[] = [];
let renderBaby: RenderBaby;
let fileManager: FileManager;
let sidePanel: StackedPanel;
let openGhostBook: (store: Store, notebook: VerNotebook, ver: number) => Ghost;
let ghostWidget: Ghost;

type VerdantInstance = {
  history: History;
  analysis: AST;
  ui: Widget;
  notebook: VerdantNotebook;
  panel: NotebookPanel;
  logger: VerdantLog;
};

function getInstance(panel: NotebookPanel) {
  let verInst = instances.find((inst) => inst.panel.id === panel.id);
  if (!verInst) {
    /*
     * Create instance
     */
    let logger = new VerdantLog();
    let log_redux = logger.getReduxLogger();
    let history = new History(renderBaby, fileManager);
    let analysis = new AST(history);
    const initialState = createInitialState(history);
    let store: Store = createStore(
      verdantReducer,
      initialState,
      applyMiddleware(log_redux)
    );

    /*
     * Create side panel
     */
    let ui = new Widget();
    sidePanel.addWidget(ui);
    ReactDOM.render(
      React.createElement(
        VerdantPanel,
        {
          store: store,
        },
        null
      ),
      ui.node
    );

    // set up notebook
    let notebook = new VerdantNotebook(history, analysis, panel, store, logger);

    // set up ghost book for this notebook
    store.dispatch(setGhostOpener(openGhostBook.bind(this, store, notebook)));

    verInst = { history, analysis, ui, notebook, panel, logger };
    instances.push(verInst);
    notebook.ready.then(() => {
      log("Notebook is ready");
    });
  }
  return verInst;
}

// TODO function shutDownInstance(panel: NotebookPanel)

export default extension;
