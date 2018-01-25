import * as crypto from 'crypto';
import { AddressInfo, Socket } from 'dgram';
import * as urlModule from 'url';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { BuildableType, BuilderType, Nullable, Try } from 'javascriptutilities';

/**
 * Represents a message event.
 */
export interface MessageEventType {
  message: Buffer;
  address: AddressInfo;
}

/**
 * Represents part of the necessary parameters for a connect/announce operation.
 */
export interface UrlParamsType {
  socket: Socket;
  url: string;
}

/**
 * Represents the necessary parameters for a message-sending operation.
 * @extends {UrlParamsType} Url params extension.
 */
export interface MessageParamsType extends UrlParamsType {
  message: Buffer | string;
}

/**
 * Represents the response for a 'connect' request.
 */
export interface ConnectionResponseType {
  action: number;
  transactionId: number;
  connectionId: Buffer;
}

/**
 * Represents a transaction id randomizer.
 */
export interface TransactionIdRandomizer {
  randomBytes: (size: number) => Buffer;
}

/**
 * Send a message using a specified socket.
 * @param {Try<SocketMessageParams>} params A SocketMessageParams instance.
 * @returns {Observable<Try<number>>} An Observable instance.
 */
export let sendMessage = (params: Try<MessageParamsType>): Observable<Try<number>> => {
  try {
    let skParams = params.getOrThrow();
    let socket = skParams.socket;
    let url = urlModule.parse(skParams.url);
    let msg = skParams.message;

    let port = Try.unwrap(url.port, `Missing port for ${url}`)
      .map(v => Number.parseInt(v))
      .filter(v => !isNaN(v), `Invalid port for ${url}`)
      .getOrThrow();

    let host = Try.unwrap(url.host, `Missing host for ${url}`).getOrThrow();

    return Observable
      .bindNodeCallback((
        msg: string | any[] | Buffer,
        offset: number,
        length: number,
        port: number,
        address: string,
        callback: (error: Error | null, bytes: number) => void
      ) => {
        return socket.send(msg, offset, length, port, address, callback);
      })(msg, 0, msg.length, port, host)
      .map(v => Try.success(v))
      .catchJustReturn(e => Try.failure(e));
  } catch (e) {
    return Observable.of(Try.failure(e));
  }
};

/**
 * Create a message for the initial 'connect' request.
 * @param {TransactionIdRandomizer} randomizer Transaction id randomizer.
 * @returns {Try<Buffer>} A Try Buffer instance.
 */
export let createConnectMessage = (randomizer: TransactionIdRandomizer): Try<Buffer> => {
  try {
    let transactionId = randomizer.randomBytes(4);
    let message = Buffer.alloc(16);

    /// Write the connection id.
    message.writeUInt32BE(0x417, 0);
    message.writeUInt32BE(0x27101980, 4);

    /// Write the action.
    message.writeUInt32BE(0, 8);

    /// Copy the transaction id.
    transactionId.copy(message, 12);

    return Try.success(message);
  } catch (e) {
    return Try.failure(e);
  }
};

/**
 * Parse the response of a 'connect' request.
 * @param {Buffer} response A Buffer instance.
 * @returns {Try<ConnectionResponseType>} A Try ConnectionResponseType instance.
 */
export let parseConnectionResponse = (response: Buffer): Try<ConnectionResponseType> => {
  let transactionId = Try.unwrap(response.readUInt32BE(4), 'Invalid transaction id');

  let connectionId = Try.success(response.slice(8))
    .filter(v => v.length > 0, 'Invalid connection id');
  
  return Try.unwrap(response.readUInt32BE(0), 'Invalid action')
    .zipWith(transactionId, (v1, v2): [number, number] => [v1, v2])
    .zipWith(connectionId, (v1, v2) => ({
      action: v1[0],
      transactionId: v1[1],
      connectionId: v2,
    }));
};

export let builder = (): Builder => new Builder();

/**
 * Represents a BitTorrent messaging handler.
 */
export interface Type {
  /**
   * Start sending messages. Force get the result to get errors if present.
   * @returns {Try<void>} A Try instance.
   */
  startSendingMessages(): Try<void>;
}

/**
 * Represents a BitTorrent messaging handler.
 * @implements {BuildableType<Builder>} Builable implementation.
 * @implements {Type} Type implementation.
 */
export class Self implements BuildableType<Builder>, Type {
  public btSocket: Nullable<Socket>;
  public btAnnounceUrl: Nullable<string>;
  private btMessage: BehaviorSubject<Nullable<MessageEventType>>;
  private subscription: Subscription;

  public constructor() {
    this.btMessage = new BehaviorSubject(undefined);
    this.subscription = new Subscription();
  }

  public builder = (): Builder => builder();
  public cloneBuilder = (): Builder => this.builder().withBuildable(this);
  public socket = (): Try<Socket> => Try.unwrap(this.btSocket, 'Missing socket');

  public announceURL = (): Try<string> => {
    return Try.unwrap(this.btAnnounceUrl, 'Missing announce URL');
  }

  public messageStream = (): Observable<MessageEventType> => {
    return this.btMessage.asObservable().mapNonNilOrEmpty(v => v);
  }

  public startSendingMessages = (): Try<void> => {
    try {      
      let btMessage = this.btMessage;
      let subscription = this.subscription;
      let socket = this.socket().getOrThrow();
      let url = this.announceURL().getOrThrow();
      let urlParams = { socket, url };

      let messageStream = new Observable<MessageEventType>(v => {
        socket.on('message', (v1, v2) => v.next({message: v1, address: v2}));
        return () => socket.close();
      });

      /// This stream shall receive connect/announce responses.
      messageStream.subscribe(btMessage).toBeDisposedBy(subscription);

      /// Send connect message and wait for the connection id.
      this.sendConnectMessage(urlParams).subscribe().toBeDisposedBy(subscription);

      /// After we receive a connection response, send the announce message.
      this.sendAnnounceMessage(urlParams).subscribe().toBeDisposedBy(subscription);

      return Try.success(undefined);
    } catch (e) {
      return Try.failure(e);
    }
  }

  /**
   * Send the initial connect message.
   * @param {UrlParamsType} params A UrlParamsType instance.
   * @returns {Observable<Try<number>>} An Observable instance.
   */
  private sendConnectMessage = (params: UrlParamsType): Observable<Try<number>> => {
    let message = createConnectMessage(crypto);
    let mParams = message.map(v => Object.assign({}, params, { message: v }));
    return sendMessage(mParams);
  }

  private sendAnnounceMessage = (_params: UrlParamsType): Observable<Try<void>> => {
    return Observable.empty();
  }
}

/**
 * Represents a BitTorrent messaging handler Builder.
 * @implements {BuilderType<Self>} Builder implementation.
 */
export class Builder implements BuilderType<Self> {
  private handler: Self;

  public constructor() {
    this.handler = new Self();
  }

  /**
   * Set the socket instance.
   * @param {Nullable<Socket>} socket A Socket instance.
   * @returns {this} The current Builder instance.
   */
  public withSocket = (socket: Nullable<Socket>): this => {
    this.handler.btSocket = socket;
    return this;
  }

  /**
   * Set the announce URL.
   * @param {Nullable<string>} url A string value.
   * @returns {this} The current Builder instance.
   */
  public withAnnounceUrl(url: Nullable<string>): this {
    this.handler.btAnnounceUrl = url;
    return this;
  }

  public withBuildable = (buildable: Nullable<Self>): this => {
    if (buildable !== undefined && buildable !== null) {
      return this.withSocket(buildable.btSocket);
    } else {
      return this;
    }
  }

  public build = (): Self => this.handler;
}