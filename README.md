# Verdant
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

🌱🌿🌱 Verdant is a JupyterLab extension that automatically records history of all experiments you run in a Jupyter notebook, and stores them in a tidy .ipyhistory JSON file designed to be work alongside and compliment any other version control you use, like SVN or Git. Verdant also visualizes history of individual cells, code snippets, markdown, and outputs for you, for quick checks and references as you work.

[Thoughts? We're super interested in making Verdant serve data scientists well. --> Feedback Survey](https://forms.gle/cdqdV1LzwStzk2Qy7)

![Demo Screenshot](tutorial/images/Screenshots/out.gif)
Figure alt text: 
> The history tab opens the sidebar for Verdant containing three tabs: Activity, Artifacts, and Search. In the currently open Artifacts tab,
> the user click on a large button titled "Version Inspector". Once clicked, the inspector is active, and now when the user mouses over different
> parts of their notebook, cells and output highlight blue. The use mouses over a code cell and clicks it. The inspector opens up a full history of 
> that code cell with diff highlighting in the side bar of Verdant.


[[Full demo on YouTube]](https://www.youtube.com/watch?v=4v_mHIJdZq0&t=4s)

For design discussion and the research behind this check out our [paper](https://marybethkery.com/projects/Verdant/Towards_effective_foraging_by_data_scientists.pdf):

> Mary Beth Kery, Bonnie E. John, Patrick O’Flaherty, Amber Horvath, and
> Brad A. Myers. 2019. Towards Effective Foraging by Data Scientists to Find
> Past Analysis Choices. In Proceedings of ACM SIGCHI, Glasgow, UK, May
> 2019 (CHI’19), 11 pages. DOI: 10.475/123 4

## Install
1. __Jupyterlab__: Verdant works with > JupyterLab 3 (latest version). To install or update your JupyterLab: 
  * with pip: `pip install jupyterlab -U` 
  * with conda: `conda install -c conda-forge jupyterlab`
  * to check version: `jupyter lab --version`
  * _for windows users!_: due to a bug with lab extensions in earlier 3.0 releases, be sure you have >= `3.0.7` of JupyterLab
2. __NodeJs__: Jupyterlab needs node to configure and install extensions, not just Verdant
  * to check if you have node installed `node --version`
  * to install: [Official NodeJS installers](https://nodejs.org/en/download/)
3. __Verdant__:
  * command line `jupyter labextension install verdant-history`
  * OR open Jupyterlab with `jupyter lab .` and find Verdant in the extensions menu (side panel icon button with the puzzle piece) by searching `verdant`
4. :tada: If all has gone well, you'll see Verdant's log with a leaf icon in the left pane of Jupyterlab! :tada:
  * if not, please file an issue with what error you're getting and we'll fix it promptly

## Develop

For a development install, do the following in the repository directory:

```bash
yarn
yarn build
yarn start
```

The last line installs Verdant as an extension and builds JupyterLab. It may take a minute. Upon a successful build, Jupyter Lab will launch in your browser window.

If you make modifications to the Verdant source code, you'll need to rebuild the package and the JupyterLab app:

```bash
yarn build
yarn start
```

If you plan on making lots of edits to Verdant, extension building is easier if you use:

```bash
jupyter lab --watch
```

and then each time you make a change, you'll only have to re-run:

```bash
yarn build
```


## Acknowledgements
This research has been funded by Bloomberg L.P. and has been conducted at the Bloomberg L.P. and at the [Natural Programming Group](https://www.cs.cmu.edu/~NatProg/) at the [Human-Computer Interaction Institute](https://hcii.cmu.edu/) at Carnegie Mellon University. Thank you to the [JupyterLab project](https://github.com/jupyterlab/jupyterlab) and also to all our awesome study participants for volunteering early design feedback!
