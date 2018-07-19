const readlineSync = require('readline-sync');
const log4js = require('log4js');

const parseFile = require ('./parser.js');

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
    console.log('Command line arguments not supported.');
    process.exit(1);
}

const accounts = new Map();
const transactions = [];
readlineSync.promptLoop(processCommand);

function processCommand(input) {
    if (input == 'Quit') {
        logger.info('Quitting');
        return true;
    } else if (input.startsWith('Import ')) {
        const fileName = input.slice(7);
        logger.debug(`Importing file: ${fileName}`);
        parseFile(fileName, accounts, transactions);
    } else if (input.startsWith('List ')) {
        const accountName = input.slice(5);
        logger.debug(`List command received for account: ${accountName}`);
        if (accountName == 'All') {
            printAllAccounts();
        } else if (accounts.has(accountName)) {
            printAccountInfo(accounts.get(accountName));
        } else {
            logger.debug(`List command received for invalid account: ${accountName}`);
            console.log('The specified account doesn\'t exist');
        }
    } else {
        printHelp(input);
    }
    return false;
}

function printAllAccounts() {
    logger.debug('Listing all accounts.');
    console.log("All accounts:");
    accounts.forEach(account => {
        const balance = (account.balance / 100).toFixed(2);
        console.log(`${account.name} owes ${balance} in total`);
    });
}

function printAccountInfo(account) {
    logger.debug(`Listing transactions for: ${account.name}`);
    console.log(`Transactions involving ${account.name}:`);
    for (let i = 0; i < account.transactions.length; i++) {
        const transaction = account.transactions[i];
        const date = transaction.date.format('DD/MM/YYYY');
        const amount = (transaction.amount / 100).toFixed(2);
        console.log(`[${date}] ${amount} from ${transaction.srcAccount.name} to ${transaction.dstAccount.name} for ${transaction.reason}`);
    }
}

function printHelp(input) {
    logger.debug(`Unrecognised command: ${input}`);
    console.log(`
The available commands are:
Import [File]: Imports the transactions in the specified file
List All: Prints the name of every account and the balance
List [Account]: Prints a list of all transactions associated with the account
Quit: Exits the program.
    `.trim());
}