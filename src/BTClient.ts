import { Observable } from 'rxjs';
import { BuildableType, BuilderType, Nullable, Try } from 'javascriptutilities';

import {
  RequestGenerator as Generator,
  RequestHandlerType,
  RequestProcessor,
  ResultProcessor as Processor,
} from 'jsrequestframework';

import * as Operation from './BTOperation';
import * as Req from './BTRequest';

export type Res = any;
export type RQProcessor = RequestProcessor.Type<Req.Type>;
export let builder = (): Builder => new Builder();

/**
 * Represents a BitTorrent client.
 * @extends {RequestHandlerType<Req.Type,any>} Request handler extension.
 */
export interface Type extends RequestHandlerType<Req.Type,Res> {}

/**
 * Represents a BitTorrent client.
 * @implements {BuildableType} Buildable implementation.
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

  public request<Prev,Res2>(
    previous: Try<Prev>,
    generator: Generator<Prev,Req.Type>,
    processor: Processor<Res,Res2>,
  ): Observable<Try<Res2>> {
    try {
      let rqProcessor = this.requestProcessor();
      return rqProcessor.process(previous, generator, this.perform, processor);
    } catch (e) {
      return Observable.of(Try.failure(e));
    }
  }

  /**
   * Perform the BitTorrent request.
   * @param {Req.Type} request A Req instance.
   * @returns {Observable<Try<Res>>} An Observable instance.
   */
  private perform = (request: Req.Type): Observable<Try<Res>> => {
    try {
      let operation = request.operation().getOrThrow();

      switch (operation) {
        case Operation.Case.ANNOUNCE: return this.performAnnounce(request);
        case Operation.Case.CONNECT: return this.performConnect(request);
        default: throw Error(`Unsupported operation: ${operation}`);
      }
    } catch (e) {
      return Observable.of(Try.failure(e));
    }
  }

  private performAnnounce = (request: Req.Type): Observable<Try<Res>> => {
    console.log(request);
    throw Error('');
  }

  private performConnect = (request: Req.Type): Observable<Try<Res>> => {
    console.log(request);
    throw Error('');
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