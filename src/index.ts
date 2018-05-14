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


/**
 * Initialization data for the Verdant extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'Verdant',
  activate: (app: JupyterLab, restorer: ILayoutRestorer) => {
    console.log('JupyterLab extension Verdant is activated!');
    const { shell } = app;
    const panel = new StackedPanel();
    const tabs = new TabBar<Widget>({ orientation: 'vertical' });
    const header = document.createElement('header');
    //const contentPanel = new StackedPanel();

    restorer.add(panel, 'verdant-manager');
    panel.id = 'verdant-manager';
    panel.title.label = 'Verdant';

    tabs.id = 'verdant-manager-tabs';
    tabs.title.label = 'Verdant';
    header.textContent = 'History of notebook';
    tabs.node.insertBefore(header, tabs.contentNode);
    panel.addWidget(tabs)

    /*panel.addWidget(contentPanel)
    contentPanel.id = 'verdant-history-panel'
    contentPanel.node.textContent = "lolol";*/

    shell.addToLeftArea(panel, { rank: 600 });

    app.restored.then(() => {
      const populate = () => {
        tabs.clearTabs();
        each(shell.widgets('main'), widget => {
          if(widget instanceof NotebookPanel)
            tabs.addTab(widget.title);
        });
      };

      // Connect signal handlers.
      shell.layoutModified.connect(() => { populate(); });

      // Populate the tab manager.
      populate();
    });

  },
  autoStart: true,
  requires: [ILayoutRestorer]
};

export default extension;
