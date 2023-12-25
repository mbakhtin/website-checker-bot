# website-checker-bot
Telegram bot reporting about changes on a specific web-page

## Overview
This is an example of a telegram bot that periodically checks a specific web page and report about page changes in a Telegram channel.

This particular bot is configured to monitor the schedule of planned works on electrical networks of PJSC Rosseti Lenenergo web page:

https://rosseti-lenenergo.ru/planned_work/

Bot is created using Google Sheets and Apps Script. It uses a Google Sheet as a simple database to store information about connected Telegram groups as well as a snapshot of the website information for distinguish between old and new records.

Internally the script is using Cheerio (https://github.com/tani/cheeriogs) to parse the web page.

## Setup

1. Create a Google Sheet with three tabs: Chats, DebugLog, and Data.

2. Go to Extensions -> Apps Script, copy-paste the code from main.gs to the newly created script, and save.

3. Add the Cheerio library following the instructions at https://github.com/tani/cheeriogs.

4. Click Deploy and create a new Deploymen (Web app type). You will be asked to Authorize Access during the deployment. Once you'll see "Google hasn’t verified this app" you have to click on small "Advanced" link to proceed. Save the URL somewhere, you will need it later.

5. Switch to telegram and register a new bot. Start a new conversation with @BotFather and run /newbot command. After providing the name you will get an API key in the form NNNNNNNNN:XXXXXXXXXXXXXXX. Save the key 

6. In the script editor, go to Project Settings and add two Script Properties: BOT_KEY and WEB_URL with the saved API key and Web URL.

7. Go to script editor and run the "setWebhook" function once (you will need to choose the function from the dropdown on top and click "Run"). It will register the bot callback url.

8. Setup schedule. Go to "Triggers" on the left and add a "Time-driven" trigger that runs function "schedule". Set some reasonable interval.

Now the bot is ready. Add it to your channel and enable it by specifying the filter with "/settings <filter>" from within the channel (only the person who added the bot can do this).
