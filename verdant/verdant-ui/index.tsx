import { ReactWidget } from "@jupyterlab/apputils";
import * as React from "react";
import { Store } from "redux";
import { Provider } from "react-redux";
import Panel from "./panel";
import { LabIcon } from "@jupyterlab/ui-components";
import { VerdantInstance } from "../instance-manager";

/*
 * Icon for Verdant
 */
const verdantIconSvgStr = require("../../style/img/log-icon-4.svg");
export const verdantIcon = new LabIcon({
  name: "verdant",
  svgstr: verdantIconSvgStr.default,
});

/*
 * A class to show the current showing Verdant Instance
 */
export class VerdantUI extends ReactWidget {
  activeInstance: VerdantInstance;

  constructor() {
    super();
    this.activeInstance = undefined;

    // set up JupyterLab Widget boilerplate
    this.id = "v-VerdantPanel";
    this.addClass("v-Verdant-sidePanel");
    this.title.icon = verdantIcon;
    this.title.iconClass = "verdant-log-icon";
    this.title.caption = "Verdant Log";
  }

  dispose() {
    this.activeInstance?.notebook?.dispose();
    super.dispose();
  }

  protected render() {
    if (this.activeInstance)
      return <VerdantPanel store={this.activeInstance.store} />;
    return <VerdantLanding />;
  }
}

function VerdantLanding() {
  return (
    <div id="verdant-landing">
      <div id="verdant-landing-message">
        <div>Open up a notebook to see its history.</div>
        <div id="verdant-landing-img" />
      </div>
    </div>
  );
}

function VerdantPanel(props: { store: Store }) {
  return (
    <Provider store={props.store}>
      <Panel />
    </Provider>
  );
}
