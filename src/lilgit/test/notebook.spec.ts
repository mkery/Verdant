import { NotebookPanel, INotebookModel } from "@jupyterlab/notebook";
import { initNotebookContext } from "@jupyterlab/testutils";
import { JupyterServer } from "@jupyterlab/testutils/lib/start_jupyter_server";
import { Context } from "@jupyterlab/docregistry";

import * as utils from "./utils";

const server = new JupyterServer();

beforeAll(async () => {
  jest.setTimeout(20000);
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe("Creating a mock Jupyter Notebook", () => {
  let context: Context<INotebookModel>;

  beforeEach(async () => {
    context = ((await initNotebookContext()) as unknown) as Context<INotebookModel>;
  });

  afterEach(() => {
    context.dispose();
  });

  describe("#constructor()", () => {
    it("should create a notebook panel", () => {
      const content = utils.createNotebook();
      const panel = new NotebookPanel({ context, content });
      expect(panel).toBeInstanceOf(NotebookPanel);
    });
  });
});
