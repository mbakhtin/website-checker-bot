/**
 * @OnlyCurrentDoc
 */
const token = PropertiesService.getScriptProperties().getProperty("BOT_KEY"); 
const webAppUrl = PropertiesService.getScriptProperties().getProperty("WEB_URL");
const telegramUrl = "https://api.telegram.org/bot" + token;

function log(contents) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName('DebugLog'); 
  logSheet.appendRow([contents])
}

function doPost(e) {
  log(e.postData.contents)
  const contents = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const chats = ss.getSheetByName('Chats'); 
  const values = chats.getRange(1,1,chats.getLastRow()).getValues()
  if (contents.my_chat_member?.chat.id) {
    if (contents.my_chat_member.new_chat_member.status=='member') {
      let found=false
      for (let row=0; row<values.length; row++) {
        if (values[row][0]==contents.my_chat_member.chat.id) {
          chats.getRange(row+1,2,1,6).setValues([[0,contents.my_chat_member.chat.title,contents.my_chat_member.from.id,contents.my_chat_member.from.username, '', '']])
          found=true
        }
      }
      if (!found) {
        chats.appendRow([ 
                contents.my_chat_member.chat.id, 
                0,
                contents.my_chat_member.chat.title, 
                contents.my_chat_member.from.id, 
                contents.my_chat_member.from.username,
                '',
                ''
              ])
      }
    }
    if (contents.my_chat_member.new_chat_member.status=='left') {
      for (let row=0; row<values.length; row++) {
        if (values[row][0]==contents.my_chat_member.chat.id) {
          chats.getRange(row+1,2).setValue(0)
        }
      }
    }
  } else if (contents.message?.text?.startsWith("/settings")) {
    for (let row=0; row<values.length; row++) {
      if (values[row][0]==contents.message.chat.id) {
        const current = chats.getRange(row+1,2,1,6).getValues()
        const message_thread_id = contents.message.reply_to_message?.is_topic_message ? contents.message.reply_to_message?.message_thread_id : undefined
        let text;
        if (current[0][2]==contents.message.from.id) {
          const space=contents.message.text.indexOf(' ')
          const filter = space>0?contents.message.text.substring(contents.message.text.indexOf(' ')+1).trim():""
          if (!filter) {
            text="Укажите фильтр, например: /settings Заречное, Заозерное, Боровое"
          } else {
            chats.getRange(row+1,6,1,2).setValues([[message_thread_id??'', filter]])
            chats.getRange(row+1,2).setValue(1)
            text="Установлен фильтр: " + filter
          }
        } else {
          text="Только тот кто добавил бота может управлять им"
        }
        let chatUrl = telegramUrl + "/sendMessage?chat_id=" + contents.message.chat.id + "&text=" + encodeURIComponent(text);
        if (message_thread_id) chatUrl+="&message_thread_id=" + message_thread_id
        UrlFetchApp.fetch(chatUrl);
      }
    }
  }
}

function filterApplied(needle, haystack) {
  const lowerNeedle = needle.toLowerCase()
  return haystack.toLowerCase().split(',').map(x=>x.trim()).filter(x=>lowerNeedle.includes(x)).length > 0
}

function setWebhook() {
    var url = telegramUrl + "/setWebhook?url=" + webAppUrl;
    console.log(url)
    UrlFetchApp.fetch(url);
}

function getRowId(row) {
  return row[2] + "|" + row[3] + "|" + row[4]
}

function schedule() {
  const ds=new Date()
  ds.setDate(ds.getDate() - 1);
  const dateStart=ds.getDate().toString().padStart(2, '0') + "." + (ds.getMonth()+1).toString().padStart(2, '0') + "." + ds.getFullYear()
  const street=''
  let page=1
  let allValues=[]
  while (true) {
    let url="https://rosseti-lenenergo.ru/planned_work/?reg=&city=&date_start=" + dateStart + "&date_finish=&res=&street=" + encodeURIComponent(street)
    if (page>1) url+="&PAGEN_1=" + page
    var content = UrlFetchApp.fetch(url).getContentText()
    const $ = Cheerio.load(content);
    const data=$('.planedwork table tr')
                      .toArray()
                      .map(tr=>$(tr).find("td").toArray().map(td=>$(td).text().trim()))
                      .filter(tr=>tr.length>0)
    allValues.push(...data)
    const lastPage = new RegExp("PAGEN_1=(\\d+)").exec($('.page-nav-i > a:last-child').attr('href'))?.[1]??1
    page++;
    if (page>lastPage) break;
  }
  if (!allValues.length || allValues[0].length!==11) throw new Error("Format changed")
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = ss.getSheetByName('Data'); 
  const empty=(data.getLastRow()==0);
  const spreasheetData = empty?[]:data.getRange(1,1,data.getLastRow(),data.getLastColumn()).getDisplayValues()
  const map=Object.fromEntries(spreasheetData.map(row=>[getRowId(row), true]))
  const chats = ss.getSheetByName('Chats'); 
  let chatsArray=chats.getDataRange()
                      .getValues()
                      .filter(chat=>chat[0] && chat[1] && chat[1]!='0')
  data.clear()
  data.getRange(1,1,allValues.length, allValues[0].length).setNumberFormat("@").setValues(allValues)
  if (!empty) {
    allValues.filter(row=>!map[getRowId(row)])
            .forEach(row=>{
                  chatsArray.forEach(chatDetails=>{
                    if (filterApplied(row[2], chatDetails[6])) {
                      var text="Планируемое отключение: " + row[2] + " с " + row[3] 
                        + " " + row[4] + " по " + row[5] + " " + row[6] 
                      if (row[9]) text+=" (" + row[9] + ")"
                      let chatUrl = telegramUrl + "/sendMessage?chat_id=" + chatDetails[0] + "&text=" + encodeURIComponent(text);
                      if (chatDetails[5]) {
                        chatUrl+="&message_thread_id=" + chatDetails[5]
                      }
                      UrlFetchApp.fetch(chatUrl);
                    }
                  })
            })
    }
}
