# Verdant (still cooking :cake:, for release in May 2019)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

🌱🌿🌱 Verdant is a JupyterLab extension that automatically records history of all experiments you run in a Jupyter notebook, and stores them in a tidy .ipyhistory JSON file designed to be work alongside and compliment any other version control you use, like SVN or Git. Verdant also visualizes history of individual cells, code snippets, markdown, and outputs for you, for quick checks and references as you work.

[[Demo preview video]](https://www.youtube.com/watch?v=4v_mHIJdZq0&t=4s) [![Verdant demo](https://github.com/mkery/Verdant/blob/master/design/verdant_run.jpg?raw=true)](https://www.youtube.com/watch?v=4v_mHIJdZq0&t=4s)
Figure description: 
> The history tab opens the sidebar for Verdant containing three tabs: Activity (A), Artifacts (B), and Search
(C). The Activity tab, shown open here, displays a list of events. A date (D) can be opened or collapsed to see what
happened that day. Each row shows a version of the notebook (e.g. version #53) with a text description and visual minimap.
Thee minimap shows cells added in green (see G) and deleted in red (F). In (E), a cell was edited and run (in blue), and the
following cells were run but remained the same (in grey). The user can open any version (e.g., #53, H) in a ghost
notebook tab for quick reference.


For design discussion and the research behind this check out our [paper](https://marybethkery.com/projects/Verdant/Towards_effective_foraging_by_data_scientists.pdf):

> Mary Beth Kery, Bonnie E. John, Patrick O’Flaherty, Amber Horvath, and
> Brad A. Myers. 2019. Towards Effective Foraging by Data Scientists to Find
> Past Analysis Choices. In Proceedings of ACM SIGCHI, Glasgow, UK, May
> 2019 (CHI’19), 11 pages. DOI: 10.475/123 4

## Prerequisites

* JupyterLab

## Development Install

For a development install, do the following in the repository directory:

```bash
pip install lilgit-parser
jupyter serverextension enable --py lilgit_parser
jupyter serverextension list
```
This should ensure that the server-extension parser part of Verdant is installed. Next:

```bash
npm install
npm run build
jupyter labextension link .
```

The last line builds JupyterLab and may take a minute. Now, run JupyterLab app to check if Verdant is working:

```
jupyter lab .
```

If you make modifications to the Verdant source code, you'll need to rebuild the package and the JupyterLab app:

```bash
npm run build
jupyter lab build
```

If you plan on making lots of edits to Verdant, extension building is easier if you use:

```bash
jupyter lab --watch
```

and then each time you make a change, you'll only have to re-run:

```bash
npm run build
```


## Acknowledgements
This research has been funded by Bloomberg L.P. and has been conducted at the Bloomberg L.P. and at the [Natural Programming Group](https://www.cs.cmu.edu/~NatProg/) at the [Human-Computer Interaction Institute](https://hcii.cmu.edu/) at Carnegie Mellon University. Thank you to the [JupyterLab project](https://github.com/jupyterlab/jupyterlab) and also to all our awesome study participants for volunteering early design feedback!
