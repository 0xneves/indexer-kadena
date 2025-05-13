'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Remove the indexes
    await queryInterface.removeIndex('Transactions', 'transactions_canonical_idx');
    await queryInterface.removeIndex('Transactions', 'transactions_hash_idx');
    await queryInterface.removeIndex('Transactions', 'transactions_trgm_txid_idx');
    await queryInterface.removeIndex('Transactions', 'transactions_trgm_hash_idx');
    await queryInterface.removeIndex('Transactions', 'transactions_trgm_requestkey_idx');
    await queryInterface.removeIndex('Transactions', 'transactions_trgm_sender_idx');
  },

  async down(queryInterface) {
    await queryInterface.addIndex('Transactions', {
      name: 'transactions_canonical_idx',
      fields: ['canonical'],
    });

    await queryInterface.addIndex('Transactions', {
      name: 'transactions_hash_idx',
      fields: ['hash'],
    });

    await queryInterface.addIndex('Transactions', {
      name: 'transactions_trgm_txid_idx',
      fields: [sequelize.fn('LOWER', sequelize.col('txid'))],
      using: 'gin',
      operator: 'gin_trgm_ops',
    });

    await queryInterface.addIndex('Transactions', {
      name: 'transactions_trgm_hash_idx',
      fields: [sequelize.fn('LOWER', sequelize.col('hash'))],
      using: 'gin',
      operator: 'gin_trgm_ops',
    });

    await queryInterface.addIndex('Transactions', {
      name: 'transactions_trgm_requestkey_idx',
      fields: [sequelize.fn('LOWER', sequelize.col('requestkey'))],
      using: 'gin',
      operator: 'gin_trgm_ops',
    });

    await queryInterface.addIndex('Transactions', {
      name: 'transactions_trgm_sender_idx',
      fields: [sequelize.fn('LOWER', sequelize.col('sender'))],
      using: 'gin',
      operator: 'gin_trgm_ops',
    });
  },
};
