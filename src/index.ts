import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import '../style/index.css';


/**
 * Initialization data for the Verdant extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'Verdant',
  autoStart: true,
  activate: (app: JupyterLab) => {
    console.log('JupyterLab extension Verdant is activated!');
  }
};

export default extension;
