import * as React from "react";
import { SearchIcon } from "../../icons";
import { searchForText } from "../../redux/index";
import { connect } from "react-redux";

type SearchBar_Props = {
  searchFor: (string) => void;
};

type SearchBar_State = {
  searchbox_text: string;
};

class SearchBar extends React.Component<SearchBar_Props, SearchBar_State> {
  constructor(props: SearchBar_Props) {
    super(props);
    this.state = {
      searchbox_text: "",
    };
  }

  render() {
    return (
      <div className="v-VerdantPanel-searchContainer">
        <SearchIcon />
        <input
          className="v-VerdantPanel-searchText"
          contentEditable={true}
          placeholder="search history by keyword"
          value={this.state.searchbox_text}
          onChange={(ev) => {
            this.setState({ searchbox_text: ev.target.value });
          }}
          onKeyDown={(ev) => {
            if (ev.keyCode === 13) {
              ev.preventDefault();
              ev.stopPropagation();
              this.props.searchFor(this.state.searchbox_text);
            }
          }}
        ></input>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    searchFor: (text: string) => dispatch(searchForText(text)),
  };
};

export default connect(null, mapDispatchToProps)(SearchBar);
