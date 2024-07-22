/* メモ
１．YouTubeとAmazonのタブを一つのリストにまとめ、Promise.allを使用して2つのタブクエリを並行して実行するように。
２．各タブで動画が再生中かどうかを確認するcheckVideoState()
３．どれか一つの動画が再生中の場合、すべての動画を停止し、全てが停止している場合、すべての動画を再生するようにisAnyPlayingフラグを使って同期させる。
４．playVideo()とpauseVideo()によって動画の再生/停止を切り替える処理 
*/

chrome.action.onClicked.addListener(() => {
    // YouTubeとAmazonのタブをそれぞれクエリする
    const youtubeQuery = new Promise((resolve) => {
      chrome.tabs.query(
        { url: ["https://www.youtube.com/*"] },
        (youtubeTabs) => resolve(youtubeTabs)
      );
    });
  
    const amazonQuery = new Promise((resolve) => {
      chrome.tabs.query(
        { url: ["https://www.amazon.com/*", "https://www.amazon.co.jp/*"] },
        (amazonTabs) => resolve(amazonTabs)
      );
    });
  
    // Promise.allに渡して並行して処理
    Promise.all([youtubeQuery, amazonQuery])
    .then((results) => { //この処理の結果として得られたYoutubeとamazonのタブのリストをまとめ、allTabs配列に格納
      const allTabs = [...results[0], ...results[1]]; 
      let isAnyPlaying = false; // 再生中のタブがあるかどうかを示すフラグ
  
      const checkPromises = allTabs.map((tab) => {
        return new Promise((resolve) => {
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              function: checkVideoState, // 各タブ内の動画が再生中かどうかを確認し、isAnyPlayingフラグを更新する関数
            },
            (results) => {
              if (chrome.runtime.lastError) {
                console.error("エラー: ", chrome.runtime.lastError);
                resolve(false);
              } else {
                const isPlaying = results && results[0] && results[0].result;
                if (isPlaying) {
                  isAnyPlaying = true; // 再生中のタブがある場合、フラグを設定
                }
                resolve(isPlaying);
              }
            }
          );
        });
      });
      
      function checkVideoState() {
        const video = document.querySelector("video");
        return video ? !video.paused : false; // videoが存在し、再生中の場合にtrueを返す
        /*(video.pausedはビデオが一時停止中であればtrue、再生中であればfalseを返すプロパティ
        !video.pausedはビデオが再生中=trueを、一時停止中または停止中=falseを返す)*/
      }
      
      Promise.all(checkPromises)
      .then(() => { //全てのタブの動画状態の確認が完了した後、再度allTabs配列をループ
        allTabs.map((tab) => {
          return new Promise((resolve) => {
            chrome.scripting.executeScript(
              {
                target: { tabId: tab.id },
                function: isAnyPlaying ? pauseVideo : playVideo, // フラグに基づいて再生/停止関数を切り替える
              },
              () => {
                if (chrome.runtime.lastError) {
                  console.error("エラー: ", chrome.runtime.lastError);
                }
                resolve();
              }
            );
          });
        });
      });
    });
  });
  
  function playVideo() {
    const video = document.querySelector("video");
    if (video && video.paused) {
      video.play().catch((error) => {
        console.error("再生エラー: ", error); // 再生エラーをログに記録
      });
    }
  }
  
  function pauseVideo() {
    const video = document.querySelector("video");
    if (video && !video.paused) {
      video.pause(); // 動画を一時停止
    }
  }