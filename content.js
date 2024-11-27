console.log('%c[Content Script] Twitter Video Downloader loaded', 'background: #222; color: #bada55');

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

// Function to get video URL from twitsave.com
async function getTwitsaveVideoUrl(tweetUrl) {
    try {
        const apiUrl = `https://twitsave.com/info?url=${encodeURIComponent(tweetUrl)}`;
        const response = await fetch(apiUrl);
        const html = await response.text();
        
        // Parse the HTML response
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Find the download section and get the highest quality video URL
        const downloadSection = doc.querySelector('div.origin-top-right');
        if (downloadSection) {
            const qualityLinks = downloadSection.querySelectorAll('a');
            if (qualityLinks.length > 0) {
                return qualityLinks[0].href;
            }
        }
        throw new Error('No video URL found');
    } catch (error) {
        console.error('Error getting video URL:', error);
        return null;
    }
}

// Function to handle video download
async function downloadVideo(tweetUrl) {
    try {
        const videoUrl = await getTwitsaveVideoUrl(tweetUrl);
        if (videoUrl) {
            chrome.runtime.sendMessage({
                type: 'download',
                url: videoUrl
            });
        } else {
            console.error('Failed to get video URL');
        }
    } catch (error) {
        console.error('Error downloading video:', error);
    }
}

// Function to add download buttons to videos
function addDownloadButtons() {
    const articles = document.querySelectorAll('article');
    
    articles.forEach(article => {
        // Check if we already added a button to this article
        if (article.querySelector('.twitter-video-downloader-btn')) {
            return;
        }

        // Check if article contains video
        const hasVideo = article.querySelector('video') !== null;
        if (!hasVideo) {
            return;
        }

        // Create and add download button
        const downloadButton = createDownloadButton();
        
        // Get tweet URL
        const tweetLink = article.querySelector('a[href*="/status/"]');
        const tweetUrl = tweetLink ? 'https://twitter.com' + tweetLink.getAttribute('href') : null;
        
        if (tweetUrl) {
            downloadButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                downloadVideo(tweetUrl);
            });

            // Find a good place to insert the button
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

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('%c[Content Script] Received message:', 'background: #222; color: #bada55', request);
    
    if (request.action === "getVideoInfo") {
        try {
            console.log('[Content Script] Checking for video...');
            // 检查是否是视频推文
            const hasVideo = document.querySelector('video') !== null;
            console.log('[Content Script] Has video:', hasVideo);
            
            // 获取当前页面URL
            const url = window.location.href;
            console.log('[Content Script] Current URL:', url);
            
            // 发送响应
            sendResponse({
                url: url,
                hasVideo: hasVideo,
                success: true
            });
            
            console.log('[Content Script] Response sent successfully');
        } catch (error) {
            console.error('[Content Script] Error:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
        return true; // 保持消息通道开放
    } else if (request.action === "getVideos") {
        console.log('收到获取视频请求');
        const videos = extractVideoUrls();
        console.log('返回视频列表:', videos);
        sendResponse({videos: videos});
    }
    return true;
});
