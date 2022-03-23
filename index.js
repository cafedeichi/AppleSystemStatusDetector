const core = require('@actions/core');
const Nightmare = require('nightmare');
const Path = require('path');
const cheerio = require('cheerio');
const fs = require('fs');

const configuration = {
    show: false,
    width: 1600,
    height: 1200
}
const userUrl = 'https://www.apple.com/support/systemstatus/';
const userFilePath = 'status/userServiceStatus.txt';
const developerUrl = 'https://developer.apple.com/system-status/';
const developerFilePath = 'status/developerServiceStatus.txt';
let isAppStoreOutage = false;

Nightmare(configuration)
    .goto(userUrl)
    .wait('body')
    .evaluate(() => document.querySelector('body').innerHTML)
    .end()
    .then( response => {
        let result = getData(response);
        write(userFilePath, result);
        core.setOutput('mention', isAppStoreOutage ? '<!here>\n' : '');
        core.setOutput('system_status', '<' + userUrl + '|*System Status:*>\n' + result);
    }).catch(error => {
        core.setFailed(`Data Fetching failed with error ${error}`);
    });

Nightmare(configuration)
    .goto(developerUrl)
    .wait('body')
    .evaluate(() => document.querySelector('body').innerHTML)
    .end()
    .then( response => {
        let result = getData(response);
        write(developerFilePath, result);
        core.setOutput('mention', isAppStoreOutage ? '<!here>\n' : '');
        core.setOutput('developer_system_status', '<' + developerUrl + '|*Developer System Status:*>\n' + result);
    }).catch(error => {
        core.setFailed(`Data Fetching failed with error ${error}`);
    });

function getData(html) {
    try {
        const $ = cheerio.load(html);
        const events = $('.section-lights').find('.light-container');
        let issues = '';
        events.each((index, element) => {
            let status = $(element).find('.light-content.light-image').children().attr('class');
            let serviceWithComment = $(element).children().find('.light-link');

            // Logging
            if(serviceWithComment.length > 0) {
                console.log(serviceWithComment.text());

                // Detect Issues
                if (status.match('available|resolved|completed')) {
                    // Do Nothing
                } else if (status.match('upcoming')) {    
                    issues = issues + ':large_green_circle: ' + serviceWithComment.text() + '\n';
                } else if (status.match('issue')) {
                    issues = issues + ':large_yellow_circle: ' + serviceWithComment.text() + '\n';
                } else if (status.match('outage')) {
                    if (serviceWithComment.text().indexOf('App Store') == 0) {
                        isAppStoreOutage = true;
                    }
                    issues = issues + ':red_circle: ' + serviceWithComment.text() + '\n';
                } else if (status.match('maintenance')) {
                    issues = issues + ':white_circle: ' + serviceWithComment.text() + '\n';
                } else {
                    issues = issues + ':black_circle: ' + serviceWithComment.text() + '\n';
                }
            } else {
                console.log($(element).find('.light-content.light-name').text())
            }
        })

        let result = '';
        if(issues.length == 0){
            result = ':large_green_circle: All services are operating normally.\n'
        } else {
            result = issues;
        }
        return result;

    } catch(error) {
        core.setFailed(`Scraping failed with error ${error}`);
    }
}

function write(filePath, stream) {
    try {
        fs.writeFileSync(Path.join(__dirname, filePath), stream, { flag: 'w+' });
    } catch(error) {
        core.setFailed(`Creating file failed with error ${error}`);
    }
}