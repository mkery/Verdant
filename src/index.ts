import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  NotebookPanel
} from '@jupyterlab/notebook';

import {
  StackedPanel
} from '@phosphor/widgets';

import '../style/index.css';

import {
  ASTGenerate
} from './ast-generate';

import {
  NotebookListen
} from './notebook-listen'

import {
  Model
} from './model'

import {
  VerdantPanel
} from './widgets/verdant-panel'

/**
 * Initialization data for the Verdant extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'Verdant',
  activate: (app: JupyterLab, restorer: ILayoutRestorer) => {
    const { shell } = app;
    const panel = new StackedPanel();
    var activePanel: NotebookPanel;

    var notebook : NotebookListen;
    const model = new Model(0)
    const astUtils = new ASTGenerate(model)

    restorer.add(panel, 'v-VerdantPanel');
    panel.id = 'v-VerdantPanel';
    panel.title.label = 'Verdant';
    const verdantPanel = new VerdantPanel(model)
    panel.addWidget(verdantPanel)


    shell.addToLeftArea(panel, { rank: 600 });

    app.restored.then(() => {

      const populate = () => {
        var widg = shell.currentWidget
        if(widg instanceof NotebookPanel)
        {
          verdantPanel.onNotebookSwitch(widg)
          if(!activePanel || activePanel !== widg)
          {
            activePanel = widg
            notebook = new NotebookListen(activePanel, astUtils, model)
            notebook.ready.then(() => {
              console.log('Notebook is ready')
            })
          }
        }
      };

      // Connect signal handlers.
      shell.layoutModified.connect(() => { populate(); })

      // Populate the tab manager.
      populate()

    })

  },
  autoStart: true,
  requires: [ILayoutRestorer]
}

export default extension;
