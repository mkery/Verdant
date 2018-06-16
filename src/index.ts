import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from "@jupyterlab/application";

import { NotebookPanel } from "@jupyterlab/notebook";

import { StackedPanel } from "@phosphor/widgets";

import * as renderers from "@jupyterlab/rendermime";

import "../style/index.css";

import { ASTGenerate } from "./analysis/ast-generate";

import { NotebookListen } from "./jupyter-hooks/notebook-listen";

import { HistoryModel } from "./history-model";

import { VerdantPanel } from "./widgets/verdant-panel";

import { RenderBaby } from "./jupyter-hooks/render-baby";

/**
 * Initialization data for the Verdant extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: "Verdant",
  activate: (
    app: JupyterLab,
    restorer: ILayoutRestorer,
    latexTypesetter: renderers.ILatexTypesetter
  ) => {
    const { shell } = app;
    const panel = new StackedPanel();
    var activePanel: NotebookPanel;
    const linkHandler = {
      handleLink: (node: HTMLElement, path: string) => {
        app.commandLinker.connectNode(node, "docmanager:open", { path: path });
      }
    };
    var notebook: NotebookListen;
    const renderBaby = new RenderBaby(latexTypesetter, linkHandler);
    const model = new HistoryModel(0, renderBaby);
    const astUtils = new ASTGenerate(model);

    restorer.add(panel, "v-VerdantPanel");
    panel.id = "v-VerdantPanel";
    panel.title.label = "Verdant";
    const verdantPanel = new VerdantPanel(model);
    panel.addWidget(verdantPanel);

    shell.addToLeftArea(panel, { rank: 600 });

    app.restored.then(() => {
      const populate = () => {
        var widg = shell.currentWidget;
        if (widg instanceof NotebookPanel) {
          verdantPanel.onNotebookSwitch(widg);
          if (!activePanel || activePanel !== widg) {
            activePanel = widg;
            notebook = new NotebookListen(activePanel, astUtils, model);
            notebook.ready.then(() => {
              console.log("Notebook is ready");
            });
          }
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
  requires: [ILayoutRestorer, renderers.ILatexTypesetter]
};

export default extension;
