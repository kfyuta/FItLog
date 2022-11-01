const stateSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("state");
const fitLogSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("FitLog");

/**
 * Lineに投稿されたときに呼ばれる関数
 * @param {object} 
 * @return {void}
 */
function doPost(e) {
  // 現在状態を取得
  const state = stateSheet.getRange("A2").getValue();

  // LINEから受信したJSONデータをパースする
  const data = JSON.parse(e.postData.contents);
  // dataからメッセージ部分のみを取り出す
  const msg = data.events[0].message.text;

  // 受信テキストがFitTypeの場合、stateを更新する
  if(isFitType(msg)) 
  {
    doReceiveFitType(msg)
  }
  // 受信テキストがFitRecordの場合
  else if(isFitRecord(msg))
  {
    if(state) 
    {
      const [minute, kcal] = msg.split(',');
      doReceiveFitRecord(minute, kcal);
    }
    else
    {
      const txt = `メニューをタップして記録する運動を選択してください`
      replyFailedMsg(e, txt);
    }
  }
  // 受信テキストが上記以外の場合
  else
  {
    // FitTypeが選択済みの場合
    if(state)
    { 
      const txt = `運動時間と消費カロリーをカンマ区切りで入力してください。\n例:30,300`
      replyFailedMsg(e, txt);
    }
    // FitTypeが未設定の場合
    else 
    {
      const txt = `メニューをタップして記録する運動を選択してください`
      replyFailedMsg(e, txt);
    }
    return;
  }
}

/**
 * 処理成功時のメッセージを送信する
 * @param {object} Lineから受信したイベントオブジェクト
 */
function replySuccessMsg(e, result) {
  const message = {
    replyToken: e.replyToken,
    messages: [
      {
        "type": "text",
        "text": e.message.text
      } 
    ]
  };
  // 送信のための諸準備
  const replyData = {
    "method": "post",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN,
    },
    "payload": JSON.stringify(message)
  };
  // JSON形式でAPIにポスト
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", replyData);
}

/**
 * 処理失敗時のメッセージを送信する
 * @param {object} Lineから受信したイベントオブジェクト
 */
function replyFailedMsg(e, txt) {
  const message = {
    replyToken: e.replyToken,
    messages: [
      {
        "type": "text",
        "text": txt,
      } 
    ]
  };
  // 送信のための諸準備
  const replyData = {
    "method": "post",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN,
    },
    "payload": JSON.stringify(message)
  };
  // JSON形式でAPIにポスト
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", replyData);
}

/**
 * Send push message from line platform.
 * @param messages: array which has object.
 * @return void
 */
function pushMessage(messages) {
  const body = {messages};
  const pushMsg = {
    "method": "post",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN,
    },
    "payload": JSON.stringify(body)
  }
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/broadcast", pushMsg);
}



/**
 * @return {boolean} true: msg is fitType false: msg is not fitType
 */
function isFitType(msg) {
  return msg === "リングフィット" || msg === "フィットボクシング";
}

/**
 * FitType受信時の処理。
 * stateシートにFitTypeと現在時刻を記録する
 * @return void
 */
function doReceiveFitType(msg) {
  stateSheet.getRange("A2:B2").setValues([[msg, new Date()]])
}

/**
 * FitRecord受信時の処理
 * @param {number} minute 運動時間
 * @param {number} kcal 消費カロリー
 */
function doReceiveFitRecord(minute, kcal) {
  // fitRecordのfitTypeを取得する
  const fitType = stateSheet.getRange("A2");

  // A列の未入力行のうち最小の行番号を取得する
  lastRow = fitLogSheet.getLastRow();

  if(isSameDay(new Date(fitLogSheet.getRange(`A${lastRow}`).getValue())))
  {
    inputRecord(fitType, lastRow, minute, kcal);
  }
  // 同日の行が作成されていない場合
  else
  {
    // 日付を入力する
    fitLogSheet.getRange(`A${lastRow + 1}`).setValue(new Date());
    inputRecord(fitType, lastRow + 1, minute, kcal);
  }

  // stateシートをクリアする
  stateSheet.getRange("A2:B2").clearContent();

}

function test() {
  stateSheet.getRange("A2").setValue("リングフィット")
  doReceiveFitRecord(22, 78);
  stateSheet.getRange("A2").setValue("フィットボクシング")
  doReceiveFitRecord(47, 475);
}

/**
 * FitLogシートに入力されている最新の日付と今日の日付が同じか比較する
 * @return {boolean} true: 同じ日付 false: 別の日
 */
function isSameDay(date) {
  // FitLogシートに入力されている最新の日付
  const dyear = date.getFullYear();
  const dmonth = date.getMonth();
  const ddate = date.getDate();

  const today = new Date();
  const tyear = today.getFullYear();
  const tmonth = today.getMonth();
  const tdate = today.getDate();

  return dyear === tyear && dmonth === tmonth && ddate === tdate;
}

/**
 * @param {number} row 行番号
 * @param {number} minute 運動時間
 * @param {number} kcal 消費カロリー
 * @return void
 */
function inputRecord(fitType, row, minute, kcal) {
  // fitTypeがリングフィットの場合
  if(fitType.getValue() === "リングフィット") 
  {
    // 日付を入力した行のB列を取得し運動時間を入力する
    fitLogSheet.getRange(`B${row}`).setValue(minute);

    // 日付を入力した行のE列のセルを取得し消費カロリーを入力する
    fitLogSheet.getRange(`E${row}`).setValue(kcal);

  } 
  // fitTypeがフィットボクシングの場合
  else if(fitType.getValue() === "フィットボクシング") {
    // 日付を入力した行のC列のセルを取得し運動時間を入力する
    fitLogSheet.getRange(`C${row}`).setValue(minute);

    // 日付を入力した行のF列のセルを取得し消費カロリーを入力する
    fitLogSheet.getRange(`F${row}`).setValue(kcal);
  }
  // 日付を入力した行のD列のセルを取得し合計時間を入力する
  fitLogSheet.getRange(`D${row}`).setFormula(`=B${row}+C${row}`);

  // 日付を入力した行のG列のセルを取得し合計時間を入力する
  fitLogSheet.getRange(`G${row}`).setFormula(`=E${row}+F${row}`);
}

function isFitRecord() {
  return /\d+,\d+\.\d+/.test("30,30.12");
}