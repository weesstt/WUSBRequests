window.addEventListener("load", init, false);
// Import the functions you need from the SDKs you need
import {initializeApp} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {getAnalytics} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-analytics.js";
import {getAuth, signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase, ref, onChildAdded, onChildChanged, onChildRemoved, query, orderByChild, limitToLast, onValue, get, child, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "***REMOVED***",
  authDomain: "wusbrequests.firebaseapp.com",
  projectId: "wusbrequests",
  storageBucket: "wusbrequests.appspot.com",
  messagingSenderId: "297317053987",
  appId: "1:297317053987:web:c87a70e9feac539c6be396",
  measurementId: "G-75ZDGHPJCD",
  databaseURL: "https://wusbrequests-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const database = getDatabase();
var emptyTableVisible = true;
let emptyTableMessageDiv, requestsTable, errorMsgContainer, errorMsgText, pageSelectorContainer, pageSelectorDiv;


/**
* Function that checks if the user is logged in and if they are initializes the HTML element variables. If they are not
* logged in, it sends them to the login page.
*/
function init(){
  auth.onAuthStateChanged(user => {
    if(!user){
      window.location = "/admin";
    }else{
      emptyTableMessageDiv = document.getElementById("EmptyTableMessageDiv");
      requestsTable = document.getElementById("RequestsTable");
      errorMsgContainer = document.getElementById("ErrorMessageContainer");
      errorMsgText = document.getElementById("ErrorMessageText");
      loadTable();
    }
  });
}

/**
* Function that loads the requests table and sets up the firebase listeners.
*/
function loadTable(){
  const songsRef = ref(database, 'songs/');
  const songList = query(songsRef, orderByChild('timeStamp'));

  onChildAdded(songList, (data) => {
    if(emptyTableVisible){
      emptyTableMessageDiv.style.display = "none";
      requestsTable.style.borderRadius = "20px";
    }

    addNewRowToRequests(data);
  });

  onChildRemoved(songList, (data) => {
    for(const [i, requestRow] of Array.from(requestsTable.rows).entries()){
      const link = requestRow.cells[3].innerText;
      if(link === data.val().link){
        requestsTable.deleteRow(i);
      }
    }

    if(requestsTable.rows.length == 1){
      emptyTableMessageDiv.style.display = "flex";
      requestsTable.style.borderRadius = "20px 20px 0px 0px";
      emptyTableVisible = true;
    }
  })
}

/**
* Function that takes in a data object from Firebase and adds the information to the requests table.
* @param {DataSnapshot} data The data object from firebase representing a request.
*/
function addNewRowToRequests(data){
  var tableBody = requestsTable.getElementsByTagName('tbody')[0];
  const newRow = tableBody.insertRow(0);
  const nameCell = newRow.insertCell();
  nameCell.appendChild(document.createTextNode(data.val().songName));
  const artistsCell = newRow.insertCell();
  artistsCell.appendChild(document.createTextNode(data.val().artists));
  const explicitCell = newRow.insertCell();
  explicitCell.appendChild(document.createTextNode(booleanInEnglish(data.val().explicit)));
  explicitCell.setAttribute('max-width', '25px');
  const linkCell = newRow.insertCell();
  const linkText = document.createElement('a');
  linkText.setAttribute('href', data.val().link);
  linkText.setAttribute('target', "_blank");
  linkText.innerText = data.val().link;
  linkCell.appendChild(linkText);
  const clearCell = newRow.insertCell();
  const clearCellDiv = document.createElement("div");
  clearCellDiv.classList.add("clearCell");
  const clearButton = document.createElement("button");
  clearButton.innerText = "X";
  clearButton.id = data.key;
  clearButton.classList.add("clearButton");
  clearButton.addEventListener("click", clearRequestEvent);
  clearCellDiv.appendChild(clearButton);
  clearCell.appendChild(clearCellDiv);
}

/**
* Function that is called whenever the clear button is clicked on a request entry, uses the URI from the ID of the HTML element
* that triggered the event to remove it from the firebase database.
* @param {Event} event The event that triggered the function.
*/
function clearRequestEvent(event){
  const songsRef = ref(database, 'songs/' + event.target.id);
  remove(songsRef).
  catch((error) => {
    displayErrorMessage("There was an error clearing the request. Please try again.");
  });
}

/**
* Displays the error message container on the page.
* @param {String} str Optional, string to display in the error message box.
*/
function displayErrorMessage(str = "Something went wrong, please refresh the page and try again."){
  errorMsgContainer.style.display = "flex";
  errorMsgText.innerText = str;
}

/**
* Simple function to get a string Yes or No from a boolean.
* @param {boolean} boolean The boolean you want to convert.
* @return {String} A string of yes or no representing the supplied boolean.
*/
function booleanInEnglish(boolean){
  return boolean === true ? "Yes" : "No";
}
