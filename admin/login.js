window.addEventListener("load", init, false);

import {initializeApp} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {getAnalytics} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-analytics.js";
import {getAuth, signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

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
const auth = getAuth();
let usernameField, passwordField, loginButton, errorMessageContainer;

/**
* Initializes HTML element variables when page loads and the user is deemed not signed in.
*/
function init(){
  auth.onAuthStateChanged(user => {
    if(user && !user.isAnonymous){
      window.location = "/admin/RequestsView.html";
    }else{
      usernameField = document.getElementById("UsernameField");
      passwordField = document.getElementById("PasswordField");
      passwordField.addEventListener("keypress", handleLoginButtonEvent);
      loginButton = document.getElementById("LoginButton");
      loginButton.addEventListener("click", handleLoginButtonEvent);
      errorMessageContainer = document.getElementById("ErrorMessageContainer");
    }
  });
}

/**
* Function that handles auth once the username and password are entered and the user clicks sign in.
* @param {Event} event The event that triggered the function.
*/
function handleLoginButtonEvent(event){
  if(event && (event.type == "keypress" && event.key == "Enter") || event.type == "click"){
    if(usernameField.value.length > 0 && passwordField.value.length > 0){
      const usernameVal = usernameField.value;
      const passwordVal = passwordField.value;

      signInWithEmailAndPassword(auth, usernameVal, passwordVal)
        .then(userCredential => {
          window.location = "/admin/RequestsView.html";
        })
        .catch(error => {
          const errorCode = error.code;
          handleDisplayErrorMessage(errorCode);
        });

    }else{
      errorMessageContainer.style.display = "flex";
      errorMessageContainer.textContent = "Enter a user and password"
    }
  }
}

/**
* Function that handles displaying the correct error message for the supplied error code.
* @param {String} errorCode The error code supplied by the Firebase API
*/
function handleDisplayErrorMessage(errorCode){
  errorCode = errorCode.replace("auth/", "");
  console.error(errorCode);
  var errorMessage = "Unknown Error";
  if(errorCode === "invalid-email"){
    errorMessage = "Invalid Email";
  }else if(errorCode === "wrong-password"){
    errorMessage = "Invalid Password";
  }
  errorMessageContainer.style.display = "flex";
  errorMessageContainer.textContent = errorMessage;
}
