/** messageProcessor.ts
 * Copyright (c) 2022, Toweclabs
 * All rights reserved.
 *
 * Class that handles all the valid types of message the service can receive
 */

// Libraries
import { AmqpMessage } from 'tow96-amqpwrapper';
import logger from 'tow96-logger';
import DbDebts from './databse/dbDebts';

// Models
import { Objects, Requests } from './Models';

// utils
import Validator from './utils/validator';
import RabbitRequest from './utils/rabbitRequest';

export default class MessageProcessor {
  private static otherCategoryId_In = process.env.OTHER_CATEGORYID || '';
  private static otherCategoryId_Out = process.env.OTHER_CATEGORYID_OUT || '';
  private static transactionQueue = process.env.TRANSACTION_QUEUE || 'transactionQueue';

  static process = async (message: AmqpMessage): Promise<AmqpMessage> => {
    // Destructures the message
    const { type, payload } = message;

    // Switches the message type to run the appropriate function
    switch (type) {
      case 'add':
        return await MessageProcessor.addDebt(payload);
      case 'debt-payment':
        return await MessageProcessor.payDebt(payload);
      default:
        logger.debug(`Unsupported function type: ${type}`);
        return AmqpMessage.errorMessage(`Unsupported function type: ${type}`);
    }
  };

  // Message processing functions ---------------------------------------------------------------

  /** addDebt
   * Adds a debt to the database
   * @param {Requests.WorkerCreateDebt} message
   *
   * @returns The newly created debt
   */
  private static addDebt = async (message: Requests.WorkerCreateDebt): Promise<AmqpMessage<Objects.Debt>> => {
    logger.http(`Adding debt for user: ${message.user_id}`);

    try {
      let errors = {};

      // Validates that there is a loaner name
      const loanerValidation = Validator.validateLoaner(message.loaner);
      if (!loanerValidation.valid) errors = { ...errors, ...loanerValidation.errors };

      // validates the amount
      const amountValidation = Validator.validateAmount(message.amount.toString());
      if (!amountValidation.valid) errors = { ...errors, ...amountValidation.errors };

      // Validates the conecept
      const conceptValid = Validator.validateConcept(message.concept);
      if (!conceptValid.valid) errors = { ...errors, ...amountValidation.errors };

      // Validates the date
      const dateValid = Validator.validateDate(message.date.toString());
      if (!dateValid.valid) errors = { ...errors, ...amountValidation.errors };

      // Sends an error response if there is any error
      if (Object.keys(errors).length > 0) return AmqpMessage.errorMessage('Invalid Fields', 422, errors);

      // Adds the debt
      const newDebt = await DbDebts.add({
        amount: amountValidation.rounded,
        concept: conceptValid.trimmed,
        date: message.date,
        loaner: loanerValidation.trimmed,
        user_id: message.user_id,
      } as Objects.Debt);

      return new AmqpMessage(newDebt, 'add', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** payDebt
   * Adss a payment to the requested debt
   *
   * @param {Requests.WorkerPayDebt} message
   *
   * @returns The modified debt
   */
  private static payDebt = async (message: Requests.WorkerPayDebt): Promise<AmqpMessage<Objects.Debt>> => {
    logger.http(`Making payment for debt: ${message.debt_id}`);

    try {
      let errors = {};

      // Validates that the user is the owner of the debt
      const validDebt = await Validator.validateDebtOwnership(message.user_id, message.debt_id);
      if (!validDebt.valid) return AmqpMessage.errorMessage('Authentication Error', 403, validDebt.errors);

      // validates the amount
      const amountValidation = Validator.validateAmount(message.amount.toString());
      if (!amountValidation.valid) errors = { ...errors, ...amountValidation.errors };

      // Gets the total amount that has already been paid
      const totalPaid = validDebt.debt.payments.reduce((a, b) => {
        return a + b.amount;
      }, 0);

      // If the amount being paid is bigger than the missing amount, it creates a transaction only for what's missing
      // TODO: Store remainder as bonus
      let newCredited = amountValidation.rounded;
      // let bonus = 0;
      if (totalPaid + amountValidation.rounded > validDebt.debt.amount) {
        newCredited = validDebt.debt.amount - totalPaid;
        // bonus = amountValidation.rounded - newCredited;
      }

      // Creates the conecept
      const concept = `${validDebt.debt.concept} p${validDebt.debt.payments.length + 1}: ${(
        (newCredited + totalPaid) /
        100
      ).toFixed(2)}/${(validDebt.debt.amount / 100).toFixed(2)}`;

      logger.debug(concept);

      // Sends an error response if there is any error
      if (Object.keys(errors).length > 0) return AmqpMessage.errorMessage('Invalid Fields', 422, errors);

      // TODO: Send transaction
      const transaction = await RabbitRequest.sendWithResponse(MessageProcessor.transactionQueue, 'testerino', {});
      logger.debug(JSON.stringify(transaction))

      // TODO: Add to debt

      return new AmqpMessage(validDebt.debt as Objects.Debt, 'add', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };
}
