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

Nightmare(configuration)
    .goto(userUrl)
    .wait('body')
    .evaluate(() => document.querySelector('body').innerHTML)
    .end()
    .then( response => {
        let result = getData(response);
        write(userFilePath, result);
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
            } else {
                console.log($(element).find('.light-content.light-name').text())
            }

            // Detect Issues
            if (!status.match('available') && !status.match('resolved')) {
                if (serviceWithComment.length > 0) {
                    issues = issues  + '- ' + serviceWithComment.text() + '\n';
                }
            }
        })

        let result = '';
        if(issues.length == 0){
            result = 'All services are operating normally.\n'
        } else {
            result = 'Some issues detected.\n' + issues;
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