# Verdant (still cooking :cake: dev version)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

An experimental tool building local versioning into Jupyter Lab. Verdant is in active development and we're expecting the initial beta release for everyone to use in May 2019. 

## Prerequisites

* JupyterLab

## Development

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
