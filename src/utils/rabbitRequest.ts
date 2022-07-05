/** RabbitRequest.ts
 * Copyright (c) 2022, Towechlabs
 * All rights reserved.
 * 
 * Utility that quickly connects, sends a message to the queries and receives a response
 */
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

export default class RabbitRequest {
  static sendWithResponse = async (destQ: string, type: string, payload: any) :Promise<AmqpMessage<any>> => {
    // Starts channel
    const connection = await Queue.startConnection();
    const channel = await Queue.setUpChannelAndExchange(connection);

    // Sends request
    const corrId = await Queue.publishWithReply(channel, destQ, {
      status: 200,
      type,
      payload,
    })

    // Waits for response
    const response: AmqpMessage<any> = await Queue.fetchFromQueue(channel, corrId, corrId);

    //channel.close();

    return response;
  }
}
