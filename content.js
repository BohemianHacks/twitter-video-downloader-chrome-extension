// Function to create download button
function createDownloadButton() {
    const downloadButton = document.createElement('button');
    downloadButton.className = 'twitter-video-downloader-btn';
    downloadButton.innerHTML = '下载视频';
    downloadButton.style.cssText = `
        background-color: #1da1f2;
        color: white;
        border: none;
        border-radius: 9999px;
        padding: 4px 12px;
        font-size: 13px;
        cursor: pointer;
        margin-left: 8px;
    `;
    return downloadButton;
}

// Function to extract video URL
function extractVideoUrl(article) {
    // Try to find video element
    const videoElement = article.querySelector('video');
    if (videoElement) {
        // First try src attribute
        if (videoElement.src) {
            return videoElement.src;
        }
        // Then try source element
        const sourceElement = videoElement.querySelector('source');
        if (sourceElement && sourceElement.src) {
            return sourceElement.src;
        }
        // Try data-url attribute
        if (videoElement.dataset.url) {
            return videoElement.dataset.url;
        }
    }

    // Try to find video URL in any data attributes
    const possibleVideoContainers = article.querySelectorAll('[data-testid="videoPlayer"], [data-testid="videoComponent"]');
    for (const container of possibleVideoContainers) {
        const videoUrl = container.querySelector('video')?.src;
        if (videoUrl) return videoUrl;
    }

    return null;
}

// Function to extract video URLs
function extractVideoUrls() {
    console.log('开始查找视频...');
    const videos = [];
    
    // 1. 查找所有视频元素
    const allVideos = document.querySelectorAll('video');
    console.log('找到video标签数量:', allVideos.length);
    
    allVideos.forEach((video, index) => {
        console.log(`检查视频 ${index + 1}...`);
        let videoUrl = null;
        
        // 检查直接的src属性
        if (video.src) {
            videoUrl = video.src;
            console.log('从src找到视频:', videoUrl);
        }
        // 检查source标签
        else {
            const source = video.querySelector('source');
            if (source && source.src) {
                videoUrl = source.src;
                console.log('从source找到视频:', videoUrl);
            }
        }
        
        // 检查data属性
        if (!videoUrl && video.dataset.url) {
            videoUrl = video.dataset.url;
            console.log('从data-url找到视频:', videoUrl);
        }
        
        if (videoUrl && !videos.some(v => v.url === videoUrl)) {
            videos.push({ url: videoUrl });
        }
    });

    // 2. 查找视频播放器容器
    const videoPlayers = document.querySelectorAll([
        '[data-testid="videoPlayer"]',
        '[data-testid="videoComponent"]',
        '[data-testid="media-player"]',
        '[role="presentation"] video',
        '[data-testid="tweet"] video',
        '[data-testid="tweetDetail"] video'
    ].join(','));
    
    console.log('找到视频播放器数量:', videoPlayers.length);

    videoPlayers.forEach((player, index) => {
        console.log(`检查播放器 ${index + 1}...`);
        
        // 如果是video元素
        if (player.tagName === 'VIDEO') {
            if (player.src && !videos.some(v => v.url === player.src)) {
                console.log('从播放器找到视频:', player.src);
                videos.push({ url: player.src });
            }
        }
        // 如果是容器
        else {
            const playerVideo = player.querySelector('video');
            if (playerVideo && playerVideo.src && !videos.some(v => v.url === playerVideo.src)) {
                console.log('从播放器容器找到视频:', playerVideo.src);
                videos.push({ url: playerVideo.src });
            }
        }
    });

    console.log('总共找到视频数量:', videos.length);
    return videos;
}

// Function to handle video download
function downloadVideo(videoUrl) {
    if (videoUrl) {
        console.log('Attempting to download video:', videoUrl);
        chrome.runtime.sendMessage({
            type: 'download',
            url: videoUrl
        });
    }
}

// Main function to add download buttons to videos
function addDownloadButtons() {
    const articles = document.querySelectorAll('article');
    
    articles.forEach(article => {
        // Check if button already exists
        if (article.querySelector('.twitter-video-downloader-btn')) {
            return;
        }

        const videoUrl = extractVideoUrl(article);
        if (videoUrl) {
            const downloadButton = createDownloadButton();
            downloadButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                downloadVideo(videoUrl);
            });

            // Find a suitable place to insert the button
            const actionBar = article.querySelector('[role="group"]');
            if (actionBar) {
                actionBar.appendChild(downloadButton);
            }
        }
    });
}

// Initial run
addDownloadButtons();

// Observer to handle dynamically loaded content
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            addDownloadButtons();
        }
    }
});

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Add styles
const style = document.createElement('style');
style.textContent = `
    .twitter-video-downloader-btn:hover {
        background-color: #1a91da !important;
    }
`;
document.head.appendChild(style);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getVideos") {
        console.log('收到获取视频请求');
        const videos = extractVideoUrls();
        console.log('返回视频列表:', videos);
        sendResponse({videos: videos});
    }
    return true;
});
