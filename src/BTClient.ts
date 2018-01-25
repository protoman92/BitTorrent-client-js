import { Socket, SocketType } from 'dgram';
import { Observable } from 'rxjs';
import { BuildableType, BuilderType, Nullable, Try } from 'javascriptutilities';
import { RequestProcessor } from 'jsrequestframework';
import * as Req from './BTRequest';

export type Res = any;
export type RQProcessor = RequestProcessor.Type<Req.Type>;

export let builder = (): Builder => new Builder();

/**
 * Represents the result of a socket.send request.
 */
export interface SocketResultType {
  socket: Socket;
  sent: number;
}

/**
 * Represents a BitTorrent client.
 */
export interface Type {}

/**
 * Represents a BitTorrent client.
 * @implements {BuildableType<Builder>} Buildable implementation.
 * @implements {Type} Type implementation.
 */
export class Self implements BuildableType<Builder>, Type {
  public processor: Nullable<RQProcessor>;
  public constructor() {}
  public builder = (): Builder => builder();
  public cloneBuilder = (): Builder => this.builder().withBuildable(this);

  public requestProcessor = (): RQProcessor => {
    return Try.unwrap(this.processor, 'Missing request processor').getOrThrow();
  }
}

/**
 * Represents a BitTorrent client builder.
 * @implements {BuilderType<Self>} Builder implementation.
 */
export class Builder implements BuilderType<Self> {
  private client: Self;

  public constructor() {
    this.client = new Self();
  }

  /**
   * Set the request processor.
   * @param {Nullable<RQProcessor>} processor A RQProcessor instance.
   * @returns {this} The current Builder instance.
   */
  public withRequestProcessor = (processor: Nullable<RQProcessor>): this => {
    this.client.processor = processor;
    return this;
  }

  public withBuildable = (buildable: Nullable<Self>): this => {
    if (buildable !== undefined && buildable != null) {
      return this.withRequestProcessor(buildable.processor);
    } else {
      return this;
    }
  }
  
  public build = (): Self => this.client;
}