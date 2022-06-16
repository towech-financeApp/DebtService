/** index.ts
 * Copyright (c) 2022, Towechlabs
 * All rights reserved
 *
 * Main file for the worker of the debt service
 */

// Imports the environment variables
import dotenv from 'dotenv';
dotenv.config();

// Libraries
import logger from 'tow96-logger';
import mongoose from 'mongoose';
import Queue from 'tow96-amqpwrapper';

import MessageProcessor from './MessageProcessor';

// Declares the class
class DebtService {
  // Gets some values from the env, if not present uses default values
  private static queueName = process.env.QUEUE_NAME || 'debtQueue';
  private static databaseUrl = process.env.DATABASE_URL || '';
  
  // Connect to database function
  static connectToMongo = (): void => {
    mongoose
      .connect(DebtService.databaseUrl)
      .then(() => logger.info('Connected to database'))
      .catch((err) => {
        if (DebtService.databaseUrl !== '') {
          logger.error(`${err}`);
          logger.info('Process exited with code 1');
        } else {
          logger.error('No Mongo url provided, exiting with error 1');
        }
        process.exit(1);
      });
  };

  // Worker Main function
  static runWorker = async (): Promise<void> => {
    DebtService.connectToMongo();

    // Connects to rabbitMQ and sets a channel up
    const connection = await Queue.startConnection();
    const channel = await Queue.setUpChannelAndExchange(connection);

    // Asserts and binds the queue that all workers of this type will user
    const userQ = await channel.assertQueue(DebtService.queueName, { durable: false });
    channel.bindQueue(userQ.queue, Queue.exchangeName, DebtService.queueName);

    // Begins to listen for messages on the queue
    logger.info(`Listening for messages on queue ${DebtService.queueName}`);

    // Using the channel cosume, the program enters a loop that will check continously
    channel.consume(
      DebtService.queueName,
      async (msg) => {
        if (!msg) return; // If there is no message, finishes and checks again, this allows for faster iterations

        // Handles the message
        try {
          // Processes the message
          const content = await MessageProcessor.process(JSON.parse(msg.content.toString()));

          // reply if necessary
          if (msg.properties.replyTo)
            Queue.respondToQueue(channel, msg.properties.replyTo, msg.properties.correlationId, content);

          // Acknowledges the message
          channel.ack(msg);
        } catch (err: any) {
          logger.error(err);
        }
      },
      { noAck: false },
    );
  };
}

// Starts the service
DebtService.runWorker().catch((err) => {
  logger.error(err);
});
