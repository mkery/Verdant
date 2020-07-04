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
import "../style/landing.css";

import { AST } from "./lilgit/analysis/ast";

import { VerdantNotebook } from "./verdant/verdant-notebook";

import { History } from "./lilgit/history/";

import { VerdantPanel } from "./verdant/verdant-panel";

import { VerdantLanding } from "./verdant/verdant-landing";

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
    // Set up private singletons
    const linkHandler = {
      handleLink: (node: HTMLElement, path: string) => {
        app.commandLinker.connectNode(node, "docmanager:open", { path: path });
      },
    };
    landingPage = new Widget();

    // Set up singletons accessed by all instances
    fileManager = new FileManager(docManager);
    renderBaby = new RenderBaby(
      rendermime,
      latexTypesetter,
      linkHandler,
      fileManager
    );
    sidePanel = new StackedPanel();
    openGhostBook = __openGhostBook.bind(this, app);
    updateVerdantView = __layoutChange.bind(this, app);

    // Set up icon for Verdant tool in the main editor side panel
    restorer.add(sidePanel, "v-VerdantPanel");
    sidePanel.id = "v-VerdantPanel";
    sidePanel.title.iconClass = "verdant-log-icon jp-SideBar-tabIcon";
    sidePanel.title.caption = "Verdant Log";
    sidePanel.addWidget(landingPage);
    app.shell.add(sidePanel, "left", { rank: 600 });

    // Connect signal handlers for editor view change.
    (app.shell as LabShell).activeChanged.connect(() => updateVerdantView());

    // Create landing page
    loadLandingPage(landingPage);

    // Populate Verdant if a notebook is open
    updateVerdantView();
  },
  autoStart: true,
  requires: [
    ILayoutRestorer,
    IDocumentManager,
    IRenderMimeRegistry,
    renderers.ILatexTypesetter,
  ],
};

/*
 * Singletons used by all instances
 */
const instances: VerdantInstance[] = [];
let activeInstance: VerdantInstance;
let renderBaby: RenderBaby;
let fileManager: FileManager;
let sidePanel: StackedPanel;
let ghostWidget: Ghost;
let updateVerdantView: () => void;
let openGhostBook: (store: Store, ver: number) => Ghost;
let landingPage: Widget;

type VerdantInstance = {
  history: History;
  analysis: AST;
  ui: Widget;
  notebook: VerdantNotebook;
  panel: NotebookPanel;
  logger: VerdantLog;
};

/*
 * Determine if a notebook is showing and update Verdant to
 * show appropriate content for the user's current view
 */
function __layoutChange(app: JupyterFrontEnd) {
  let widget = app.shell.currentWidget;

  // normal notebook
  if (widget instanceof NotebookPanel) {
    // open Verdant for this current notebook
    let verInst = getInstance(widget);
    switchNotebook(verInst);
  } else {
    // hide Verdant content if notebook is not showing
    if (activeInstance) activeInstance.ui.hide();
    landingPage.show();
  }

  // log new layout
  logCurrentLayout();
}

/*
 * Switch Verdant instance
 */
function switchNotebook(verInst: VerdantInstance) {
  // check if we need to switch Verdant from a prior notebook
  if (!activeInstance || activeInstance !== verInst) {
    verInst.logger.log(
      "Jupyter Lab switching Notebook to " + verInst.notebook.name
    );
    if (activeInstance) activeInstance.ui.hide();
    fileManager.activeNotebook = verInst.notebook;
    activeInstance = verInst;
  }

  // make sure Verdant UI is showing for the current notebook
  activeInstance.ui.show();
  landingPage.hide();
}

/*
 * Retrieve a Verdant instance
 */
function getInstance(panel: NotebookPanel) {
  // be careful since 2+ panels can open for the same notebook
  let whichNotebook = panel.sessionContext.path;
  let verInst = instances.find(
    (inst) => inst.panel.sessionContext.path === whichNotebook
  );
  if (!verInst) {
    verInst = createVerdantInstance(panel);
    instances.push(verInst);
  }
  return verInst;
}

/*
 * Create new Verdant instance
 */
function createVerdantInstance(panel: NotebookPanel): VerdantInstance {
  let logger = new VerdantLog();
  let log_redux = logger.getReduxLogger();
  let history = new History(renderBaby, fileManager);
  const getHistory = () => history;
  let analysis = new AST(history);
  const initialState = createInitialState(getHistory);

  // create store for UI behavior
  let store: Store = createStore(
    verdantReducer,
    initialState,
    applyMiddleware(log_redux)
  );

  // create Verdant UI panel view
  let ui = createVerdantPanelUI(store);

  // set up notebook
  let notebook = new VerdantNotebook(history, analysis, panel, store, logger);

  // set up ghost book for this notebook
  store.dispatch(setGhostOpener(openGhostBook.bind(this, store)));

  // set up listener to close notebook
  panel.disposed.connect((_) => shutDownInstance(panel));

  // return new Verdant instance
  return { history, analysis, ui, notebook, panel, logger };
}

/*
 * Create Verdant UI side panel
 */
function createVerdantPanelUI(store: Store): Widget {
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
  return ui;
}

/*
 * Close a Verdant instance
 */
function shutDownInstance(panel: NotebookPanel) {
  // TODO
  console.log("NOTEBOOK CLOSED");
  updateVerdantView();
}

/*
 * Open Ghost Book for any given Verdant instance
 */
function __openGhostBook(app: JupyterFrontEnd, store: Store, ver: number) {
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
}

/*
 * Build landing page for Verdant to show when a notebook is not open
 */
function loadLandingPage(widget: Widget) {
  ReactDOM.render(React.createElement(VerdantLanding), widget.node);
}

/*
 * Log which system features are showing on layout change
 */
function logCurrentLayout() {
  // Log: what is showing?
  instances.map((ver) => {
    // start logging once there is an active instance
    let showing = {
      ghost: ghostWidget
        ? ghostWidget.isVisible && ghostWidget.getFile() === ver.notebook.path
        : false,
      sideBar: sidePanel
        ? sidePanel.isVisible && ver === activeInstance
        : false,
      notebook: ver.panel ? ver.panel.isVisible : false,
    };
    ver.logger.log("Jupyter Lab layout change:", JSON.stringify(showing));
  });
}

export default extension;
