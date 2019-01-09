(() => {
'use strict';


// Functions that differ depending if the user is on
// the mobile twitter website or the desktop one.
let [images, streams, tweetOf, markSeen] = (()=>{
  let isDesktopTwitter = /(www\.|\/)twitter/.test(window.location.href);

  if (isDesktopTwitter) {
    function images() {
      return Array.from(document.querySelectorAll(".AdaptiveMedia-photoContainer img"));
    }

    function streams() {
      return Array.from(document.querySelectorAll("#stream-items-id"));
    }

    function tweetOf(element) {
      while (!element.classList.contains("stream-item")) {
        element = element.parentElement;
      }
      return element;
    }

    function markSeen(image) {
      image.classList.add("hide-alt-seen");
    }

    return [images, streams, tweetOf, markSeen];

  } else {
  // Mobile
    function tweet_selector() {
      return "div:not([class]):not([id]):not([style*=padding-bottom])";
    }

    function image_selector() {
      return "img:not([src*=profile_images]):not([src*=emoji])";
    }

    function images() {
      return Array.from(document.querySelectorAll(`${tweet_selector()} ${image_selector()}`));
    }

    function streams() {
      let tweet = document.querySelector(tweet_selector());

      if (tweet === null || tweet.parentElement.id !== "") {
        return null;
      } else {
        return [tweet.parentElement];
      }
    }

    function tweetOf(element) {
      while (!(element.nodeName === "DIV" && element.className === "")) {
        element = element.parentNode;
      }
      return element;
    }

    function markSeen(image) {
      image.previousSibling.classList.add("hide-alt-seen");
    }

    return [images, streams, tweetOf, markSeen];
  }
})();

// Functions that differ depending if the user's browser is Firefox
let [withOptions, notLetter] = (()=>{
  let isFirefox = navigator.userAgent.indexOf("Firefox") > 0;

  let defaultOptions = {words: []};

  if (isFirefox) {
    function report(error) {
      console.log(error);
    }

    function withOptions(callback) {
      chrome.storage.local.get(defaultOptions).then(callback, report);
    }

    function notLetter() {
      return '[\\s\\d,.:;!?@#%_/\\-+*"\']';
    }

    return [withOptions, notLetter]

  } else {
    // Not Firefox
    function withOptions(callback) {
      chrome.storage.sync.get(defaultOptions, callback);
    }

    function notLetter() {
      return '[^\\p{L}]';
    }

    return [withOptions, notLetter]
  }
})();

function first(array) {
  return array[0];
}

function last(array) {
  return array[array.length - 1];
}

function sameArray(x,y) {
  return x.length === y.length &&
         x.every((e,i) => (e === y[i]));
}

// author: bobince (modified by CoolAJ86)
// source: http://stackoverflow.com/a/3561711/157247, https://stackoverflow.com/a/6969486/6750494
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let NOT_LETTER = notLetter();
let NOT_LETTER_R = RegExp(NOT_LETTER, "ui");

function complement(char) {
  if (NOT_LETTER_R.test(char)) {
    return "."
  } else {
    return NOT_LETTER;
  }
}

function wordMatch(word) {
  let escWord = escapeRegExp(word);
  let before = `(?:^|${complement(first(word))})`;
  let after  = `(?:$|${complement(last(word))})`;

  return `${before}${escWord}${after}`;
}

function wordRegex(words) {
  if (words.length === 0) {
    return null;
  } else {
    return RegExp(words.map(wordMatch).join("|"), "iu");
  }
}

function wordFilter(words) {
  let r = wordRegex(words);
  console.log(r);
  if (r === null) {
    return ((_)=>false);
  } else {
    return ((img)=>r.test(img.alt));
  }
}

function withStreams(callback) {
  let s = streams();
  if (s.length !== 0 && s.every((stream)=> stream === null || stream.children.length === 0)) {
    setTimeout(()=>withStreams(callback), 10);
  } else {
    callback(s);
  }
}

function withImages(callback) {
  withStreams((_) => {
    callback(images());
  });
}

function imagesContaining(images, words) {
  let imgs = images.filter(wordFilter(words));
  console.log(imgs);
  return imgs;
}

function imagesNotContaining(images, words) {
  let contains = wordFilter(words);
  return images.filter((img)=>!contains(img));
}

function withImagesContaining(words, callback) {
  withImages((images)=> callback(imagesContaining(images, words)));
}

function withImagesFiltered({contains, notContains}, callback) {
  withImagesContaining(contains, (images)=>callback(imagesNotContaining(images, notContains)));
}


function hideTweet(element) {
  tweetOf(element).style.display = "none";
}

function unhideTweet(element) {
  tweetOf(element).style.display = "list-item";
}

function searchAndHide(list) {
  withImagesContaining(list, (images)=>images.map(hideTweet));
  withImages((images)=>images.forEach(markSeen));
}

function searchAndUnhide(unhide, hide) {
  withImagesFiltered({contains: unhide, notContains: hide}, (images) => {
    images.map(unhideTweet);
  });
}

function withWordList(callback) {
  withOptions(({words})=> callback(words))
}

function onMutation(mutationsList, observer) {
  withWordList(searchAndHide);
}

function observeTweetStream() {
  let config = { childList: true, subtree: false };
  let observer = new MutationObserver(onMutation);

  withStreams((streams) => {
    for (let stream of streams) {
      observer.observe(stream, config);
    }
    window.tweetStreams  = streams;
    window.tweetObserver = observer;
  });
}

function updateObserver() {
  withStreams((streams) => {
    if (!sameArray(streams, window.tweetStreams)) {
      observeTweetStream();
    }
  });
}

observeTweetStream();
withWordList(searchAndHide);

chrome.runtime.onMessage.addListener(function onMessage(msg) {
  if (!msg.url || msg.url === window.location.href) {
    if (msg.updateHideAlt === true) {
      updateObserver();
      withWordList(searchAndHide);
    } else if (msg.UnhideAlt === true) {
      withWordList((words)=>searchAndUnhide([msg.word], words));
    }
  } else {
    setTimeout(()=>onMessage(msg), 10);
  }
});

})();
