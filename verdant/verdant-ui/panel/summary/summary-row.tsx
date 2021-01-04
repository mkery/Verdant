import * as React from "react";
import { connect } from "react-redux";
import { verdantState } from "../../redux/";
import { History } from "../../../verdant-model/history";
import { RowPreview } from "./row-preview";
import {
  NodeyCell,
  Nodey,
  NodeyCode,
  NodeyOutput,
} from "../../../verdant-model/nodey";
import { Namer } from "../../../verdant-model/sampler";

type SummaryRow_Props = {
  history?: History;
  cell_index: number;
  cell?: NodeyCell;
  output?: NodeyOutput;
  showDetails: (n: Nodey) => void;
  focused: boolean;
};

export class Row extends React.Component<
  SummaryRow_Props,
  { sample: string; output_sample: string }
> {
  constructor(props: SummaryRow_Props) {
    super(props);
    this.state = { sample: "", output_sample: "" };
  }

  componentDidMount() {
    this.fetchArtifact();
  }

  private async fetchArtifact() {
    if (this.props.history && this.props.cell) {
      RowPreview.previewCell(this.props.history, this.props.cell).then(
        (sample) => {
          this.setState({ sample: sample.outerHTML });
        }
      );
      if (this.props.output)
        RowPreview.previewOutput(
          this.props.history,
          this.props.output
        ).then((sample) => this.setState({ output_sample: sample.outerHTML }));
    }
  }

  render() {
    return (
      <div>
        <div
          className={`v-VerdantPanel-Summary-table-row ${
            this.props.cell ? this.props.cell.typeChar : ""
          } ${this.props.focused ? "focused" : ""}`}
          onClick={() =>
            this.props.cell ? this.props.showDetails(this.props.cell) : null
          }
        >
          <div className="v-VerdantPanel-Summary-table-row-name">
            {Namer.getCellShortTitle(this.props.cell)}
          </div>
          <div className="v-VerdantPanel-Summary-table-row-version">
            {Namer.getVersionNumberLabel(this.props.cell?.version)}
          </div>
          <div
            className="v-VerdantPanel-Summary-table-row-sample"
            dangerouslySetInnerHTML={{ __html: this.state.sample }}
          ></div>
        </div>
        {this.showOutput()}
      </div>
    );
  }

  showOutput() {
    if (this.props.output) {
      return (
        <div
          className={`v-VerdantPanel-Summary-table-row o ${
            this.props.focused ? "focused" : ""
          }`}
          onClick={() =>
            this.props.output ? this.props.showDetails(this.props.output) : null
          }
        >
          <div className="v-VerdantPanel-Summary-table-row-name o">
            <div className="v-VerdantPanel-Summary-table-row-outputLabel">
              out
            </div>
          </div>
          <div className="v-VerdantPanel-Summary-table-row-version">
            {Namer.getVersionNumberLabel(this.props.output?.version)}
          </div>
          <div
            className="v-VerdantPanel-Summary-table-row-sample"
            dangerouslySetInnerHTML={{ __html: this.state.output_sample }}
          ></div>
        </div>
      );
    }
    return null;
  }
}

const mapStateToProps = (state: verdantState, ownProps: SummaryRow_Props) => {
  const history = state.getHistory();
  const cellDat = state.cellArtifacts[ownProps.cell_index];
  const cell = history.store.get(cellDat.name);
  let output;
  if (cell instanceof NodeyCode) {
    let outputHist = history.store.getOutput(cell);
    if (outputHist) output = outputHist.latest;
  }
  return {
    history,
    cell,
    output,
  };
};

export const SummaryRow = connect(mapStateToProps)(Row);
