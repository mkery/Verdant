import { Kernel } from "@jupyterlab/services";

import { IClientSession } from "@jupyterlab/apputils";

export class KernelListen {
  kernel: Kernel.IKernelConnection;
  session: IClientSession;

  constructor(session: IClientSession) {
    this.session = session;
    this.kernel = this.session.kernel;
    this.listen();
  }

  get kernelReady(): Promise<void> {
    return this.ready();
  }

  get path(): string {
    return this.session.path;
  }

  async ready(): Promise<void> {
    await this.session.ready;
    return this.kernel.ready;
  }

  private listen() {
    this.session.kernelChanged.connect(
      this.onKernelChanged,
      this
    );
  }

  private onKernelChanged(sender: any, kernel: Kernel.IKernelConnection) {
    this.kernel = kernel;
  }
}
