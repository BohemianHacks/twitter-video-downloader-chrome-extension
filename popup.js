// 检查当前标签是否是Twitter/X网站
function checkIfTwitter(url) {
    return url.match(/^https?:\/\/(.*\.)?(twitter\.com|x\.com)/i) !== null;
}

// 在页面中查找视频
function findVideosInPage() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        
        if (!checkIfTwitter(currentTab.url)) {
            document.getElementById('videos-list').innerHTML = `
                <div class="not-twitter">
                    这不是Twitter/X网站。<br>请在Twitter/X网站上使用此扩展。
                </div>`;
            return;
        }

        // 向content script发送消息以获取视频
        chrome.tabs.sendMessage(currentTab.id, {action: "getVideos"}, function(response) {
            const videosList = document.getElementById('videos-list');
            
            if (!response || !response.videos || response.videos.length === 0) {
                videosList.innerHTML = `
                    <div class="no-videos">
                        未在当前页面找到视频
                    </div>`;
                return;
            }

            // 显示找到的视频
            videosList.innerHTML = response.videos.map((video, index) => `
                <div class="video-item">
                    视频 ${index + 1}
                    <button class="download-btn" data-url="${video.url}">下载</button>
                </div>
            `).join('');

            // 添加下载按钮的点击事件
            document.querySelectorAll('.download-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const videoUrl = this.getAttribute('data-url');
                    chrome.runtime.sendMessage({
                        type: 'download',
                        url: videoUrl
                    });
                });
            });
        });
    });
}

// 当弹出窗口加载时执行
document.addEventListener('DOMContentLoaded', findVideosInPage);
