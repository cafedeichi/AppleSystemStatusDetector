const puppeteer = require('puppeteer');
const core = require('@actions/core');
const Path = require('path');
const cheerio = require('cheerio');
const fs = require('fs');

// Puppeteer configuration
const configuration = {
    headless: true, // true: headless mode, false: display browser
    defaultViewport: {
        width: 1600,
        height: 1200
    },
    args: [
        '--no-sandbox', // Avoid the impact of security restrictions (for CI environments)    
        '--disable-setuid-sandbox'
    ]
};

const userUrl = 'https://www.apple.com/support/systemstatus/';
const userFilePath = 'status/userServiceStatus.txt';
const developerUrl = 'https://developer.apple.com/system-status/';
const developerFilePath = 'status/developerServiceStatus.txt';
let isAppStoreOutage = false;

(async () => {
    try {
        // Fetch and process user system status
        const userHtml = await fetchPageContent(userUrl, configuration);
        const userResult = getData(userHtml);
        write(userFilePath, userResult);
        core.setOutput('mention', isAppStoreOutage ? '<!here>\n' : '');
        core.setOutput('system_status', `<${userUrl}|*System Status:*>\n${userResult}`);

        // Fetch and process developer system status
        const developerHtml = await fetchPageContent(developerUrl, configuration);
        const developerResult = getData(developerHtml);
        write(developerFilePath, developerResult);
        core.setOutput('mention', isAppStoreOutage ? '<!here>\n' : '');
        core.setOutput('developer_system_status', `<${developerUrl}|*Developer System Status:*>\n${developerResult}`);
    } catch (error) {
        core.setFailed(`Error: ${error.message}`);
    }
})();

async function fetchPageContent(url, config) {
    const browser = await puppeteer.launch(config);
    const page = await browser.newPage();
    // Wait until the page load stabilizes
    await page.goto(url, { waitUntil: 'networkidle0' });
    const content = await page.content();
    await browser.close();
    return content;
}

function getData(html) {
    try {
        const $ = cheerio.load(html);
        const events = $('.section-lights').find('.light-container');
        console.log(`Number of events found: ${events.length}`);
        let issues = '';
        events.each((index, element) => {
            let status = $(element).find('.light-content.light-image').children().attr('class');
            let serviceWithComment = $(element).children().find('.light-link');

            if (serviceWithComment.length > 0) {
                console.log(`Status updated: ${serviceWithComment.text()}`);

                if (status.match('available')) {
                    // Do Nothing
                } else if (status.match('upcoming|resolved|completed')) {
                    issues += `:large_green_circle: ${serviceWithComment.text()}\n`;
                } else if (status.match('issue')) {
                    issues += `:large_yellow_circle: ${serviceWithComment.text()}\n`;
                } else if (status.match('outage')) {
                    if (serviceWithComment.text().startsWith('App Store')) {
                        isAppStoreOutage = true;
                    }
                    issues += `:red_circle: ${serviceWithComment.text()}\n`;
                } else if (status.match('maintenance')) {
                    issues += `:white_circle: ${serviceWithComment.text()}\n`;
                } else {
                    issues += `:black_circle: ${serviceWithComment.text()}\n`;
                }
            } else {
                console.log($(element).find('.light-content.light-name').text());
            }
        });

        return issues.length === 0
            ? ':large_green_circle: All services are operating normally.\n'
            : issues;
    } catch (error) {
        core.setFailed(`Scraping failed with error ${error}`);
    }
}

function write(filePath, stream) {
    try {
        fs.writeFileSync(Path.join(__dirname, filePath), stream, { flag: 'w+' });
    } catch (error) {
        core.setFailed(`Creating file failed with error ${error}`);
    }
}
