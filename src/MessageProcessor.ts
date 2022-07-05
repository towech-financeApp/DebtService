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
import Validator from './utils/validator';

export default class MessageProcessor {
  static process = async (message: AmqpMessage): Promise<AmqpMessage> => {
    // Destructures the message
    const { type, payload } = message;

    // Switches the message type to run the appropriate function
    switch (type) {
      case 'add':
        return await MessageProcessor.addDebt(payload);
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
   * @returns An empty response
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
}
