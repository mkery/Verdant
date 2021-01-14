import { NotebookPanel, INotebookModel } from "@jupyterlab/notebook";
import { initNotebookContext } from "@jupyterlab/testutils";
import { JupyterServer } from "@jupyterlab/testutils/lib/start_jupyter_server";
import { Context } from "@jupyterlab/docregistry";
import { NBTestUtils } from "@jupyterlab/testutils";
import { RenderMimeRegistry } from "@jupyterlab/rendermime";

import { RenderBaby } from "../verdant-model/jupyter-hooks/render-baby";
import { FileManager } from "../verdant-model/jupyter-hooks/file-manager";
import { History } from "../verdant-model/history";
import { AST } from "../verdant-model/analysis/ast";

import * as utils from "./jupyterlab_utils";
import { VerNotebook } from "../verdant-model/notebook";
import { ContentsManager } from "@jupyterlab/services";

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

  describe("new NotebookPanel", () => {
    it("should create a notebook panel", () => {
      const content = utils.createNotebook();
      const panel = new NotebookPanel({ context, content });

      expect(panel).toBeInstanceOf(NotebookPanel);
    });
  });

  describe("new RenderBaby", () => {
    it("should create a RenderBaby", () => {
      const renderMime = (NBTestUtils.defaultRenderMime() as unknown) as RenderMimeRegistry;
      const contentsManager = new ContentsManager();
      const fileManager = new FileManager(null, contentsManager, true);
      const renderBabe = new RenderBaby(
        renderMime,
        renderMime.latexTypesetter,
        renderMime.linkHandler,
        fileManager
      );

      expect(renderBabe).toBeInstanceOf(RenderBaby);
      contentsManager.dispose();
    });
  });

  describe("new VerNotebook", () => {
    it("should create a Verdant Notebook", () => {
      // create mock I/O utils
      const renderMime = (NBTestUtils.defaultRenderMime() as unknown) as RenderMimeRegistry;
      const contentsManager = new ContentsManager();
      const fileManager = new FileManager(null, contentsManager, true);
      const renderBaby = new RenderBaby(
        renderMime,
        renderMime.latexTypesetter,
        renderMime.linkHandler,
        fileManager
      );
      expect(renderBaby).toBeInstanceOf(RenderBaby);

      // create mock history
      const history = new History(renderBaby, fileManager);
      expect(history).toBeInstanceOf(History);

      // create analysis
      const analysis = new AST(history);
      expect(analysis).toBeInstanceOf(AST);

      // create mock notebook panel
      const content = utils.createNotebook();
      const panel = new NotebookPanel({ context, content });
      expect(panel).toBeInstanceOf(NotebookPanel);

      // finally create ver notebook
      const verNotebook = new VerNotebook(history, analysis, panel);
      expect(verNotebook).toBeInstanceOf(VerNotebook);

      contentsManager.dispose();
    });
  });
});
