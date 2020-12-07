# `./verdant` Overview

`./verdant` is the 'view' side of Verdant, responsible for all user-facing interactions, UI components, and logging a user's interactions with the UI components.

---

### `verdant-panel.tsx`

`VerdantPanel` is the React base component for Verdant's user interface. As the name suggests, the UI displays in a tool side panel of the user's Jupyter Lab editing environnement.

### `./verdant-notebook.ts`

`VerdantNotebook` hooks into Verdant's own internal API for listening to events and retrieving data about the user's currently open Jupyter notebook.

### `logger.ts`

`VerdantLog` is the base class for collecting and writing a log of all user interactions in Verdant's UI. This log is for development and experiment purposes where we want to record how user's use Verdant. It is not needed for production purposes.

### `./panel`

This is the main folder for all of Verdant's UI components that are displayed in the `VerdantPanel` side panel.

### `./ghost-book`

This is the main folder for all Ghost Book UI components. The Ghost Book is essentially a way for the user to preview an entire past notebook from their history, and it opens up in the user's Jupyter Lab main pane as an (immutable) Jupyter Notebook.

### `./redux`

This folder contains a basic central redux store for collecting user interaction logs for `VerdantLog`. It provides a central hub for different UI components to report user clicks or activity.

### `./sampler`

This folder contains a bunch of utility functionality for pretty-printing and rendering different kinds of code, markdown, and output content from the user's history.
