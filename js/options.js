'use strict';

function wordList() {
  return document.getElementById("words");
}

function wordInput() {
  return document.getElementById("word-input");
}

function wordInputButton() {
  return document.getElementById("word-input-button");
}

function sendMessage(message) {
  doInCurrentTab((tab)=>chrome.tabs.sendMessage(tab.id, message));
}

function addWord(word) {
  word = word.trim().toLowerCase();
  if (word !== "" && !words().includes(word)) {
    let item = document.createElement("li");
    let text = document.createElement("span");
    let butt = document.createElement("button");

    text.innerText = word;

    butt.innerText = "✗";
    butt.addEventListener('click', () => {
      wordList().removeChild(item);
      sendMessage({UnhideAlt: true, word: word});
      saveOptions();
    });

    item.className = 'word-item';
    item.appendChild(butt);
    item.appendChild(text);
    wordList().appendChild(item);
    saveOptions();
  }
}

function words() {
  return Array.from(document.querySelectorAll('.word-item')).map(x=>x.lastChild.innerText);
}

function formatted_words() {
  return words().map(x=>x.replace('|', '\\|'));
}

function loadOptions() {
  if (window.browser) {
    console.log("y");
    browser.storage.local.get({words: []}).then(({words}) => {
      words.forEach(addWord);
    });

  } else {
    chrome.storage.sync.get({words: []}, ({words}) => {
      words.forEach(addWord);
    });
  }
}

function saveOptions() {
  if (window.browser) {
    browser.storage.local.set({words: formatted_words()});
  } else {
    chrome.storage.sync.set({words: formatted_words()});
  }
  sendMessage({updateHideAlt: true});
}

// author: Arithmomaniac
// source: https://stackoverflow.com/a/12060320/6750494
function doInCurrentTab(tabCallback) {
  chrome.tabs.query(
    { currentWindow: true, active: true },
    function (tabArray) { tabCallback(tabArray[0]); }
  );
}

function useInput() {
  let input = wordInput();
  addWord(input.value);
  input.value = '';
}


window.onload = function() {
  wordInputButton().addEventListener('click', useInput);
  wordInput().addEventListener('keyup', (e) => {
    if (e.key == "Enter") {
      useInput()
    }
  });

  loadOptions();
  document.getElementById("word-input").focus();
}
