# Verdant (still cooking :cake: dev version)

An experimental tool building local versioning into Jupyter Lab. Verdant is in active development and we're expecting the initial beta release for everyone to use in September 2018. 

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
