// 获取当前页面URL
async function getCurrentTabUrl() {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    return tab?.url;
}

// 检查是否是Twitter/X的视频页面
function isTwitterVideoPage(url) {
    return url && url.match(/^https?:\/\/(.*\.)?(twitter\.com|x\.com).*\/status\//i) !== null;
}

// 从twitsave.com获取视频
async function downloadVideo(tweetUrl) {
    const statusElement = document.getElementById('download-status');
    statusElement.textContent = '正在获取视频...';
    statusElement.style.display = 'block';
    statusElement.className = '';

    try {
        // 1. 构建twitsave.com的URL
        const twitsaveUrl = `https://twitsave.com/info?url=${encodeURIComponent(tweetUrl)}`;
        console.log('Twitsave URL:', twitsaveUrl);

        // 2. 获取页面内容
        const response = await fetch(twitsaveUrl);
        if (!response.ok) {
            throw new Error(`获取失败: ${response.status}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 3. 查找视频下载链接
        let videoUrl = null;

        // 方法1：查找下载按钮
        const downloadButtons = doc.querySelectorAll('a[download]');
        if (downloadButtons.length > 0) {
            videoUrl = downloadButtons[0].href;
        }

        // 方法2：查找视频源
        if (!videoUrl) {
            const videoElements = doc.querySelectorAll('video source');
            if (videoElements.length > 0) {
                videoUrl = videoElements[0].src;
            }
        }

        // 方法3：查找下载区域
        if (!videoUrl) {
            const downloadSection = doc.querySelector('div.origin-top-right');
            if (downloadSection) {
                const qualityLinks = downloadSection.querySelectorAll('a');
                if (qualityLinks.length > 0) {
                    videoUrl = qualityLinks[0].href;
                }
            }
        }

        if (!videoUrl) {
            throw new Error('未找到视频下载链接');
        }

        console.log('找到视频链接:', videoUrl);

        // 4. 开始下载
        const date = new Date();
        const timestamp = date.toISOString().replace(/[:.]/g, '-');
        const filename = `twitter_video_${timestamp}.mp4`;

        // 移除了saveAs: true，现在会直接下载到默认目录
        await chrome.downloads.download({
            url: videoUrl,
            filename: filename
        });

        statusElement.textContent = '下载已开始！';
        statusElement.className = 'success';
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error('下载错误:', error);
        statusElement.textContent = '下载失败: ' + error.message;
        statusElement.className = 'error';
    }
}

// 初始化界面
async function initializePopup() {
    try {
        const url = await getCurrentTabUrl();
        
        // 显示当前URL
        const urlDisplay = document.getElementById('current-url');
        if (urlDisplay) {
            urlDisplay.textContent = url || '无法获取URL';
        }

        const downloadButton = document.getElementById('download-button');
        const statusElement = document.getElementById('download-status');

        // 检查是否是Twitter视频页面
        if (!url) {
            statusElement.textContent = '无法获取当前页面URL';
            statusElement.style.display = 'block';
            return;
        }

        if (!isTwitterVideoPage(url)) {
            statusElement.textContent = '请在Twitter视频页面使用此扩展';
            statusElement.style.display = 'block';
            return;
        }

        // 显示下载按钮
        if (downloadButton) {
            downloadButton.style.display = 'block';
            downloadButton.onclick = () => downloadVideo(url);
        }

    } catch (error) {
        console.error('初始化错误:', error);
        const statusElement = document.getElementById('download-status');
        statusElement.textContent = '初始化失败: ' + error.message;
        statusElement.style.display = 'block';
        statusElement.className = 'error';
    }
}

// 当弹出窗口加载完成时初始化
document.addEventListener('DOMContentLoaded', initializePopup);
