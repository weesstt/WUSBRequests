window.addEventListener("load", init);

var searchBar, searchButton, errorMsgContainer, errorMsgText;

/**
* Initializes HTML element variables when page loads and create an anon user with firebase.
*/
function init(){
  searchBar = document.getElementById("SearchBar");
  searchBar.addEventListener("keypress", searchEvent)
  searchButton = document.getElementById("SearchButton");
  searchButton.addEventListener("click", searchEvent);
  errorMsgContainer = document.getElementById("ErrorMessageContainer");
  errorMsgText = document.getElementById("ErrorMessageText");
}

/**
* Function that is called whenever the search button is clicked or the user presses enter and the
* search bar is not empty.
* @param {Event} event Event that triggered the function
*/
function searchEvent(event){
  const searchVal = searchBar.value;
  if(event && searchVal.length > 0){
    if((event.type == "keypress" && event.key == "Enter") || (event.type == "click")){
        window.location = "/search?value=" + searchBar.value + "&offset=0";
    }
  }
}
