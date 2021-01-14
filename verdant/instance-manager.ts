import { createStore, applyMiddleware, Store } from "redux";
import { VerdantLog } from "./verdant-ui/logger";
import {
  verdantReducer,
  createInitialState,
  setGhostOpener,
} from "./verdant-ui/redux/";

import { NotebookPanel } from "@jupyterlab/notebook";

import { FileManager } from "./verdant-model/jupyter-hooks/file-manager";

import { AST } from "./verdant-model/analysis/ast";

import { VerdantNotebook } from "./verdant-ui/verdant-notebook";

import { History } from "./verdant-model/history";

import { RenderBaby } from "./verdant-model/jupyter-hooks/render-baby";
import { VerdantUI } from "./verdant-ui";
import { Ghost } from "./verdant-ui/ghost-book/ghost";

export type VerdantInstance = {
  history: History;
  analysis: AST;
  notebook: VerdantNotebook;
  panel: NotebookPanel;
  logger: VerdantLog;
  store: Store;
};

export class VerdantInstanceManager {
  //app utilities
  private readonly fileManager: FileManager;
  private readonly renderBaby: RenderBaby;
  private readonly openGhostBook: (
    ghostPanel: Ghost,
    store: Store,
    ver: number
  ) => Ghost;
  private readonly shutDownInstance: (panel: NotebookPanel) => void;
  readonly ui: VerdantUI;

  // instances
  public instances: VerdantInstance[];
  private __activeInstance: VerdantInstance;
  private ghostPanel: Ghost;

  constructor(
    ui: VerdantUI,
    renderBaby: RenderBaby,
    fileManager: FileManager,
    openGhostBook,
    shutDownInstance
  ) {
    this.ui = ui;
    this.renderBaby = renderBaby;
    this.fileManager = fileManager;
    this.openGhostBook = openGhostBook;
    this.shutDownInstance = shutDownInstance;

    this.instances = [];
    this.__activeInstance = undefined;
  }

  public dispose() {
    this.instances.forEach((inst) => inst?.notebook?.dispose());
    this.instances = [];
  }

  public get activeInstance() {
    return this.__activeInstance;
  }

  public set activeInstance(inst: VerdantInstance) {
    this.__activeInstance = inst;
    this.ui.activeInstance = inst;
    this.ui.update();
  }

  /*
   * Retrieve a Verdant instance
   */
  getInstance(panel: NotebookPanel) {
    // be careful since 2+ panels can open for the same notebook
    let whichNotebook = panel.sessionContext.path;
    let verInst = this.instances.find(
      (inst) => inst.panel.sessionContext.path === whichNotebook
    );
    /*
     * This is important, if the panels don't match, we need to make sure
     * this instance has the right panel for the open notebook, or things like
     * inspector won't work
     */
    if (verInst && verInst.panel !== panel) {
      verInst.panel = panel; //update to new panel
      verInst.notebook.setPanel(panel); // update to new panel
    }

    if (!verInst) {
      verInst = this.createVerdantInstance(panel);
      this.instances.push(verInst);
    }
    return verInst;
  }

  /*
   * Create new Verdant instance
   */
  createVerdantInstance(panel: NotebookPanel): VerdantInstance {
    let logger = new VerdantLog();
    let log_redux = logger.getReduxLogger();
    let history = new History(this.renderBaby, this.fileManager);
    const getHistory = () => history;
    let analysis = new AST(history);
    const initialState = createInitialState(getHistory);

    // create store for UI behavior
    let store: Store = createStore(
      verdantReducer,
      initialState,
      applyMiddleware(log_redux)
    );

    // set up notebook
    let notebook = new VerdantNotebook(history, analysis, panel, store, logger);

    // set up ghost book for this notebook
    store.dispatch(
      setGhostOpener((ver: number) => {
        this.ghostPanel = this.openGhostBook(this.ghostPanel, store, ver);
      })
    );

    // set up listener to close notebook
    panel.disposed.connect((_) => this.shutDownInstance(panel));

    // return new Verdant instance
    return { history, analysis, notebook, panel, logger, store };
  }

  /*
   * Switch Verdant instance
   */
  switchNotebook(verInst: VerdantInstance) {
    // check if we need to switch Verdant from a prior notebook
    if (!this.activeInstance || this.activeInstance !== verInst) {
      verInst.logger.log(
        "Jupyter Lab switching Notebook to " + verInst.notebook.name
      );

      this.fileManager.activeNotebook = verInst.notebook;
      this.activeInstance = verInst;
    }
  }

  /*
   * Log which system features are showing on layout change
   */
  logCurrentLayout() {
    // Log: what is showing?
    this.instances.map((ver) => {
      // start logging once there is an active instance
      let showing = {
        ghost: this.ghostPanel
          ? this.ghostPanel.isVisible &&
            this.ghostPanel.getFile() === ver.notebook.path
          : false,
        sideBar: this.ui
          ? this.ui.isVisible && ver === this.activeInstance
          : false,
        notebook: ver.panel ? ver.panel.isVisible : false,
      };
      ver.logger.log("Jupyter Lab layout change:", JSON.stringify(showing));
    });
  }
}
