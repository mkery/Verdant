import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  NotebookPanel
} from '@jupyterlab/notebook';

import {
  each
} from '@phosphor/algorithm';

import {
  TabBar, Widget, StackedPanel
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

/**
 * Initialization data for the Verdant extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'Verdant',
  activate: (app: JupyterLab, restorer: ILayoutRestorer) => {
    const { shell } = app;
    const panel = new StackedPanel();
    const tabs = new TabBar<Widget>({ orientation: 'vertical' });
    const header = document.createElement('header');
    var activePanel: NotebookPanel;

    var notebook : NotebookListen;
    const model = new Model()
    const astUtils = new ASTGenerate(model)

    restorer.add(panel, 'verdant-manager');
    panel.id = 'verdant-manager';
    panel.title.label = 'Verdant';

    tabs.id = 'verdant-manager-tabs';
    tabs.title.label = 'Verdant';
    header.textContent = 'History of notebook';
    tabs.node.insertBefore(header, tabs.contentNode);
    panel.addWidget(tabs)


    shell.addToLeftArea(panel, { rank: 600 });

    app.restored.then(() => {

      const populate = () => {
        tabs.clearTabs();
        var widg = shell.currentWidget
        if(widg instanceof NotebookPanel)
          if(!activePanel || activePanel !== widg)
          {
            activePanel = widg
            notebook = new NotebookListen(activePanel, astUtils, model)
            notebook.ready.then(() => {'Notebook is ready'})
          }
        each(shell.widgets('main'), widget => {
          if(widget instanceof NotebookPanel)
            tabs.addTab(widget.title);
        });
      };

      // Connect signal handlers.
      shell.layoutModified.connect(() => { populate(); });

      tabs.tabActivateRequested.connect((sender, tab) => {
        shell.activateById(tab.title.owner.id);
      });
      tabs.tabCloseRequested.connect((sender, tab) => {
        tab.title.owner.close();
      });

      // Populate the tab manager.
      populate();

    });

  },
  autoStart: true,
  requires: [ILayoutRestorer]
};

export default extension;
