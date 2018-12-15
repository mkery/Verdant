import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from "@jupyterlab/application";

import { IEditorServices } from "@jupyterlab/codeeditor";

import { IRenderMimeRegistry } from "@jupyterlab/rendermime";

import { IDocumentManager } from "@jupyterlab/docmanager";

import { NotebookPanel } from "@jupyterlab/notebook";

import { FileManager } from "./file-manager";

import { StackedPanel } from "@phosphor/widgets";

import * as renderers from "@jupyterlab/rendermime";

import "../style/index.css";
import "../style/ghost-book.css";
import "../style/cell-history.css";
import "../style/inspect.css";
import "../style/run-history.css";
import "../style/verdant-panel.css";

import { AST } from "./analysis/ast";

import { DocumentRegistry } from "@jupyterlab/docregistry";

import { VerNotebook } from "./components/notebook";

import { History } from "./model/history";

import { VerdantPanel } from "./panel/verdant-panel";

import { GhostBookFactory, GhostBookPanel } from "./ghost-book/ghost-model";

import { RenderBaby } from "./jupyter-hooks/render-baby";

/**
 * Initialization data for the Verdant extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: "Verdant",
  activate: (
    app: JupyterLab,
    restorer: ILayoutRestorer,
    docManager: IDocumentManager,
    rendermime: IRenderMimeRegistry,
    latexTypesetter: renderers.ILatexTypesetter,
    contentFactory: NotebookPanel.IContentFactory,
    editorServices: IEditorServices
  ) => {
    /*
    * Set up private singletons
    */
    const { shell } = app;
    const linkHandler = {
      handleLink: (node: HTMLElement, path: string) => {
        app.commandLinker.connectNode(node, "docmanager:open", { path: path });
      }
    };
    const ghostFactory = GhostBookFactory.registerFileType(
      app.docRegistry as DocumentRegistry,
      restorer,
      rendermime,
      contentFactory,
      editorServices
    );
    console.log("created ghost factory", ghostFactory);

    /*
    * Set up singletons acessed by all instances
    */
    fileManager = new FileManager(docManager);
    renderBaby = new RenderBaby(rendermime, latexTypesetter, linkHandler);
    sidePanel = new StackedPanel();

    restorer.add(sidePanel, "v-VerdantPanel");
    sidePanel.id = "v-VerdantPanel";
    sidePanel.title.label = "History";
    shell.addToLeftArea(sidePanel, { rank: 600 });
    /*
    * this is how we'll keep track of which notebook
    * we're looking at
    */
    let activeInstance: VerdantInstance = null;

    app.restored.then(() => {
      const populate = () => {
        let widg = shell.currentWidget;
        if (widg instanceof NotebookPanel) {
          let verInst = getInstance(widg);
          if (!activeInstance || activeInstance !== verInst) {
            if (activeInstance) activeInstance.ui.hide();
            activeInstance = verInst;
            activeInstance.ui.show();
          }
        } else if (widg instanceof GhostBookPanel) {
          if (activeInstance) activeInstance.ui.ghostBookOpened(widg);
        }
      };

      // Connect signal handlers.
      shell.layoutModified.connect(() => {
        populate();
      });

      // Populate the tab manager.
      populate();
    });
  },
  autoStart: true,
  requires: [
    ILayoutRestorer,
    IDocumentManager,
    IRenderMimeRegistry,
    renderers.ILatexTypesetter,
    NotebookPanel.IContentFactory,
    IEditorServices
  ]
};

const instances: VerdantInstance[] = [];
let renderBaby: RenderBaby;
let fileManager: FileManager;
let sidePanel: StackedPanel;

type VerdantInstance = {
  history: History;
  analysis: AST;
  ui: VerdantPanel;
  notebook: VerNotebook;
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
    let notebook = new VerNotebook(panel, history, analysis, ui);
    verInst = { history, analysis, ui, notebook, panel };
    instances.push(verInst);
    notebook.ready.then(() => {
      console.log("Notebook is ready");
    });
  }
  return verInst;
}

// TODO function shutDownInstance(panel: NotebookPanel)

export default extension;
