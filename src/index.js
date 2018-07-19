const readlineSync = require('readline-sync');
const log4js = require('log4js');

const processCommand = require('./commands.js');

log4js.configure({
    appenders: {
        file: {
            type: 'fileSync',
            filename: 'logs/debug.log'
        }
    },
    categories: {
        default: {
            appenders: ['file'],
            level: 'debug'
        }
    }
});
const logger = log4js.getLogger('index.js');
logger.info('Logging Initialised');

if (process.argv.length > 2) {
    console.log('Command line arguments are not supported.');
}

const accounts = new Map();
const transactions = [];
readlineSync.promptLoop((input) => processCommand(input, accounts, transactions));
