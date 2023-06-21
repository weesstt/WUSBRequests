window.addEventListener("load", init);

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, push, set, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

let searchBar, searchButton, errorMsgContainer, errorMsgText, searchValue, offset, searchResultsContainer, totalItems,
results, pageSelectorContainer, pageCountContainer, backSelectorButton, fwdSelectorButton, loader, ipAddress;

const spotifyAPI = new SpotifyWebApi();
const homeLocation = "/index.html";
const apiGatewayLocation = "https://qi51a8rg1m.execute-api.us-east-1.amazonaws.com/beta/authtoken";
const ipAddressFetchLocation = "https://api.ipify.org/?format=json";
const youtubeAPILocation = "https://youtube.googleapis.com/youtube/v3/search?part=snippet";

const firebaseConfig = {
  apiKey: "AIzaSyBUPeLhbqws2VRhvYo_PhiTM0WjODCSGcU",
  authDomain: "wusbrequests.firebaseapp.com",
  projectId: "wusbrequests",
  storageBucket: "wusbrequests.appspot.com",
  messagingSenderId: "297317053987",
  appId: "1:297317053987:web:c87a70e9feac539c6be396",
  measurementId: "G-75ZDGHPJCD",
  databaseURL: "https://wusbrequests-default-rtdb.firebaseio.com"
};
const app = initializeApp(firebaseConfig);
const database = getDatabase();
const musicTopicID = "%2Fm%2F04rlf";

/**
* Initializes HTML element variables when page loads, as well as populating information for search.
*/
async function init(){
  searchBar = document.getElementById("SearchBar");
  searchBar.addEventListener("keypress", searchEvent);
  searchButton = document.getElementById("SearchButton");
  searchButton.addEventListener("click", searchEvent);
  errorMsgContainer = document.getElementById("ErrorMessageContainer");
  errorMsgText = document.getElementById("ErrorMessageText");
  searchResultsContainer = document.getElementById("SearchResultsContainer");
  pageSelectorContainer = document.getElementById("PageSelectorContainer");
  pageCountContainer = document.getElementById("PageCountContainer");
  backSelectorButton = document.getElementById("BackSelectorButton");
  backSelectorButton.addEventListener("click", pageSelectorButtonEvent);
  fwdSelectorButton = document.getElementById("FwdSelectorButton");
  fwdSelectorButton.addEventListener("click", pageSelectorButtonEvent);
  loader = document.getElementById("Loader");

  if(!verifyParams()){
    loader.style.display = "none";
    displayNoResultsMessage();
    return;
  }

  searchBar.value = searchValue;

  ipAddress = await fetchIPAddress();
  await(authorizeSpotifyAPI());
  spotifyAPI.setAccessToken(tempKey);
  results = await executeSpotifySearch();
  if(results){
    loader.style.display = "none";
    for(const key in results){
      const track = results[key];
      SearchResultsContainer.appendChild(generateSearchResultElement(track));
    }
    displayPageSelectorElement(totalItems);
  }
}

/**
* Verifies the URL parameters to be valid.
* @return {boolean} Returns true if the URL params are valid, false otherwise. Valid params have at least the value
* parameter specified, if offset is not provided it is defaulted to 0.
*/
function verifyParams(){
  const params = Array.from(new URLSearchParams(window.location.search));
  searchValue = (params.find(param => param[0] === "value") ?? [null, null])[1];
  offset = parseInt((params.find(param => param[0] === "offset") ?? ["offset", "0"])[1]);
  if(params.length == 0 || !searchValue || offset > 91){
    return false;
  }
  return true;
}

/**
* Fetches Spotify Authentication Token and uses it to authorize the Spotify API.
*/
async function authorizeSpotifyAPI(){
  let tokenCookie = decodeURIComponent(document.cookie).split(";").find(cookie => cookie.includes("authToken"));
  if(!tokenCookie){
    return fetch(apiGatewayLocation, {method: 'GET'}).then((response) => {
      if(response.ok){
        return response.json();
      }
      throw new Error();
    }).then((data) => {
      if(data.statusCode != 200 || !data.body.access_token){
        loader.style.display = "none";
        displayErrorMessage("Something went wrong, please refresh the page.");
      }else{
        const authToken = data.body.access_token;
        const expiryTime = data.body.expires_in * 1000; //Time period in miliseconds that the token is valid
        const date = new Date();
        date.setTime(date.getTime() + (expiryTime));
        document.cookie = "authToken=" + authToken + ";expires=" + date.toUTCString() + ";path=/";
        spotifyAPI.setAccessToken(authToken);
      }
    }).catch((error) => {
      loader.style.display = "none";
      displayErrorMessage("Something went wrong, please refresh the page.");
    });
  }else{
    spotifyAPI.setAccessToken(tokenCookie.replace("authToken=", ""));
  }
}

/**
* Fetch public IP address of user to be stored in Firebase to view on requests table
* @return {String} A string representing the users ip address.
*/
async function fetchIPAddress(){
  const response = await fetch(
    ipAddressFetchLocation,
    {
      method: 'GET'
    }
  )
  .then((data) => data.json())
  .then((user) => {
    return user.ip;
  })
  .catch(() => {
    return "0.0.0.0";
  });

  return response;
}

/**
* Function that searches the Spotify API using the search parameter value.
* @return {Object} Returns an object with the results of the Spotify search, in the form of [uri: resultDataObject], if there are
* no results or an error occurs, undefined will be returned.
*/
async function executeSpotifySearch(){
  return spotifyAPI.searchTracks(searchValue, {limit: 9, offset: offset}).then(
    function (data){
      const resultMap = {};
      totalItems = data.tracks.total <= 100 ? parseInt(data.tracks.total) : 100;
      if(totalItems != 0){
        for(var i = 0; i < data.tracks.items.length; i++){
          const currentTrack = data.tracks.items[i];
          var artistsString = currentTrack.artists.reduce(
            (acc, currentVal) => acc + (currentVal.name + ", "),
            ""
          );
          artistsString = artistsString.substring(0, artistsString.length - 2);

          const trackDataObject = {
            imageURL: currentTrack.album.images[1].url, //300x300 image url from data
            songName: currentTrack.name,
            link: currentTrack.external_urls.spotify,
            uri: currentTrack.uri,
            explicit: currentTrack.explicit,
            artists: artistsString,
            timeStamp: Date.now(),
            ipAddress: ipAddress
          };
          resultMap[currentTrack.uri] = trackDataObject;
        }
        return resultMap;
      }else{
        loader.style.display = "none";
        displayNoResultsMessage();
        return;
      }
    },

    function (err){
      loader.style.display = "none";
      displayErrorMessage();
      return;
    }
  );
}

/**
* Generates an HTML element that displays the supplied track info.
* @param {Object} obj Contains the information to display for the track. Must include the fields,
* imageURL, songName, link, uri, explicit, artists, timeStamp.
* @return {Element} HTML element representing the information from the supplied track data object.
*/
function generateSearchResultElement(obj){
  const resultContainer = document.createElement("div");
  resultContainer.classList.add("resultContainer");

  const resultImage = document.createElement("img");
  resultImage.src = obj.imageURL;
  resultImage.style.width = "250px";
  resultImage.style.height = "250px";
  resultImage.style.margin = "30px 30px 10px 30px";
  resultContainer.appendChild(resultImage);

  const titleInfoContainer = document.createElement("div");
  titleInfoContainer.classList.add("titleInfoContainer");
  const titleInfoText = document.createElement("txt");
  titleInfoText.innerText = obj.songName;
  titleInfoText.classList.add("titleInfoText");
  titleInfoContainer.appendChild(titleInfoText);
  if(obj.explicit){
    titleInfoText.style.marginRight = "5px";
    const explicitIcon = document.createElement("img");
    explicitIcon.style.width = "30px";
    explicitIcon.style.height = "30px";
    explicitIcon.src = "explicitIcon.png";
    titleInfoContainer.appendChild(explicitIcon);
  }
  resultContainer.appendChild(titleInfoContainer);

  const artistsInfo = document.createElement("div");
  artistsInfo.classList.add("artistsInfo");
  artistsInfo.innerText = obj.artists;
  resultContainer.appendChild(artistsInfo);

  const requestButton = document.createElement("button");
  requestButton.innerText = "Request";
  requestButton.classList.add("requestButton");
  requestButton.id = obj.uri;
  requestButton.addEventListener('click', requestButtonEvent);
  resultContainer.appendChild(requestButton);

  const loader = document.createElement("div");
  loader.classList.add("lds-ring-request");
  loader.id = "requestLoader" + obj.uri;
  for(let i = 0; i < 4; i++){
    loader.appendChild(document.createElement("div"));
  }
  loader.style.display = "none";
  resultContainer.appendChild(loader);

  return resultContainer;
}

/**
* Configure display for the result page selector.
* @param {int} totalItems The total items in the results.
*/
function displayPageSelectorElement(totalItems){
  pageSelectorContainer.style.display = "flex";
  let endBound = offset + 9;
  if(offset == 0){offset++; endBound = 9;};
  pageCountContainer.innerText = (offset + " - " + endBound + " / " + totalItems);

  if(offset <= 9){
    fwdSelectorButton.classList.add("pageSelectorClickable");
  }else if(offset >= totalItems - 9){
    backSelectorButton.classList.add("pageSelectorClickable");
  }else{
    fwdSelectorButton.classList.add("pageSelectorClickable");
    backSelectorButton.classList.add("pageSelectorClickable");
  }
}

/**
* Function that is called whenever the request button is clicked on a search result. First tries to remove the
* specific uri if it is already in the database, then adds it again so that the timestamp gets updated.
* @param {Event} event The event that triggered the function.
*/
async function requestButtonEvent(event){
  const requestButton = event.target;
  const uri = requestButton.id;
  const trackObj = results[uri];
  const songListRef = ref(database, 'songs/' + uri);

  if(requestButton.classList.contains("requestedButton")){
    return;
  }

  requestButton.style.display = "none";
  const loader = document.getElementById("requestLoader" + trackObj.uri);
  loader.style.display = "flex";

  const youtubeID = await getYoutubeID(trackObj);

  trackObj.youtubeLink = youtubeID == null ? "N/A" : "https://www.youtube.com/watch?v=" + youtubeID;

  remove(songListRef)
  .then(() => {
    set(songListRef, trackObj)
    .then(() => {
      requestButton.innerText = "Requested"
      requestButton.classList.remove("requestButton");
      requestButton.classList.add("requestedButton");
      loader.style.display = "none";
      requestButton.style.display = "block";
    })
    .catch((error) => {
      console.error(error);
      displayErrorMessage();
      loader.style.display = "none";
      requestButton.style.display = "block";
      requestButton.classList.remove("requestButton");
      requestButton.classList.add("requestedButton");
      requestButton.innerText = "Error";
    })
  })
  .catch((error) => {
    console.error(error);
    displayErrorMessage();
    loader.style.display = "none";
    requestButton.style.display = "block";
    requestButton.classList.remove("requestButton");
    requestButton.classList.add("requestedButton");
    requestButton.innerText = "Error";
  });
}

/**
* Function to communicate with the YouTube API to be able to search for a corresponding  
* audio/lyric video for the specified trackObj
* @param {Object} trackObj The track object to find a corresponding YouTube source for.
* @return {String} The YouTube video ID, will be null if there is none found or a problem communicating with API.
*/
async function getYoutubeID(trackObj){
  const trackName = trackObj.songName;
  const artistsString = trackObj.artistsString;
  const response = await fetch(
    youtubeAPILocation + "&q=" + trackObj.songName + " " + trackObj.artists + "&topicId=" + musicTopicID + "&key=" + firebaseConfig.apiKey,
    {
      method: 'GET',
      headers: {
        "Accept": "application/json"
      }
    })
  .then((data) => data.json())
  .then((youtubeData) => {
      let audioID;
      let lyricID;
      for(let i = 0; i < youtubeData.items.length; i++){
        const resultObj = youtubeData.items[i];
        if(resultObj.snippet.title.toLowerCase().includes("audio")){
          audioID = resultObj.id.videoId;
        }else if(resultObj.snippet.title.toLowerCase().includes("lyric")){
          lyricID = resultObj.id.videoId;
        }
      }
      return audioID != null ? audioID : lyricID;
  })
  .catch(() => null);

  return response;
}

/**
* Function that is called whenever either page selector buttons are clicked.
* @param {Event} event The event that triggered the function.
*/
function pageSelectorButtonEvent(event){
  const button = event.target;
  let newOffset;
  if(button.id == "BackSelectorButton" && button.classList.contains("pageSelectorClickable")){
    newOffset = offset - 9;
  }else if(button.id == "FwdSelectorButton" && button.classList.contains("pageSelectorClickable")){
    newOffset = offset + 9;
  }
  if(newOffset){
    window.location = "/search?value=" + searchValue + "&offset=" + newOffset;
  }
}

/**
* Function that is called whenever the search button is clicked or the user presses enter and the
* search bar is not empty.
* @param {Event} event The event that triggered the function.
*/
function searchEvent(event){
  if(event && searchBar.value.length > 0){
    if((event.type == "keypress" && event.key == "Enter") || (event.type == "click")){
        window.location = "/search?value=" + searchBar.value + "&offset=0";
    }
  }
}

/**
* Displays the error message container on the page.
*/
function displayErrorMessage(str = "Something went wrong, please refresh the page and try again."){
  errorMsgContainer.style.display = "flex";
  errorMsgText.innerText = str;
}

/**
* Uses the error message container to display that no results were found.
*/
function displayNoResultsMessage(){
  errorMsgContainer.style.display = "flex";
  errorMsgContainer.style.backgroundColor = "white";
  errorMsgText.style.color = "#7290CB"
  errorMsgText.innerText = "No results found! Please try a different search query.";
}
