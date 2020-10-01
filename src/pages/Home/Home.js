import React from "react";
import { useHistory } from "react-router-dom";

import SearchBar from '../../components/SearchBar/SearchBar';

import "../../pages/Search/Search.css";

export default function Home() {

  const searchStyle = {
    margin: "5em",
    maxWidth: "45%",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto"
  }

  const imageStyle = {
    maxHeight: "12em",
    width: "auto",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
    marginBottom: "0"
  }

  const text = {
    textAlign: "center"
  }


  const history = useHistory();
  const navigateToSearchPage = (q) => {
    console.log(q);
    history.push('/search?q=' + q);
  }

  return (
    <div>
      <div className="row" style={searchStyle}>
        <img style={imageStyle} src="/cognitive-search.png" alt="cognitive search logo"></img>
        <p style={text} className="lead">Powered by Azure Cognitive Search</p>
        <SearchBar postSearchHandler={navigateToSearchPage}></SearchBar>
      </div>
    </div>
  );
};
