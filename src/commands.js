const log4js = require('log4js');
const logger = log4js.getLogger('commands.js');

const { parseFile, writeFile } = require ('./fileio.js');

function processCommand(input, accounts, transactions) {
    if (input == 'Quit') {
        logger.info('Quitting');
        return true;
    } else if (input.startsWith('Import ')) {
        const fileName = input.slice(7);
        logger.debug(`Importing file: ${fileName}`);
        parseFile(fileName, accounts, transactions);
    } else if (input.startsWith('Export ')) {
        const fileName = input.slice(7);
        logger.debug(`Exporting all transactions to ${fileName}`);
        writeFile(fileName, transactions);
    } else if (input.startsWith('List ')) {
        const accountName = input.slice(5);
        logger.debug(`List command received for account: ${accountName}`);
        if (accountName == 'All') {
            printAllAccounts(accounts);
        } else if (accounts.has(accountName)) {
            printAccountInfo(accounts.get(accountName));
        } else {
            logger.debug(`List command received for invalid account: ${accountName}`);
            console.log('The specified account doesn\'t exist');
        }
    } else {
        printHelp(input);
    }
}

function printAllAccounts(accounts) {
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

module.exports = processCommand;
