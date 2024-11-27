console.log('background.js 已加载');

// 监听来自content script和popup的下载请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('收到消息:', message);
    console.log('发送者信息:', sender);

    if (message.type === 'download') {
        console.log('收到下载请求，URL:', message.url);
        
        // 生成基于当前时间的文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `twitter_video_${timestamp}.mp4`;
        console.log('生成的文件名:', filename);
        
        // 开始下载
        console.log('准备开始下载...');
        chrome.downloads.download({
            url: message.url,
            filename: filename,
            saveAs: true // 允许用户选择保存位置
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('下载失败:', chrome.runtime.lastError);
                console.error('错误详情:', {
                    message: chrome.runtime.lastError.message
                });
                if (sendResponse) {
                    sendResponse({ 
                        success: false, 
                        error: chrome.runtime.lastError.message 
                    });
                }
            } else {
                console.log('下载已开始，ID:', downloadId);
                if (sendResponse) {
                    sendResponse({ 
                        success: true, 
                        downloadId: downloadId 
                    });
                }
            }
        });
        
        // 监听下载进度
        chrome.downloads.onChanged.addListener(function downloadListener(delta) {
            console.log('下载状态变化:', delta);
            if (delta.state) {
                if (delta.state.current === 'complete') {
                    console.log('下载完成');
                    chrome.downloads.onChanged.removeListener(downloadListener);
                } else if (delta.state.current === 'interrupted') {
                    console.error('下载中断，原因:', delta.error);
                    chrome.downloads.onChanged.removeListener(downloadListener);
                }
            }
        });
    }
    return true; // 保持消息通道开放
});
