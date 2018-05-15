import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  KernelMessage, Kernel
} from '@jupyterlab/services';

import {
  NotebookPanel, Notebook
} from '@jupyterlab/notebook';

import {
  each
} from '@phosphor/algorithm';

import {
  TabBar, Widget, StackedPanel
} from '@phosphor/widgets';

import '../style/index.css';

import * as path from 'path';

//import * as fs from 'fs-extra';

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
    var activePanel: NotebookPanel;
    var activeKernel: Kernel.IKernelConnection;
    var notebook : Notebook; //the currently active notebook Verdant is working on
    //const parserText : string = fs.readFileSync('py2ast.py', 'utf-8')
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
        var widg = shell.currentWidget
        if(widg instanceof NotebookPanel)
          if(!activePanel || activePanel !== widg)
          {
            activePanel = widg
            activePanel.ready.then(() => {
              notebook = activePanel.notebook
              openHistory()
            })
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

      const getKernel = (): Promise<Kernel.IKernelConnection> => {
        return new Promise((accept, reject) => {
          if(!activeKernel && activePanel.context.session.kernel)
             accept(activePanel.context.session.kernel)
          else
          {
              Kernel.startNew().then(kernel => (accept(kernel)))
          }
        })
      }

      //testing get code from Notebook
      const openHistory = () => {
        console.log("active notebook is", notebook)
        getKernel().then((kernel: Kernel.IKernelConnection) => {
          activeKernel = kernel
          notebook.widgets.forEach( (item, index) => {
            console.log("found cell", item)
            var text : string = item.editor.model.value.text
            console.log("text is ", text)
            codeToAst(text, kernel)
          })
        })
      }

      const codeToAst = (code: string, kernel: Kernel.IKernelConnection): Promise<KernelMessage.IExecuteReplyMsg> => {
        //console.log("we're going to run ", parserText)
        var command = "%run ./py2ast "+code

        // Override the default for `stop_on_error`.
        let content: KernelMessage.IExecuteRequest = {
          code: command,
          stop_on_error: true
        };
        let future = kernel.requestExecute(content, false);
        future.onReply = (msg: KernelMessage.IExecuteReplyMsg): void => {
          console.log(": ", msg.content)
        }
        future.onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
          console.log(": ", msg.content)
        }
        return future.done as Promise<KernelMessage.IExecuteReplyMsg>;
      }


    });

  },
  autoStart: true,
  requires: [ILayoutRestorer]
};

export default extension;
