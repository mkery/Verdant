import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  LabShell,
} from "@jupyterlab/application";
import { toArray } from "@lumino/algorithm";

import { Store } from "redux";

import { VerdantInstanceManager } from "./instance-manager";

import { Ghost } from "./verdant-ui/ghost-book/ghost";

import { IRenderMimeRegistry } from "@jupyterlab/rendermime";

import { IDocumentManager } from "@jupyterlab/docmanager";

import { NotebookPanel } from "@jupyterlab/notebook";

import { FileManager } from "./verdant-model/jupyter-hooks/file-manager";

import * as renderers from "@jupyterlab/rendermime";

import { Signal } from "@lumino/signaling";

/*
 * Load styles for all components
 */
import "../style/index.css";
import "../style/ghost.css";
import "../style/sampler.css";
import "../style/activity.css";
import "../style/verdant-panel.css";
import "../style/summary.css";
import "../style/landing.css";
import "../style/search.css";
import "../style/artifact-details.css";

import { RenderBaby } from "./verdant-model/jupyter-hooks/render-baby";
import { VerdantUI } from "./verdant-ui";

/**
 * Initialization data for the Verdant extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: "Verdant",
  activate: (
    app: JupyterFrontEnd,
    docManager: IDocumentManager,
    rendermime: IRenderMimeRegistry,
    latexTypesetter: renderers.ILatexTypesetter
  ) => {
    /*
     * Create app-level functions
     */
    const linkHandler = {
      handleLink: (node: HTMLElement, path: string) => {
        app.commandLinker.connectNode(node, "docmanager:open", { path: path });
      },
    };
    const fileManager = new FileManager(
      docManager,
      app.serviceManager.contents
    );
    const renderBaby = new RenderBaby(
      rendermime,
      latexTypesetter,
      linkHandler,
      fileManager
    );
    const openGhostBook = (ghostWidget: Ghost, store: Store, ver: number) =>
      __openGhostBook(app, ghostWidget, store, ver);
    const shutDownInstance = (panel) => __shutDownInstance(app, panel, manager);
    /*
     * Create instance manager to change what the app shows based on
     * which notebook is open
     */
    const sidePanel = new VerdantUI();
    const manager = new VerdantInstanceManager(
      sidePanel,
      renderBaby,
      fileManager,
      openGhostBook,
      shutDownInstance
    );

    /*
     * Create app UI
     */
    app.shell.add(sidePanel, "left", { rank: 600 });

    // Connect signal handlers for editor view change.
    (app.shell as LabShell).activeChanged.connect(() =>
      updateVerdantView(app, manager)
    );

    // Connect signal to shutdown everything
    (app.shell as LabShell).disposed.connect(() => {
      manager.dispose();
      Signal.clearData(this);
    });

    // Populate Verdant if a notebook is open
    updateVerdantView(app, manager);
  },
  autoStart: true,
  requires: [IDocumentManager, IRenderMimeRegistry, renderers.ILatexTypesetter],
};

/*
 * Determine if a notebook is showing and update Verdant to
 * show appropriate content for the user's current view
 */
function updateVerdantView(
  app: JupyterFrontEnd,
  manager: VerdantInstanceManager
) {
  let widget = app.shell.currentWidget;

  // normal notebook
  if (widget instanceof NotebookPanel) {
    // open Verdant for this current notebook
    let verInst = manager.getInstance(widget);
    manager.switchNotebook(verInst);
  } else {
    // hide Verdant content if notebook is not showing
    manager.activeInstance = undefined;
  }

  // log new layout
  manager.logCurrentLayout();
}

/*
 * Close a Verdant instance
 */
function __shutDownInstance(
  app: JupyterFrontEnd,
  panel: NotebookPanel,
  manager: VerdantInstanceManager
) {
  const index = manager.instances.findIndex((i) => i.panel === panel);
  if (index) {
    const inst = manager.instances[index];
    const path = inst.panel.sessionContext.path;
    if (manager.activeInstance === inst) manager.activeInstance = null;

    // dispose instance only if it's notebook is not open in another tab
    setTimeout(() => {
      // wait 2 minutes to see if they're gonna open up this tab again
      let openNotebook = toArray(app.shell.widgets("main")).find((widg) => {
        if (widg instanceof NotebookPanel)
          return widg.sessionContext.path === path;
      });
      if (!openNotebook) {
        let rem = manager.instances.splice(index, 1);
        rem.forEach((inst) => inst.notebook.dispose());
      }
    }, 120000);

    inst?.logger?.log("Notebook Closed");
    updateVerdantView(app, manager);
  }
}

/*
 * Open Ghost Book for any given Verdant instance
 */
function __openGhostBook(
  app: JupyterFrontEnd,
  ghostWidget: Ghost,
  store: Store,
  ver: number
) {
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

export default extension;
