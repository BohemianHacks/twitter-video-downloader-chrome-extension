// Log a message to the console indicating the script has loaded
console.log('%c[Content Script] Twitter Video Downloader loaded', 'background: #222; color: #bada55');

// Function to create a download button
function createDownloadButton() {
  const button = document.createElement('button');
  button.className = 'twitter-video-downloader-btn';
  button.textContent = 'Download Video';
  button.style.cssText = `
    background-color: #1da1f2;
    color: white;
    border: none;
    border-radius: 9999px;
    padding: 4px 12px;
    font-size: 13px;
    cursor: pointer;
    margin-left: 8px;
  `;
  return button;
}

// Function to extract video URLs from a tweet
function extractVideoUrls(tweet) {
  const videos = [];

  // Try to find video elements directly
  const videoElements = tweet.querySelectorAll('video');
  videoElements.forEach(video => {
    const src = video.src || video.querySelector('source')?.src || video.dataset.url;
    if (src) {
      videos.push(src);
    }
  });

  // Try to find video URLs from container elements
  const videoContainers = tweet.querySelectorAll('[data-testid="videoPlayer"], [data-testid="videoComponent"]');
  videoContainers.forEach(container => {
    const video = container.querySelector('video');
    if (video && video.src) {
      videos.push(video.src);
    }
  });

  return videos;
}

// Function to download a video using Twitsave
async function downloadVideo(tweetUrl) {
  try {
    const apiUrl = `https://twitsave.com/info?url=${encodeURIComponent(tweetUrl)}`;
    const response = await fetch(apiUrl);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const downloadLink = doc.querySelector('div.origin-top-right a');

    if (downloadLink) {
      const videoUrl = downloadLink.href;
      chrome.runtime.sendMessage({
        type: 'download',
        url: videoUrl
      });
    } else {
      console.error('Failed to find video URL on Twitsave');
    }
  } catch (error) {
    console.error('Error downloading video:', error);
  }
}

// Function to add download buttons to tweets
function addDownloadButtons() {
  const tweets = document.querySelectorAll('article');
  tweets.forEach(tweet => {
    const videos = extractVideoUrls(tweet);
    if (videos.length > 0) {
      const downloadButton = createDownloadButton();
      downloadButton.addEventListener('click', () => {
        const tweetUrl = tweet.querySelector('a[href*="/status/"]').href;
        downloadVideo(tweetUrl);
      });
      tweet.querySelector('[role="group"]').appendChild(downloadButton);
    }
  });
}

// Initial run and observer for dynamic content
addDownloadButtons();
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      addDownloadButtons();
    }
  });
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action 1  === 'getVideoInfo') {
    const hasVideo = document.querySelector('video') !== null;
    const url = window.location.href;
    sendResponse({ url, hasVideo });
  }
});
