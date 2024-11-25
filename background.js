// Listen for download requests from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'download') {
        console.log('Received download request for URL:', message.url);
        
        // Generate a filename based on current date/time
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `twitter_video_${timestamp}.mp4`;
        
        // Initiate the download
        chrome.downloads.download({
            url: message.url,
            filename: filename,
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('Download failed:', chrome.runtime.lastError);
            } else {
                console.log('Download started with ID:', downloadId);
            }
        });
    }
});
