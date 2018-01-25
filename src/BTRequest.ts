import { SocketType } from 'dgram';
import { BuildableType, BuilderType, Nullable, Try } from 'javascriptutilities';

import {
  RequestBuilderType,
  RequestType,
  MiddlewareFilter,
} from 'jsrequestframework';

import * as BTOperation from './BTOperation';

export let builder = (): Builder => new Builder();

/**
 * Represents a BitTorrent request.
 * @extends {RequestType} Request extension.
 */
export interface Type extends RequestType {
  operation(): Try<BTOperation.Case>;
  socketType(): SocketType;
}

/**
 * Represents a BitTorrent request.
 * @implements {BuildableType<Builder>} Buildable implementation.
 * @implements {Type} Type implementation.
 */
export class Self implements BuildableType<Builder>, Type {
  inclFilters: MiddlewareFilter[];
  exclFilters: MiddlewareFilter[];
  rqDescription: string;
  retryCount: number;
  btOperation: Nullable<BTOperation.Case>;
  btSocketType: SocketType;

  public constructor() {
    this.inclFilters = [];
    this.exclFilters = [];
    this.rqDescription = '';
    this.retryCount = 1;
    this.btSocketType = 'udp4';
  }

  public builder = (): Builder => builder();
  public cloneBuilder = (): Builder => this.builder().withBuildable(this);
  public inclusiveFilters = (): MiddlewareFilter[] => this.inclFilters;
  public exclusiveFilters = (): MiddlewareFilter[] => this.exclFilters;
  public requestDescription = (): string => this.rqDescription;
  public requestRetries = (): number => this.retryCount;

  public operation = (): Try<BTOperation.Case> => {
    return Try.unwrap(this.btOperation, `Missing operation for ${this}`);
  }

  public socketType = (): SocketType => this.btSocketType;
}

/**
 * Represents a BitTorrent request builder.
 * @implements {BuilderType<Self>} Builder implementation.
 * @implements {RequestBuilderType} Request builder implementation.
 */
export class Builder implements BuilderType<Self>, RequestBuilderType {
  private request: Self;

  public constructor() {
    this.request = new Self();
  }

  public withInclusiveFilters = (filters: MiddlewareFilter[]): this => {
    this.request.inclFilters = filters;
    return this;
  }

  public withExclusiveFilters = (filters: MiddlewareFilter[]): this => {
    this.request.exclFilters = filters;
    return this;
  }

  public withRequestDescription = (description: string): this => {
    this.request.rqDescription = description;
    return this;
  }

  public withRequestRetries = (retries: number): this => {
    this.request.retryCount = retries;
    return this;
  }

  /**
   * Set the request operation.
   * @param {Nullable<BTOperation.Case>} operation A BTOperation instance.
   * @returns {this} The current Builder instance.
   */
  public withOperation = (operation: Nullable<BTOperation.Case>): this => {
    this.request.btOperation = operation;
    return this;
  }

  /**
   * Set the request socket type.
   * @param {SocketType} type A SocketType instance.
   * @returns {this} The current Builder instance.
   */
  public withSocketType = (type: SocketType): this => {
    this.request.btSocketType = type;
    return this;
  }

  public withBuildable = (buildable: Nullable<Self>): this => {
    if (buildable !== undefined && buildable !== null) {
      return this
        .withInclusiveFilters(buildable.inclFilters)
        .withExclusiveFilters(buildable.exclFilters)
        .withRequestDescription(buildable.rqDescription)
        .withRequestRetries(buildable.retryCount)
        .withOperation(buildable.btOperation)
        .withSocketType(buildable.btSocketType);
    } else {
      return this;
    }
  }

  public build = (): Self => this.request;
}