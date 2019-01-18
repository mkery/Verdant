# Verdant (still cooking :cake:, for release in May 2019)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

🌱🌿🌱 Verdant is a JupyterLab extension that automatically records history of all exteriments you run in a Jupyter notebook, and stores them in a tidy .ipyhistory JSON file designed to be work alongside and compliment any other version control you use, like SVN or Git. Verdant also visualizes history of individual cells, code snippets, markdown, and outputs for you, for quick checks and references as you work.

[Demo preview video](https://www.youtube.com/watch?v=4v_mHIJdZq0&t=4s) [![Verdant demo](https://img.youtube.com/vi/4v_mHIJdZq0/maxresdefault.jpg)](https://www.youtube.com/watch?v=4v_mHIJdZq0&t=4s)

For design discussion and the research behind this check out our [paper](https://marybethkery.com/projects/Verdant/Towards_effective_foraging_by_data_scientists.pdf):

> Mary Beth Kery, Bonnie E. John, Patrick O’Flaherty, Amber Horvath, and
> Brad A. Myers. 2019. Towards Effective Foraging by Data Scientists to Find
> Past Analysis Choices. In Proceedings of ACM SIGCHI, Glasgow, UK, May
> 2019 (CHI’19), 11 pages. DOI: 10.475/123 4

## Prerequisites

* JupyterLab

## Development Install

For a development install (requires npm version 4 or later), do the following in the repository directory:

```bash
npm install
npm run build
jupyter labextension link .
```

To rebuild the package and the JupyterLab app:

```bash
npm run build
jupyter lab build
```

## Acknowledgements
This research has been funded by Bloomberg L.P. and has been conducted at the Bloomberg L.P. and at the [Natural Programming Group](https://www.cs.cmu.edu/~NatProg/) at the [Human-Computer Interaction Institute](https://hcii.cmu.edu/) at Carnegie Mellon University. Thank you to the [JupyterLab project](https://github.com/jupyterlab/jupyterlab) and also to all our awesome study participants for volunteering early design feedback!
