import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  LabShell
} from "@jupyterlab/application";

import { log } from "./lilgit/components/notebook";

import { Ghost } from "./verdant/ghost-book/ghost";

import { IRenderMimeRegistry } from "@jupyterlab/rendermime";

import { IDocumentManager } from "@jupyterlab/docmanager";

import { NotebookPanel } from "@jupyterlab/notebook";

import { FileManager } from "./lilgit/jupyter-hooks/file-manager";

import { StackedPanel } from "@phosphor/widgets";

import * as renderers from "@jupyterlab/rendermime";

import "../style/index.css";
import "../style/ghost.css";
import "../style/sampler.css";
import "../style/activity.css";
import "../style/verdant-panel.css";

import { AST } from "./lilgit/analysis/ast";

import { VerdantNotebook } from "./verdant/verdant-notebook";

import { History } from "./lilgit/model/history";

import { VerdantPanel } from "./verdant/panel/verdant-panel";

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
      }
    };

    /*
     * Set up singletons acessed by all instances
     */
    fileManager = new FileManager(docManager);
    renderBaby = new RenderBaby(rendermime, latexTypesetter, linkHandler);
    sidePanel = new StackedPanel();
    openGhostBook = (
      history: History,
      panel: VerdantPanel,
      notebook: number
    ) => {
      let widget: Ghost = new Ghost(history, panel, notebook);
      if (!widget.isAttached) {
        // Attach the widget to the main work area if it's not there
        app.shell.add(widget, "main");
      }
      // Activate the widget
      app.shell.activateById(widget.id);

      return widget;
    };

    restorer.add(sidePanel, "v-VerdantPanel");
    sidePanel.id = "v-VerdantPanel";
    sidePanel.title.label = "Verdant";
    app.shell.add(sidePanel, "left", { rank: 600 });

    /*
     * this is how we'll keep track of which notebook
     * we're looking at
     */
    let activeInstance: VerdantInstance = null;
    const populate = () => {
      let widg = app.shell.currentWidget;
      if (widg instanceof NotebookPanel) {
        let verInst = getInstance(widg);
        if (!activeInstance || activeInstance !== verInst) {
          if (activeInstance) activeInstance.ui.hide();
          activeInstance = verInst;
          activeInstance.ui.show();
        }
      }
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
    renderers.ILatexTypesetter
  ]
};

const instances: VerdantInstance[] = [];
let renderBaby: RenderBaby;
let fileManager: FileManager;
let sidePanel: StackedPanel;
let openGhostBook: (
  history: History,
  panel: VerdantPanel,
  ver: number
) => Ghost;

type VerdantInstance = {
  history: History;
  analysis: AST;
  ui: VerdantPanel;
  notebook: VerdantNotebook;
  panel: NotebookPanel;
};

function getInstance(panel: NotebookPanel) {
  let verInst = instances.find(inst => inst.panel.id === panel.id);
  if (!verInst) {
    /*
     * Create instance
     */
    let history = new History(renderBaby, fileManager);
    let analysis = new AST(history);
    let ui = new VerdantPanel(history);
    sidePanel.addWidget(ui);
    let notebook = new VerdantNotebook(
      panel,
      history,
      analysis,
      ui,
      openGhostBook
    );
    verInst = { history, analysis, ui, notebook, panel };
    instances.push(verInst);
    notebook.ready.then(() => {
      log("Notebook is ready");
    });
  }
  return verInst;
}

// TODO function shutDownInstance(panel: NotebookPanel)

export default extension;
