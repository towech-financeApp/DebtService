/** messageProcessor.ts
 * Copyright (c) 2022, Toweclabs
 * All rights reserved.
 *
 * Class that handles all the valid types of message the service can receive
 */

// Libraries
import { AmqpMessage } from 'tow96-amqpwrapper';
import logger from 'tow96-logger';

export default class MessageProcessor {
  static process = async (message: AmqpMessage): Promise<AmqpMessage> => {
    // Destructures the message
    const { type, payload } = message;

    // Switches the message type to run the appropriate function
    switch (type) {
      default:
        logger.debug(`Unsupported function type: ${type}`);
        return AmqpMessage.errorMessage(`Unsupported function type: ${type}`);
    }
  };
}