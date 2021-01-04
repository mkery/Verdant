import * as React from "react";
import { Nodey } from "../../../verdant-model/nodey";
import { Namer } from "../../../verdant-model/sampler";
import Artifact from "./artifact";

export type Origin_Props = {
  derived: Nodey;
  nodey: Nodey;
};

export default class ArtifactOrigin extends React.Component<Origin_Props> {
  render() {
    return (
      <div className="v-VerdantPanel-details-artifact">
        <div key={1}>
          <div className="v-VerdantPanel-details-origin-header">
            {`${Namer.getCellShortTitle(
              this.props.derived
            )} was created from ${Namer.getCellTitle(this.props.nodey)}`}
          </div>
        </div>
        <Artifact nodey={this.props.nodey} />
      </div>
    );
  }
}
