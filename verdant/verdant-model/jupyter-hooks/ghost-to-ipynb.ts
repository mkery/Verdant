import { NotebookModel } from "@jupyterlab/notebook";
import { History, OutputHistory } from "../history";
import {
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyNotebook,
  NodeyRawCell,
} from "../nodey";
import * as nbformat from "@jupyterlab/nbformat";
import { CodeCellModel, ICellModel } from "@jupyterlab/cells";

export namespace GhostToNotebookConverter {
  export async function convert(history: History, notebook: NodeyNotebook) {
    const ver_notebook = history.notebook;

    // first match language of notebook
    let metadata = ver_notebook.metadata;
    let options: NotebookModel.IOptions = {};
    let lang = metadata?.get("language_info") as nbformat.ILanguageInfoMetadata;
    if (lang) options["languagePreference"] = lang.name;

    let model = new NotebookModel(options);

    // now create cells
    await Promise.all(
      notebook?.cells?.map(async (name, index) => {
        let cell = history.store.get(name);
        let val: ICellModel;

        // create a CellModel with the Nodey's text
        if (cell instanceof NodeyCodeCell) {
          val = model.contentFactory.createCodeCell({});
          val.value.text = cell.literal || "";

          // create outputs if needed
          let output = history.store.getOutput(cell);
          if (output) {
            let nodeyOut = output.latest;
            let rawList = await Promise.all(
              nodeyOut.raw.map(async (raw) => {
                if (raw) {
                  if (OutputHistory.isOffsite(raw)) {
                    raw = await history.store.fileManager.getOutput(raw);
                  }
                  return raw as nbformat.IOutput;
                }
                return null;
              })
            );
            rawList.forEach((raw, index) => {
              if (raw) {
                let out = (val as CodeCellModel).outputs.contentFactory.createOutputModel(
                  { value: raw }
                );
                (val as CodeCellModel).outputs.set(index, out.toJSON());
              }
            });
          }
          //(val as ICodeCellModel).outputs.contentFactory.createOutputModel({})
        } else if (cell instanceof NodeyMarkdown) {
          val = model.contentFactory.createMarkdownCell({});
          val.value.text = cell.markdown || "";
        } else if (cell instanceof NodeyRawCell) {
          val = model.contentFactory.createRawCell({});
          val.value.text = cell.literal || "";
        }

        if (val) model.cells.insert(index, val);
      })
    );

    return model;
  }
}
