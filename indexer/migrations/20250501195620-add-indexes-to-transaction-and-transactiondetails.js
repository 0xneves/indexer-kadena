'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('TransactionDetails', {
      fields: ['transactionId'],
      name: 'transactiondetails_transactionid_idx',
    });

    await queryInterface.addIndex('Transactions', {
      fields: ['creationtime'],
      name: 'transactions_creationtime_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('TransactionDetails', 'transactiondetails_transactionid_idx');
    await queryInterface.removeIndex('Transactions', 'transactions_creationtime_idx');
  },
};
